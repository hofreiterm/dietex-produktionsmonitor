const $ = id => document.getElementById(id);
let photos = [], busy = false, ready = false, adding = false, controller;

const presetKey='dietex-care-stains-v1';
const defaultStains=['Blutfleck','Kaffeefleck','Teefleck','Rotweinfleck','Obstfleck','Fettfleck','Ölfleck','Make-up','Schweißfleck','Speisereste','Klebstoff','Kaugummi','Lack','Rostfleck','Kugelschreiber','Tinte','Geruch'];
let savedStains=[];
try{const value=JSON.parse(localStorage.getItem(presetKey)||'[]');if(Array.isArray(value))savedStains=value.filter(x=>typeof x==='string'&&x.trim()&&x.length<=100).slice(0,30);}catch{}
function renderStains(){ $('stainPresets').replaceChildren();for(const value of [...new Set([...defaultStains,...savedStains])]){const option=document.createElement('option');option.value=value;$('stainPresets').append(option);} }
function saveStain(){const value=$('stain').value.trim();if(!value||defaultStains.some(s=>s.toLocaleLowerCase('de')===value.toLocaleLowerCase('de')))return;savedStains=[value,...savedStains.filter(s=>s.toLocaleLowerCase('de')!==value.toLocaleLowerCase('de'))].slice(0,30);try{localStorage.setItem(presetKey,JSON.stringify(savedStains));}catch{}renderStains();}
function stainCategory(value){const s=value.toLocaleLowerCase('de');if(/blut|eiweiß|speise|schweiß|milch/.test(s))return 'protein';if(/kaffee|tee|wein|obst/.test(s))return 'tannin';if(/fett|öl|kosmetik|make-up/.test(s))return 'oil';if(/kleber|klebstoff|kaugummi|lack/.test(s))return 'adhesive';if(/rost|metall/.test(s))return 'rust';if(/tinte|kugelschreiber|farbübertragung/.test(s))return 'ink';if(/geruch/.test(s))return 'odor';return 'unknown';}
renderStains();

function render() {
  $('photos').replaceChildren();
  photos.forEach((p,i) => {
    const box = document.createElement('div'); box.className = 'photobox';
    const img = document.createElement('img'); img.src = p.url; img.alt = `Ausgewähltes Foto ${i+1}`;
    const remove = document.createElement('button'); remove.textContent = '×'; remove.ariaLabel = `Foto ${i+1} entfernen`; remove.disabled = busy;
    remove.onclick = () => { URL.revokeObjectURL(p.url); photos.splice(i,1); render(); };
    box.append(img,remove); $('photos').append(box);
  });
  $('analyze').disabled = busy || adding || !ready || !photos.length;
  $('cameraBtn').disabled = $('galleryBtn').disabled = busy || adding || photos.length === 3;
  $('notes').disabled = busy;
  $('stain').disabled=busy;
}
async function checkStatus() {
  ready = false; $('serviceStatus').textContent = 'KI-Verbindung wird geprüft …'; render();
  try {
    const response = await fetch('/api/pflegehilfe',{cache:'no-store',signal:AbortSignal.timeout(10000)});
    const data = await response.json(); ready = response.ok && data.ready === true;
    $('serviceStatus').textContent = ready ? 'KI-Auswertung bereit. Fotos auswählen und analysieren.' : data.message || 'Die KI-Auswertung wird noch eingerichtet.';
  } catch { $('serviceStatus').textContent = 'KI-Verbindung nicht erreichbar. Bitte erneut versuchen.'; }
  $('retryStatus').hidden = ready; render();
}
async function prepare(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve,reject) => { const image = new Image(); image.onload=()=>resolve(image); image.onerror=()=>reject(new Error('Bildformat nicht lesbar. Bitte JPG, PNG oder WEBP verwenden.')); image.src=url; });
    const ratio = Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio)); canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
    const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Bild konnte nicht vorbereitet werden.');
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let data=canvas.toDataURL('image/jpeg',.85); if(data.length>1250000)data=canvas.toDataURL('image/jpeg',.65);
    if(data.length>1250000)throw new Error('Bitte nur das Etikett näher aufnehmen. Dieses Foto ist zu groß.');
    const preview=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));
    if(!preview)throw new Error('Foto konnte nicht vorbereitet werden.');
    return {data,url:URL.createObjectURL(preview)};
  } finally { URL.revokeObjectURL(url); }
}
async function add(files) {
  if(busy||adding)return; adding=true; $('error').textContent=''; render();
  try { for(const f of files) {
    if(photos.length>=3){$('error').textContent='Maximal 3 Fotos. Entferne zuerst ein Foto.';break;}
    if(!f.type.startsWith('image/')||f.size>10*1024*1024){$('error').textContent='Bitte ein Bild mit maximal 10 MB auswählen.';continue;}
    try{photos.push(await prepare(f));}catch(e){$('error').textContent=e.message;}
  }} finally { adding=false; render(); }
}
$('cameraBtn').onclick=()=>$('cameraInput').click(); $('galleryBtn').onclick=()=>$('galleryInput').click();
for(const id of ['cameraInput','galleryInput'])$(id).onchange=async e=>{await add(e.target.files);e.target.value='';};
$('dropzone').ondragover=e=>{e.preventDefault();if(!busy)$('dropzone').classList.add('drag');};
$('dropzone').ondragleave=()=>$('dropzone').classList.remove('drag');
$('dropzone').ondrop=e=>{e.preventDefault();$('dropzone').classList.remove('drag');add(e.dataTransfer.files);};
function element(tag,text){const node=document.createElement(tag);node.textContent=text;return node;}
function showResult(a){
  $('resultTitle').textContent=a.title||'Pflegeetikett geprüft';
  $('resultStatus').textContent=a.material||'Angaben am Textil prüfen';
  $('shortSteps').replaceChildren();for(const step of a.professional.short_steps)$('shortSteps').append(element('li',step.replace(/^\s*\d+[.)]\s*/,'')));
  $('resultDetails').open=false;
  $('resultMark').textContent=a.needs_review?'?':'i';
  $('materialTitle').textContent=a.material||'Material nicht sicher lesbar'; $('detectedText').textContent=a.detected_text||'Kein Text sicher erkannt.';
  $('warnings').replaceChildren();for(const text of a.warnings)$('warnings').append(element('p',text));
  $('warnings').append(element('p','KI kann Pflegezeichen falsch lesen. Alle Angaben vor der Reinigung am Originaletikett prüfen.'));
  $('carelist').replaceChildren();for(const step of a.steps){
    const article=document.createElement('article');article.className=`care-${step.status}`;
    const icon=element('span',step.status==='allowed'?'✓':step.status==='forbidden'?'×':'?');icon.className='careicon';icon.ariaHidden='true';
    const div=document.createElement('div');div.append(element('h3',step.category),element('p',step.instruction));
    const evidence=element('p','Etikett: '+(step.evidence||'nicht eindeutig lesbar'));evidence.className='evidence';div.append(evidence);article.append(icon,div);$('carelist').append(article);
  }
  renderProfessional(a.professional);
  $('uploadPanel').hidden=true;$('resultPanel').hidden=false;$('resultPanel').focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});
}
$('analyze').onclick=async()=>{
  if(busy||!ready||!photos.length)return;
  saveStain();busy=true;render();$('error').textContent='';$('analyze').textContent='Fotos werden ausgewertet …';$('cancel').hidden=false;controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort('timeout'),105000);
  try{
    const response=await fetch('/api/pflegehilfe',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({images:photos.map(p=>p.data),note:[$('stain').value.trim()?'Fleckangabe: '+$('stain').value.trim():'',$('notes').value.trim()].filter(Boolean).join('\n'),context:{stain:stainCategory($('stain').value)}})});
    let data;try{data=await response.json();}catch{throw new Error('Serverantwort nicht lesbar. Bitte weniger Fotos versuchen.');}
    if(!response.ok)throw new Error(data.error||'Die Analyse konnte nicht abgeschlossen werden.');
    if(!data.analysis||!Array.isArray(data.analysis.steps)||!Array.isArray(data.analysis.warnings))throw new Error('Unvollständige Antwort. Bitte erneut versuchen.');
    showResult(data.analysis);
  }catch(e){$('error').textContent=controller.signal.aborted?(controller.signal.reason==='timeout'?'Zeitüberschreitung. Bitte mit einem Etikettfoto erneut versuchen.':'Analyse abgebrochen. Bereits gestartete Verarbeitung kann noch Kosten verursachen.'):(e.message||'Analyse fehlgeschlagen. Bitte Verbindung prüfen.');}
  finally{clearTimeout(timeout);busy=false;$('cancel').hidden=true;$('analyze').textContent='Fotos analysieren →';render();}
};
$('cancel').onclick=()=>controller?.abort('user');$('retryStatus').onclick=checkStatus;
$('reset').onclick=()=>{photos.forEach(p=>URL.revokeObjectURL(p.url));photos=[];$('notes').value='';$('stain').value='';$('error').textContent='';$('resultPanel').hidden=true;$('uploadPanel').hidden=false;render();$('cameraBtn').focus();};
$('print').onclick=()=>window.print();checkStatus();

function renderProfessional(pro){
  const panel=$('professional');panel.replaceChildren();if(!pro)return;
  const head=element('div','FACHLICHER BEARBEITUNGSENTWURF');head.className='eyebrow';panel.append(head,element('h2','Bearbeitung im Betrieb'));
  const note=element('p',pro.review_note);note.className='notice';panel.append(note);
  if(pro.manufacturer_deviation){const warning=element('p','Alternative außerhalb der Herstellerkennzeichnung: fachliche Einzelprüfung erforderlich.');warning.className='deviation';panel.append(warning);}
  for(const [title,key]of [['Textil und Konstruktion','textile_assessment'],['Fleckeneinschätzung','stain_assessment'],['Verfahrensvorschlag','process_recommendation'],['Nassreinigung gesondert beurteilt','wet_cleaning_assessment']]){const block=document.createElement('section');block.className='prosection';block.append(element('h3',title),element('p',pro[key]));panel.append(block);}
  function addList(title,items,ordered=false){if(!items?.length)return;const section=document.createElement('section');section.className='prosection';section.append(element('h3',title));const list=document.createElement(ordered?'ol':'ul');for(const item of items)list.append(element('li',item));section.append(list);panel.append(section);}
  addList('Vorproben und Prüfung',pro.inspection_steps,true);
  addList('Bearbeitungsfolge',pro.workflow,true);
  if(pro.products.length){panel.append(element('h3','Passende Produkte aus eurem Bestand'));
    for(const p of pro.products){const card=document.createElement('article');card.className='productcard';card.append(element('h3',p.reference.name),element('small',p.phase+(p.specialist_review?' · nur mit Verfahrensfreigabe':'')),element('p',p.reason),element('p',p.application));
      const details=document.createElement('details');details.append(element('summary','Produktgrundlage und Einschränkungen'),element('p',p.reference.purpose));
      for(const item of p.reference.constraints)details.append(element('p',item));
      details.append(element('p',p.reference.sds_date ? `Sicherheitsdatenblatt: Revision ${p.reference.sds_date}, Version ${p.reference.sds_version}. ${p.reference.hazard_codes.length?'Gefahrenhinweise: '+p.reference.hazard_codes.join(', ')+'. ':''}Schutzmaßnahmen laut SDB und Betriebsanweisung beachten.` : 'Sicherheitsdatenblatt noch nicht hinterlegt. Gefahreneinstufung und Schutzmaßnahmen anhand des aktuellen SDB und der Betriebsanweisung klären.'));
      const source=element('a','Herstellerinformationen ↗');source.href=p.reference.source_url;source.target='_blank';source.rel='noopener noreferrer';details.append(source);card.append(details);panel.append(card);
    }
  }
  if(pro.tunnel_finisher){const block=document.createElement('section');block.className='prosection';const status={check_required:'Vor Einsatz prüfen',not_recommended:'Für diesen Artikel nicht empfohlen',not_applicable:'Aktuell nicht anwenden'}[pro.tunnel_finisher.status];block.append(element('h3','Tunnelfinisher · '+pro.tunnel_finisher.equipment.name),element('p',status+': '+pro.tunnel_finisher.reason),element('p','Artikelbezogene Programmfreigabe und vollständige Einstellungen sind noch nicht bestätigt. Keine automatische Maschinenfreigabe.'));for(const program of pro.tunnel_finisher.equipment.observed_programs||[]){block.append(element('p',`${program.name}${program.usual_article_group?" · üblicher Einsatz: "+program.usual_article_group:""} · Am Display dokumentiert: Dampfzeit ${program.steam_time_seconds} s · Einwirkzeit ${program.dwell_time_seconds} s · Luftzeit ${program.air_time_seconds} s. Temperaturzuordnung und Eignung für diesen Artikel sind noch zu bestätigen.`));}const source=element('a','Herstellerinformationen ↗');source.href=pro.tunnel_finisher.equipment.source_url;source.target='_blank';source.rel='noopener noreferrer';block.append(source);panel.append(block);}
  addList('Trocknung, Finish und Nachkontrolle',pro.finishing,true);
  addList('Abbruch- und Rückfragekriterien',pro.stop_conditions);
  addList('Vor Bearbeitung noch klären',pro.questions);
  const open=document.createElement('details');open.append(element('summary','Noch nicht hinterlegte Betriebsparameter'));const list=document.createElement('ul');for(const item of pro.open_parameters)list.append(element('li',item));open.append(list);panel.append(open);
}
