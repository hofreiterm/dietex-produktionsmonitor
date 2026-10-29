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
const code = 'test-only-team-code';
const image = 'data:image/jpeg;base64,'+Buffer.from([255,216,255,0]).toString('base64');
let id = 0;
function configured(){ process.env.OPENAI_API_KEY='test-only-key';process.env.PFLEGEHILFE_ACCESS_CODE=code; }
async function call({ method='POST', body={images:[image],note:''}, headers={}, ip }={}){
  const req={method,body,headers:{host:'dietex.example',origin:'https://dietex.example','content-type':'application/json','x-pflegehilfe-code':code,...headers},socket:{remoteAddress:ip||`test-${++id}`}};
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.statusCode=s;return this;},json(v){this.body=v;return this;}};
  await handler(req,res);return res;
}
function analysis(){return {title:'Testetikett',material:'Material nicht lesbar',detected_text:'40',needs_review:false,warnings:[],steps:['Waschen','Bleichen','Trocknen','Bügeln','Professionelle Reinigung'].map(category=>({category,status:'allowed',instruction:'Testanweisung',evidence:'Testetikett'}))};}
function upstream(a,extra={}){return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(a)}]}],...extra})};}
test('missing configuration disables the service without exposing credentials',async()=>{
  delete process.env.OPENAI_API_KEY;delete process.env.PFLEGEHILFE_ACCESS_CODE;
  const status=await call({method:'GET'});assert.equal(status.body.ready,false);assert.equal(status.headers['Cache-Control'],'no-store');
  assert.equal((await call()).statusCode,503);
});
test('status reports readiness but no secret values',async()=>{configured();const result=await call({method:'GET'});assert.equal(result.body.ready,true);assert.ok(!JSON.stringify(result.body).includes(code));});
test('invalid code and cross-origin request never call OpenAI',async()=>{
  configured();globalThis.fetch=()=>{throw new Error('Unexpected network request');};
  assert.equal((await call({headers:{'x-pflegehilfe-code':'wrong'}})).statusCode,401);
  assert.equal((await call({headers:{origin:'https://untrusted.example'}})).statusCode,403);
});
test('invalid images, too many photos, oversized bodies and malformed JSON are rejected',async()=>{
  configured();globalThis.fetch=()=>{throw new Error('Unexpected network request');};
  for(const images of [[],[image,image,image,image],['https://other.example/image.jpg'],['data:image/jpeg;base64,PHN2Zz4=']])assert.equal((await call({body:{images}})).statusCode,400);
  assert.equal((await call({headers:{'content-length':'4000001'}})).statusCode,413);
  assert.equal((await call({body:'{'})).statusCode,400);
});
test('valid images are sent only to OpenAI with storage disabled and a strict schema',async()=>{
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
  globalThis.fetch=async()=>{const e=new Error();e.name='TimeoutError';throw e;};assert.equal((await call()).statusCode,504);
});
test('per-instance rate limit rejects repeated requests before calling the API',async()=>{
  configured();for(let i=0;i<20;i++)assert.equal((await call({ip:'rate-test',headers:{'x-pflegehilfe-code':'wrong'}})).statusCode,401);
  const result=await call({ip:'rate-test'});assert.equal(result.statusCode,429);assert.equal(result.headers['Retry-After'],'900');
});
