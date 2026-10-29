const $ = id => document.getElementById(id);
let photos = [], busy = false, ready = false, adding = false, controller;
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
  $('teamCode').disabled = $('notes').disabled = busy;
}
async function checkStatus() {
  ready = false; $('serviceStatus').textContent = 'KI-Verbindung wird geprüft …'; render();
  try {
    const response = await fetch('/api/pflegehilfe',{cache:'no-store',signal:AbortSignal.timeout(10000)});
    const data = await response.json(); ready = response.ok && data.ready === true;
    $('serviceStatus').textContent = ready ? 'KI-Auswertung bereit. Team-Code eingeben und Fotos auswählen.' : data.message || 'Die KI-Auswertung wird noch eingerichtet.';
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
  $('resultStatus').textContent=a.needs_review?'Rückfrage nötig – vor der Reinigung klären':'Angaben am Originaletikett prüfen';
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
  $('uploadPanel').hidden=true;$('resultPanel').hidden=false;$('resultPanel').focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});
}
$('analyze').onclick=async()=>{
  if(busy||!ready||!photos.length)return;
  if(!$('teamCode').value){$('error').textContent='Bitte den Team-Code von der Produktionsleitung eingeben.';$('teamCode').focus();return;}
  busy=true;render();$('error').textContent='';$('analyze').textContent='Fotos werden ausgewertet …';$('cancel').hidden=false;controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort('timeout'),55000);
  try{
    const response=await fetch('/api/pflegehilfe',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','x-pflegehilfe-code':$('teamCode').value},body:JSON.stringify({images:photos.map(p=>p.data),note:$('notes').value})});
    let data;try{data=await response.json();}catch{throw new Error('Serverantwort nicht lesbar. Bitte weniger Fotos versuchen.');}
    if(!response.ok)throw new Error(data.error||'Die Analyse konnte nicht abgeschlossen werden.');
    if(!data.analysis||!Array.isArray(data.analysis.steps)||!Array.isArray(data.analysis.warnings))throw new Error('Unvollständige Antwort. Bitte erneut versuchen.');
    showResult(data.analysis);
  }catch(e){$('error').textContent=controller.signal.aborted?(controller.signal.reason==='timeout'?'Zeitüberschreitung. Bitte mit einem Etikettfoto erneut versuchen.':'Analyse abgebrochen. Bereits gestartete Verarbeitung kann noch Kosten verursachen.'):(e.message||'Analyse fehlgeschlagen. Bitte Verbindung prüfen.');}
  finally{clearTimeout(timeout);busy=false;$('cancel').hidden=true;$('analyze').textContent='Fotos analysieren →';render();}
};
$('cancel').onclick=()=>controller?.abort('user');$('retryStatus').onclick=checkStatus;
$('reset').onclick=()=>{photos.forEach(p=>URL.revokeObjectURL(p.url));photos=[];$('notes').value='';$('error').textContent='';$('resultPanel').hidden=true;$('uploadPanel').hidden=false;render();$('cameraBtn').focus();};
$('print').onclick=()=>window.print();checkStatus();
