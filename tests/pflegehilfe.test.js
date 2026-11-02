import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/pflegehilfe.js';
const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY, originalCode = process.env.PFLEGEHILFE_ACCESS_CODE;
afterEach(() => { globalThis.fetch = originalFetch;
  for(const [key,value] of [['OPENAI_API_KEY',originalKey],['PFLEGEHILFE_ACCESS_CODE',originalCode]]){
    if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
const image = 'data:image/jpeg;base64,'+Buffer.from([255,216,255,0]).toString('base64');
let id = 0;
function configured(){ process.env.OPENAI_API_KEY='test-only-key';delete process.env.PFLEGEHILFE_ACCESS_CODE; }
async function call({ method='POST', body={images:[image],note:''}, headers={}, ip }={}){
  const req={method,body,headers:{host:'dietex.example',origin:'https://dietex.example','content-type':'application/json',...headers},socket:{remoteAddress:ip||`test-${++id}`}};
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.statusCode=s;return this;},json(v){this.body=v;return this;}};
  await handler(req,res);return res;
}
function analysis(){return {title:'Testetikett',material:'Material nicht lesbar',detected_text:'40',needs_review:false,warnings:[],steps:['Waschen','Bleichen','Trocknen','Bügeln','Professionelle Reinigung'].map(category=>({category,status:'allowed',instruction:'Testanweisung',evidence:'Testetikett'})),professional:{wash_program:{id:null,reason:'Programm nach Artikelprüfung auswählen.'},tunnel_finisher:{status:'check_required',reason:'Artikel prüfen; Betriebsprogramm fehlt.'},short_steps:['Farbechtheit prüfen.','Keine gezielte Fleckvorbehandlung nötig.','Passendes Programm klären.','Trocknung und Finish klären.'],selected_process:'undecided',assessment_basis:'Etikett und Mitarbeiterangaben getrennt beurteilt.',textile_assessment:'Prüfen',stain_assessment:'Unbekannt',process_recommendation:'Fachlich prüfen',wet_cleaning_assessment:'Offen',manufacturer_deviation:false,inspection_steps:['Saumprobe'],workflow:['Prüfen'],finishing:['Kontrollieren'],stop_conditions:['Bei Veränderung stoppen'],questions:['Programm klären'],products:[]}};}
function upstream(a,extra={}){return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(a)}]}],...extra})};}
test('missing configuration disables the service without exposing credentials',async()=>{
  delete process.env.OPENAI_API_KEY;delete process.env.PFLEGEHILFE_ACCESS_CODE;
  const status=await call({method:'GET'});assert.equal(status.body.ready,false);assert.equal(status.headers['Cache-Control'],'no-store');
  assert.equal((await call()).statusCode,503);
});
test('status reports readiness without a team code and exposes no API key',async()=>{configured();const result=await call({method:'GET'});assert.equal(result.body.ready,true);assert.ok(!JSON.stringify(result.body).includes('test-only-key'));});
test('cross-origin requests never call OpenAI',async()=>{
  configured();globalThis.fetch=()=>{throw new Error('Unexpected network request');};
  assert.equal((await call({headers:{origin:'https://untrusted.example'}})).statusCode,403);
});
test('invalid images, too many photos, oversized bodies and malformed JSON are rejected',async()=>{
  configured();globalThis.fetch=()=>{throw new Error('Unexpected network request');};
  for(const images of [[],[image,image,image,image],['https://other.example/image.jpg'],['data:image/jpeg;base64,PHN2Zz4=']])assert.equal((await call({body:{images}})).statusCode,400);
  assert.equal((await call({headers:{'content-length':'4000001'}})).statusCode,413);
  assert.equal((await call({body:'{'})).statusCode,400);
});
test('valid images work without a team code and use storage disabled and a strict schema',async()=>{
  configured();globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.input[0].content[1].image_url,image);return upstream(analysis());};
  const res=await call();assert.equal(res.statusCode,200);assert.equal(res.body.analysis.steps.length,5);
});
test('missing evidence and unknown care steps always require review',async()=>{
  configured();const a=analysis();a.steps[0].evidence='';a.steps[1].status='unknown';globalThis.fetch=async()=>upstream(a);
  const result=await call();assert.equal(result.body.analysis.needs_review,true);assert.equal(result.body.analysis.steps[0].status,'unknown');
});
test('duplicate or missing categories are rejected',async()=>{
  configured();const a=analysis();a.steps[0].category='Bleichen';globalThis.fetch=async()=>upstream(a);assert.equal((await call()).statusCode,502);
});
test('incomplete responses and refusals cannot become care instructions',async()=>{
  configured();globalThis.fetch=async()=>upstream(analysis(),{status:'incomplete'});assert.equal((await call()).statusCode,422);
  globalThis.fetch=async()=>upstream(analysis(),{output:[{content:[{type:'refusal'}]}]});assert.equal((await call()).statusCode,422);
});
test('upstream quota failure and timeouts produce useful errors',async()=>{
  configured();globalThis.fetch=async()=>({ok:false,status:429});assert.match((await call()).body.error,/Kontingent/);
  globalThis.fetch=async()=>({ok:false,status:429,json:async()=>({error:{code:'insufficient_quota'}})});
  assert.equal((await call()).body.code,'api_quota_missing');
  for(const code of ['credit_balance_exhausted','organization_spend_limit_exceeded','project_spend_limit_exceeded','organization_usage_limit_exceeded']){
    globalThis.fetch=async()=>({ok:false,status:429,json:async()=>({error:{code}})});
    assert.equal((await call()).body.code,'api_quota_missing');
  }
  globalThis.fetch=async()=>({ok:false,status:429,json:async()=>({error:{type:'insufficient_quota'}})});
  assert.equal((await call()).body.code,'api_quota_missing');
  globalThis.fetch=async()=>{const e=new Error();e.name='TimeoutError';throw e;};assert.equal((await call()).statusCode,504);
});
test('per-instance rate limit rejects repeated requests before calling the API',async()=>{
  configured();for(let i=0;i<20;i++)assert.equal((await call({ip:'rate-test',body:{images:[]}})).statusCode,400);
  const result=await call({ip:'rate-test'});assert.equal(result.statusCode,429);assert.equal(result.headers['Retry-After'],'900');
});

test('invalid machine and trial context are rejected before provider access',async()=>{
  configured();globalThis.fetch=()=>{throw new Error('Unexpected network request');};
  for(const context of [{machine:'unknown-machine'},{trial:'assume-safe'},null,[]])assert.equal((await call({body:{images:[image],context}})).statusCode,400);
});
test('unknown products and oversized professional plans are rejected',async()=>{
  configured();const a=analysis();a.professional.products=[{id:'invented-product',phase:'Vordetachur',reason:'Test',application:'Test'}];globalThis.fetch=async()=>upstream(a);assert.equal((await call()).statusCode,502);
  a.professional.products=[];a.professional.questions=Array(16).fill('Test');assert.equal((await call()).statusCode,502);
});
test('catalog restricts suggestions and attaches verified product references',async()=>{
  configured();const a=analysis();a.professional.products=[{id:'deprit-professional-3',phase:'Nachdetachur',reason:'Gerbstoff',application:'Vorprobe, danach am Detachiertisch beurteilen.'}];globalThis.fetch=async()=>upstream(a);
  const result=await call({body:{images:[image],context:{machine:'k4-1',stain:'tannin',trial:'not_done'}}});
  assert.equal(result.statusCode,200);assert.equal(result.body.analysis.professional.products[0].reference.name,'Deprit Professional 3');assert.equal(result.body.analysis.needs_review,true);
  assert.ok(!JSON.stringify(result.body).includes('dietex01srv'));
});
test('PERAMON and X-PRESS on delicate fibers are excluded from garment treatment',async()=>{
  configured();const a=analysis();a.material='100 % Seide';a.professional.products=['peramon','lanadol-x-press'].map(id=>({id,phase:'Hauptreinigung',reason:'Test',application:'Test'}));globalThis.fetch=async()=>upstream(a);
  const result=await call();assert.deepEqual(result.body.analysis.professional.products,[]);assert.match(result.body.analysis.professional.questions.join(' '),/X-PRESS/);
});
test('failed trial removes treatment proposals and requires stopping',async()=>{
  configured();const a=analysis();a.professional.products=[{id:'deprit-professional-2',phase:'Vordetachur',reason:'Test',application:'Test'}];globalThis.fetch=async()=>upstream(a);
  const result=await call({body:{images:[image],context:{trial:'failed'}}});assert.equal(result.body.analysis.professional.products.length,0);assert.match(result.body.analysis.professional.workflow[0],/stoppen/);
});
test('bleach and disinfection proposals cannot supply unapproved application recipes',async()=>{
  configured();const a=analysis();a.professional.products=[{id:'ottalin-cl',phase:'Hauptreinigung',reason:'Test',application:'Invented dose 50 g/L'}];globalThis.fetch=async()=>upstream(a);
  const product=(await call()).body.analysis.professional.products[0];assert.equal(product.specialist_review,true);assert.ok(!product.application.includes('50 g/L'));assert.match(product.application,/freigegebenen/);
});

test('prespotting respects the selected wash, wet and solvent process',async()=>{
  configured();
  for(const process of ['wash','wet','solvent-k4','solvent-intense','undecided']){
    const a=analysis();a.professional.selected_process=process;
    a.professional.products=['deprit-professional-1','prenett-b'].map(id=>({id,phase:'Vordetachur',reason:'Eiweiß',application:'Nach Vorprobe und freigegebenem Verfahren.'}));
    globalThis.fetch=async()=>upstream(a);
    const result=await call();assert.equal(result.statusCode,200);
    const expected=['wash','wet'].includes(process)?['deprit-professional-1']:process.startsWith('solvent-')?['prenett-b']:[];
    assert.deepEqual(result.body.analysis.professional.products.map(p=>p.id),expected);
    assert.ok(result.body.analysis.professional.questions.some(q=>q.includes('betriebliche Zuordnung')));
    if(process.startsWith('solvent-')){
      const reference=result.body.analysis.professional.products[0].reference;
      assert.equal(reference.sds_date,'27.02.2024');assert.equal(reference.sds_version,8);assert.deepEqual(reference.hazard_codes,['H315','H318']);assert.equal(reference.sds_jurisdiction,'DE');
    }
  }
});

test('DEPRIT postspotting remains separate and PRENETT is not a main-bath product',async()=>{
  configured();const a=analysis();a.professional.selected_process='solvent-k4';
  a.professional.products=[{id:'deprit-professional-3',phase:'Nachdetachur',reason:'Test',application:'Fachprüfung am Detachiertisch.'},{id:'prenett-a',phase:'Hauptreinigung',reason:'Test',application:'Test'}];
  globalThis.fetch=async()=>upstream(a);
  assert.deepEqual((await call()).body.analysis.professional.products.map(p=>p.id),['deprit-professional-3']);
  a.professional.selected_process='invented';assert.equal((await call()).statusCode,502);
});

test('brief instructions remain bounded and a failed trial overrides the brief plan',async()=>{
  configured();const a=analysis();a.professional.short_steps=['Prüfen.','Vorbehandeln.','Waschen.','Finish.'];globalThis.fetch=async()=>upstream(a);
  const result=await call({body:{images:[image],context:{trial:'failed'}}});assert.match(result.body.analysis.professional.short_steps[0],/stoppen/);
  assert.equal(result.body.analysis.professional.short_steps.length,4);
  for(const steps of [[],Array(3).fill('Test'),Array(5).fill('Test'),['x'.repeat(201),'Test','Test','Test']]){a.professional.short_steps=steps;assert.equal((await call()).statusCode,502);}
});

test('tunnel finisher carries the confirmed CF20 profile and requires program confirmation',async()=>{
  configured();const a=analysis();globalThis.fetch=async()=>upstream(a);
  const t=(await call()).body.analysis.professional.tunnel_finisher;
  assert.equal(t.equipment.name,'VEIT CF20');assert.equal(t.equipment.available,true);assert.equal(t.program_confirmed,false);assert.deepEqual(t.equipment.approved_programs,[]);
  a.professional.tunnel_finisher.status='approved';assert.equal((await call()).statusCode,502);
});
test('failed trial stops finishing as well as the cleaning plan',async()=>{
  configured();const a=analysis();globalThis.fetch=async()=>upstream(a);
  const p=(await call({body:{images:[image],context:{trial:'failed'}}})).body.analysis.professional;
  assert.equal(p.tunnel_finisher.status,'not_applicable');assert.match(p.finishing[0],/stoppen/);
});

test('photographed CF20 program is a reference rather than a confirmed garment recipe',async()=>{
  configured();globalThis.fetch=async()=>upstream(analysis());
  const t=(await call()).body.analysis.professional.tunnel_finisher;
  const p=t.equipment.observed_programs[0];assert.equal(p.name,'Putzereiware');
  assert.equal(p.steam_time_seconds,10);assert.equal(p.dwell_time_seconds,5);assert.equal(p.air_time_seconds,15);
  assert.equal(p.usual_article_group,'Oberbekleidung');assert.equal(p.temperatures_confirmed,false);assert.equal(p.status,'observed_not_approved');assert.equal(t.program_confirmed,false);
  assert.deepEqual(t.equipment.approved_programs,[]);
});

test('WSM list returns exact program number, temperature and machine scope',async()=>{
  configured();const a=analysis();a.professional.selected_process='wet';a.professional.wash_program={id:'wsm-12',reason:'Empfindlicher Artikel nach Prüfung.'};globalThis.fetch=async()=>upstream(a);
  const p=(await call()).body.analysis.professional.wash_program;
  assert.equal(p.reference.number,12);assert.equal(p.reference.name,'Wet Clean Sensitiv');assert.equal(p.reference.temperature_display,'25');assert.equal(p.machine_group.length,5);
  a.professional.wash_program.id='wsm-27';assert.equal((await call()).statusCode,502);
});
test('solvent cleaning, special programs and supplementary steps cannot use an ordinary wash selection',async()=>{
  configured();
  for(const [process,id]of [['solvent-k4','wsm-12'],['wash','wsm-19'],['wash','wsm-24'],['wash','wsm-40'],['wash','wsm-32']]){
    const a=analysis();a.professional.selected_process=process;a.professional.wash_program={id,reason:'Test'};globalThis.fetch=async()=>upstream(a);
    const p=(await call()).body.analysis.professional;assert.equal(p.wash_program.id,null);assert.match(p.short_steps[0],/Fachkraft/);
  }
});
test('failed trial clears a selected WSM program',async()=>{
  configured();const a=analysis();a.professional.selected_process='wet';a.professional.wash_program={id:'wsm-13',reason:'Test'};globalThis.fetch=async()=>upstream(a);
  assert.equal((await call({body:{images:[image],context:{trial:'failed'}}})).body.analysis.professional.wash_program.id,null);
});

test('missing labels preserve an independent expert plan from employee and garment data',async()=>{
  configured();const a=analysis();a.material='Jeans laut Mitarbeiter, Faseranteile unbekannt';a.detected_text='';a.steps.forEach(s=>{s.status='unknown';s.evidence='';});
  a.professional.assessment_basis='Jeanshose laut Mitarbeiter, Materialanteile unbekannt; normales Denim angenommen.';
  a.professional.selected_process='wash';a.professional.wash_program={id:'wsm-29',reason:'Schonendere Option für gewöhnliche Jeans nach Vorprobe.'};
  a.professional.short_steps=['Farbechtheit und Besatz prüfen.','Keine gezielte Fleckvorbehandlung nötig.','Nach unauffälliger Vorprobe Programm 29 Buntwäsche 30° weniger schleudern verwenden.','Auf links im Schatten lufttrocknen; bei Bedarf von links niedrig bügeln.'];
  globalThis.fetch=async(url,options)=>{const b=JSON.parse(options.body);assert.ok(!b.instructions.includes('Keine Reinigung freigeben, wenn kein Pflegeetikett lesbar ist.'));assert.match(b.instructions,/Fehlendes Pflegeetikett ist KEIN pauschaler Stoppgrund/);return upstream(a);};
  const result=await call({body:{images:[image],note:'Jeanshose ohne Pflegeetikett, keine Flecken.'}});
  assert.equal(result.statusCode,200);const answer=result.body.analysis;
  assert.ok(answer.steps.every(s=>s.status==='unknown'));assert.equal(answer.professional.wash_program.reference.number,29);
  assert.match(answer.professional.short_steps[2],/Programm 29/);assert.equal(answer.professional.short_steps.length,4);assert.equal(answer.needs_review,true);
});
