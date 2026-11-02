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
function analysis(){return {title:'Testetikett',material:'Material nicht lesbar',detected_text:'40',needs_review:false,warnings:[],steps:['Waschen','Bleichen','Trocknen','Bügeln','Professionelle Reinigung'].map(category=>({category,status:'allowed',instruction:'Testanweisung',evidence:'Testetikett'})),professional:{textile_assessment:'Prüfen',stain_assessment:'Unbekannt',process_recommendation:'Fachlich prüfen',wet_cleaning_assessment:'Offen',manufacturer_deviation:false,inspection_steps:['Saumprobe'],workflow:['Prüfen'],finishing:['Kontrollieren'],stop_conditions:['Bei Veränderung stoppen'],questions:['Programm klären'],products:[]}};}
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
