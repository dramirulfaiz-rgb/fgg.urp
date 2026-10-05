import {supervisorKeys,supervisorError} from '@/lib/supervisors';
import {emailSetup,prepareEmailScript,connectEmail,emailRecords,deliverEmails,queueSubmission} from '@/lib/mail';
import {env} from 'cloudflare:workers';
import {studentKeys,studentError,normalizeStudents} from '@/lib/students';
import { database,hash,random,session,newSession,rate,safe,adminPassword } from '@/lib/server';
import {validateExtras} from '@/lib/extras';
import {blank,fields,missing} from '@/lib/proposal';
export const dynamic='force-dynamic';
function json(d:unknown,status=200,cookie?:string){return Response.json(d,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});}
export async function GET(req:Request){try{const s=await session(req);if(!s)return json({role:null});if(s.role==='admin'){const rows=await database().prepare('SELECT * FROM proposals ORDER BY updated_at DESC').all();return json({role:'admin',proposals:rows.results.map(safe),emailSetup:await emailSetup(),emails:await emailRecords()});}const p=await database().prepare('SELECT * FROM proposals WHERE id=?').bind(s.proposal_id).first();return p?json({role:'student',proposal:safe(p)}):json({role:null});}catch(e){console.error(e);return json({error:'Unable to load saved proposals. Please retry.'},503);}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'Request origin rejected.'},403);
 const raw=await req.text();if(raw.length>400000)return json({error:'Proposal is too large. Please shorten the text.'},413);const b=JSON.parse(raw);const db=database();
 if(b.action==='register'){
  await rate(req,'register',12);const roster:Record<string,string>={};for(const k of studentKeys){if(typeof b[k]!=='string'&&b[k]!=null)return json({error:'Invalid student details.'},400);roster[k]=String(b[k]||'').slice(0,254);}roster._studentCount=roster._studentCount==='2'?'2':'1';const normalized=normalizeStudents(roster);const error=studentError(normalized);if(error)return json({error},400);
  const key=random().slice(0,20).toUpperCase();const code='FGG-'+random().slice(0,10).toUpperCase();const now=new Date().toISOString();const d={...blank(),...normalized};
  const p=await db.prepare('INSERT INTO proposals (code,key_hash,data,created_at,updated_at) VALUES (?,?,?,?,?) RETURNING *').bind(code,await hash(key),JSON.stringify(d),now,now).first<any>();
  return json({role:'student',proposal:safe(p),accessKey:key},200,await newSession('student',p.id));
 }
 if(b.action==='login'){
  await rate(req,'login',15);let role='student';let id:number|null=null;
  if(b.admin){const configured=adminPassword();if(!configured)throw new Error('Admin sign-in is temporarily unavailable.');if(await hash(String(b.password||''))!==await hash(configured))return json({error:'Incorrect admin password.'},401);role='admin';}
  else{const p=await db.prepare('SELECT id,key_hash FROM proposals WHERE code=?').bind(String(b.code||'').trim().toUpperCase()).first<any>();if(!p||p.key_hash!==await hash(String(b.key||'').trim().toUpperCase()))return json({error:'Proposal number or access key is incorrect.'},401);id=p.id;}
  return json({ok:true},200,await newSession(role,id));
 }
 const s=await session(req);if(!s)return json({error:'Your session has expired. Sign in again. Keep this page open to retain unsaved text.'},401);
 if(b.action==='logout'){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)fgg_session=([a-f0-9]+)/)?.[1];if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token)).run();return json({ok:true},200,'fgg_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Secure');}
 if(['review','deleteProject','prepareEmail','connectEmail','retryEmails'].includes(b.action)&&s.role!=='admin')return json({error:'Admin access required.'},403);
 if(s.role==='admin'&&b.action==='prepareEmail')return json({script:await prepareEmailScript(),emailSetup:await emailSetup()});
 if(s.role==='admin'&&b.action==='connectEmail')return json({emailSetup:await connectEmail(String(b.url||''))});
 if(s.role==='admin'&&b.action==='retryEmails'){await rate(req,'retryEmail',15);return json({emailDelivery:await deliverEmails(Number.isInteger(b.id)?b.id:undefined),emails:await emailRecords()});}
 if(s.role==='admin'&&b.action==='deleteProject'){
  const project=await db.prepare('SELECT id,code FROM proposals WHERE id=?').bind(b.id).first<{id:number,code:string}>();if(!project)return json({error:'Project not found.'},404);if(b.confirmCode!==project.code)return json({error:'Enter the project number to confirm deletion.'},400);
  const assets=await db.prepare('SELECT object_key FROM assets WHERE proposal_id=?').bind(project.id).all<{object_key:string}>();if(assets.results.length&&!env.BUCKET)return json({error:'Picture storage is unavailable. Try deleting again later.'},503);if(assets.results.length)await env.BUCKET!.delete(assets.results.map(a=>a.object_key));
  await db.batch([db.prepare('DELETE FROM mail_outbox WHERE proposal_id=?').bind(project.id),db.prepare('DELETE FROM assets WHERE proposal_id=?').bind(project.id),db.prepare('DELETE FROM sessions WHERE proposal_id=?').bind(project.id),db.prepare('DELETE FROM proposals WHERE id=?').bind(project.id)]);return json({ok:true});
 }
 if(s.role==='admin'&&b.action==='review'){
  if(!['Submitted','In review','Revision requested','Proposal received'].includes(b.status)||typeof b.feedback!=='string'||b.feedback.length>10000)return json({error:'Invalid review details.'},400);
  const p=await db.prepare('UPDATE proposals SET status=?,feedback=? WHERE id=? AND submitted_at IS NOT NULL RETURNING *').bind(b.status,b.feedback,b.id).first();return p?json({proposal:safe(p)}):json({error:'Only submitted proposals can be reviewed.'},400);
 }
 if(s.role!=='student')return json({error:'Action unavailable.'},403);
 const p=await db.prepare('SELECT * FROM proposals WHERE id=?').bind(s.proposal_id).first<any>();if(!p)return json({error:'Proposal not found.'},404);
 if(b.action==='save'){
  if(!b.data||typeof b.data!=='object')return json({error:'Invalid proposal.'},400);const data:Record<string,string>={};for(const [k] of [...fields,['ethicsStatus']]){if(typeof b.data[k]!=='string'||b.data[k].length>40000)return json({error:'Invalid or oversized field: '+k},400);data[k]=b.data[k];}
  for(const k of studentKeys){if(b.data[k]!=null&&(typeof b.data[k]!=='string'||b.data[k].length>254))return json({error:'Invalid student details.'},400);if(b.data[k]!=null)data[k]=b.data[k];}Object.assign(data,normalizeStudents(data));
  for(const k of supervisorKeys){if(b.data[k]!=null&&(typeof b.data[k]!=='string'||b.data[k].length>2000))return json({error:'Invalid supervisor email details.'},400);data[k]=String(b.data[k]||'').trim();}
  const extras=validateExtras(b.data._extras||'{}');for(const blocks of Object.values(extras))for(const block of blocks)if(block.type==='picture'){const asset=await db.prepare("SELECT id FROM assets WHERE id=? AND proposal_id=? AND mime IN ('image/png','image/jpeg')").bind(block.assetId,p.id).first();if(!asset)return json({error:'A picture is unavailable or does not belong to this project. Remove it and upload again.'},400);}data._extras=JSON.stringify(extras);
  if(b.data._titleForm){let form;try{form=JSON.parse(b.data._titleForm);}catch{return json({error:'Invalid topic submission form.'},400);}if(!/^[a-f0-9]{32}$/.test(form.id||''))return json({error:'Invalid topic submission form.'},400);const asset=await db.prepare("SELECT id,created_at FROM assets WHERE id=? AND proposal_id=? AND object_key LIKE '%/title-forms/%'").bind(form.id,p.id).first<{id:string,created_at:string}>();if(!asset)return json({error:'The topic form is unavailable or does not belong to this project.'},400);data._titleForm=JSON.stringify({id:asset.id,name:String(form.name||'Topic submission form').slice(0,200),uploadedAt:asset.created_at});data._titleFormConfirmed=b.data._titleFormConfirmed==='yes'?'yes':'';}else{data._titleForm='';data._titleFormConfirmed='';}
  const previousData=JSON.parse(p.data);if(previousData._titleSubmittedForm)data._titleSubmittedForm=previousData._titleSubmittedForm;

  const updated=await db.prepare('UPDATE proposals SET data=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING *').bind(JSON.stringify(data),new Date().toISOString(),p.id,b.version).first();return updated?json({proposal:safe(updated)}):json({error:'This proposal changed in another tab. Copy your changes, then reload before saving.'},409);
 }
 if(b.action==='submit'||b.action==='submitTitle'){
  if(b.version!==p.version)return json({error:'Save your latest changes before submitting.'},409);const data=JSON.parse(p.data);const rosterError=studentError(data);if(rosterError)return json({error:rosterError},400);const supervisorEmailError=supervisorError(data);if(supervisorEmailError)return json({error:supervisorEmailError},400);if(b.action==='submitTitle'){if(!data.title?.trim()||!data.supervisors?.trim())return json({error:'Add the research title and supervisor names first.'},400);
   if(!data._titleForm||data._titleFormConfirmed!=='yes')return json({error:'Upload the completed topic submission form and confirm student and supervisor signatures, including co-supervisors where applicable.'},400);const form=JSON.parse(data._titleForm);const asset=await db.prepare("SELECT id FROM assets WHERE id=? AND proposal_id=? AND object_key LIKE '%/title-forms/%'").bind(form.id,p.id).first();if(!asset)return json({error:'The topic submission form is unavailable. Upload it again.'},400);
   const submittedAt=new Date().toISOString();data._titleSubmittedForm=JSON.stringify({...form,submittedAt,signaturesConfirmed:true});const updated=await db.prepare('UPDATE proposals SET title_submitted_at=?,data=?,version=version+1 WHERE id=? AND version=? RETURNING *').bind(submittedAt,JSON.stringify(data),p.id,p.version).first();if(!updated)return json({error:'Proposal changed. Save and try again.'},409);let emailDelivery;try{emailDelivery=await queueSubmission(data,safe(updated),'title',submittedAt);}catch(e){console.error(e);emailDelivery={status:'pending_retry',message:'Title submitted. Email notices could not be queued. Contact the coordinator.'};}return json({proposal:safe(updated),emailDelivery});}

  const m=missing(data);if(m.length)return json({error:'Complete all sections before submitting. Use “Not applicable” where appropriate. Missing: '+m.slice(0,5).join(', ')},400);
  const submittedAt=new Date().toISOString();const updated=await db.prepare('UPDATE proposals SET snapshot=data,status=?,submitted_at=?,updated_at=? WHERE id=? AND version=? RETURNING *').bind('Submitted',submittedAt,submittedAt,p.id,p.version).first();if(!updated)return json({error:'Proposal changed. Save and try again.'},409);let emailDelivery;try{emailDelivery=await queueSubmission(data,safe(updated),'proposal',submittedAt);}catch(e){console.error(e);emailDelivery={status:'pending_retry',message:'Proposal submitted. Email notices could not be queued. Contact the coordinator.'};}return json({proposal:safe(updated),emailDelivery});
 }
 return json({error:'Unknown action.'},400);
 }catch(e){console.error(e);return json({error:e instanceof SyntaxError?'Invalid request.':e instanceof Error?e.message:'Unable to complete the request. Please retry.'},503);}}
