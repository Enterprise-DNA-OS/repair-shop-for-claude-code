#!/usr/bin/env node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
export const questions=[
 ['Which late repairs are waiting for parts?',"SELECT ref,customer,device,technician,days_late FROM v_bench WHERE status='parts' AND days_late>0 ORDER BY days_late DESC"],
 ['Which customers have not heard from us for a week?',"SELECT ref,customer,status,days_since_contact FROM v_bench WHERE status NOT IN ('collected','cancelled') AND (days_since_contact>=7 OR days_since_contact IS NULL)"],
 ['Which finished devices have waited a week for collection?',"SELECT ref,customer,device,ready_days,currency,balance_cents FROM v_bench WHERE status='ready' AND (ready_days>=7 OR ready_days IS NULL)"],
 ['Which technicians have overdue work?',"SELECT technician,count(*) AS late_repairs FROM v_bench WHERE status NOT IN ('ready','collected','cancelled') AND days_late>0 GROUP BY technician"],
 ['Which Australian repairs lack notice evidence?',"SELECT ref,rule,finding FROM v_compliance WHERE rule='AU-NOTICE'"],
 ['Which parts are at their reorder point?',"SELECT store,sku,name,on_hand,reorder_at,supplier FROM v_parts WHERE on_hand<=reorder_at"],
 ['Which repairs have recorded parts costs above their invoice?',"SELECT ref,currency,invoice_cents,parts_cents,contribution_before_labour_cents FROM v_bench WHERE contribution_before_labour_cents<0"],
 ['What recorded balance is waiting at each shop?',"SELECT store,currency,sum(balance_cents)::int AS balance_cents,count(*) FILTER(WHERE balance_cents IS NULL) AS unknown_balances FROM v_bench WHERE status<>'cancelled' GROUP BY store,currency"],
 ['Which customer remedy follow-ups are overdue?',"SELECT ref,customer,issue,follow_up_on,days_late FROM v_claims WHERE status='open' AND days_late>0"],
 ['Which imported repairs still need approval or condition evidence?',"SELECT ref,device,status FROM tickets WHERE imported AND status NOT IN ('collected','cancelled') AND (approval_ref IS NULL OR condition IS NULL)"]
];
const reads={
 stores:'SELECT * FROM stores ORDER BY name',customers:'SELECT * FROM customers ORDER BY name',
 tickets:'SELECT * FROM v_bench ORDER BY ref',
 bench:"SELECT ref,customer,device,technician,status,due_on,days_late FROM v_bench WHERE status NOT IN ('collected','cancelled') ORDER BY due_on NULLS LAST,ref",
 'parts-due':"SELECT ref,customer,device,technician,due_on,days_late FROM v_bench WHERE status='parts' ORDER BY due_on NULLS LAST",
 collections:"SELECT ref,customer,device,ready_days,currency,balance_cents FROM v_bench WHERE status='ready' ORDER BY ready_days DESC NULLS FIRST",
 parts:'SELECT * FROM v_parts ORDER BY store,sku',
 'stock-check':'SELECT store,sku,name,on_hand,reorder_at,supplier FROM v_parts WHERE on_hand<=reorder_at ORDER BY store,sku',
 warranties:"SELECT t.ref,c.name AS customer,t.device,t.warranty_until,cl.issue,cl.status AS claim_status FROM tickets t JOIN customers c ON c.id=t.customer_id LEFT JOIN claims cl ON cl.ticket_id=t.id WHERE t.warranty_until IS NOT NULL OR cl.id IS NOT NULL ORDER BY t.ref",
 claims:'SELECT * FROM v_claims ORDER BY follow_up_on', compliance:'SELECT ref,rule,finding FROM v_compliance ORDER BY ref,rule',
 attention:"SELECT ref,customer,status,days_late,days_since_contact,ready_days FROM v_bench WHERE status NOT IN ('collected','cancelled') AND (days_late>0 OR days_since_contact>=7 OR days_since_contact IS NULL OR ready_days>=7) ORDER BY days_late DESC NULLS LAST",
 metrics:"SELECT store,currency,count(*) AS tickets,sum(invoice_cents)::int AS recorded_invoice_cents,sum(balance_cents)::int AS balance_cents,count(*) FILTER(WHERE balance_cents IS NULL) AS unknown_balances,sum(parts_cents)::int AS parts_cents FROM v_bench WHERE status<>'cancelled' GROUP BY store,currency ORDER BY store"
};
function opts(args){const o={};for(const a of args.filter(a=>a.startsWith('--'))){const i=a.indexOf('=');o[i<0?a.slice(2):a.slice(2,i)]=i<0?true:a.slice(i+1);}return o;}
function need(o,k){if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Missing --${k}=...`);return o[k].trim();}
export function cents(v){if(!/^\d+(\.\d{1,2})?$/.test(String(v)))throw Error('Money must be a nonnegative decimal with at most two decimal places');const [a,b='']=String(v).split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(!Number.isSafeInteger(n)||n>2147483647)throw Error('Amount out of range');return n;}
function integer(v){if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v)))throw Error('Expected nonnegative integer');return Number(v);}
function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Use a valid YYYY-MM-DD date');return v;}
function stamp(v){if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Use an ISO timestamp with timezone');return new Date(v).toISOString();}
export async function resolve(db,tableName,term,field='name'){
 if(!term)throw Error(`Provide a ${tableName} reference`);
 const rows=await db.query(`SELECT * FROM ${tableName} ORDER BY ${field}`);
 const q=term.toLowerCase();const exact=rows.filter(r=>r.id===term||String(r[field]).toLowerCase()===q);
 const matches=exact.length?exact:rows.filter(r=>r.id.startsWith(q)||String(r[field]).toLowerCase().includes(q));
 if(matches.length!==1)throw Error(`${matches.length?'Ambiguous':'No'} ${tableName} match: ${term}\n${matches.map(r=>`${r.id}  ${r[field]}`).join('\n')}`);
 return matches[0];
}
async function tx(db,fn,dry=false){await db.exec('BEGIN');try{const v=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return v;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function insert(db,t,data){const keys=Object.keys(data);return (await db.query(`INSERT INTO ${t}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,Object.values(data)))[0];}
const ticket=(db,x)=>resolve(db,'tickets',x,'ref');
async function log(db,t,o,note){return insert(db,'events',{ticket_id:t.id,actor:need(o,'actor'),note});}
async function importRepairdesk(db,o){
 const store=await resolve(db,'stores',need(o,'store'));const rows=parseCsv(fs.readFileSync(path.resolve(need(o,'file')),'utf8'));
 if(!rows.length)throw Error('No data rows');
 for(const k of ['Ticket ID','Customer','Devices','Tasks','Status'])if(!Object.keys(rows[0]).some(h=>h.toLowerCase()===k.toLowerCase()))throw Error(`Missing RepairDesk header: ${k}`);
 const seen=new Set();
 return tx(db,async()=>{
 let imported=0,skipped=0;
 for(const [i,r] of rows.entries()){
 const id=pick(r,'Ticket ID').trim(),name=pick(r,'Customer').trim();if(!id||!name)throw Error(`Row ${i+2}: ticket id and customer required`);
 const key=JSON.stringify([store.id,id,pick(r,'IMEI/ Serial','IMEI/Serial'),pick(r,'Devices'),pick(r,'Tasks')]);
 if(seen.has(key))throw Error(`Duplicate task row ${i+2}`);seen.add(key);
 const existing=await db.query('SELECT id FROM tickets WHERE source_key=$1',[key]);if(existing.length){skipped++;continue;}
 // Names are not identities. Each distinct imported repair retains its own customer snapshot.
 const customer=await insert(db,'customers',{name});
 const rawStatus=pick(r,'Status').toLowerCase().trim();const map={pending:'assessment','in progress':'repairing',repairing:'repairing','waiting for parts':'parts',repaired:'ready',completed:'ready',collected:'collected',delivered:'collected',cancelled:'cancelled',canceled:'cancelled'};
 if(!(rawStatus in map))throw Error(`Row ${i+2}: unmapped status "${rawStatus}"; map explicitly before import`);
 const total=pick(r,'Total');const due=pick(r,'Due On');const created=pick(r,'Created Time');
 const ref=`RD-${id}-${createHash('sha256').update(key).digest('hex').slice(0,12)}`;
 await insert(db,'tickets',{ref,store_id:store.id,customer_id:customer.id,device:pick(r,'Devices')||'Review imported device',serial:pick(r,'IMEI/ Serial','IMEI/Serial')||null,fault:pick(r,'Tasks')||'Review imported task',technician:pick(r,'Assigned To')||'Unassigned',status:map[rawStatus],due_on:due?date(due):null,...(created?{received_at:stamp(created)}:{}),invoice_cents:total?cents(total):null,imported:true,source_key:key,source_data:JSON.stringify(r)});imported++;
 }
 return {imported,skipped,dry_run:Boolean(o['dry-run']),note:'Customer snapshots retained per repair. Notices, payments, approval and quality evidence remain unknown.'};
 },Boolean(o['dry-run']));
}
export async function run(db,args){
 const o=opts(args),[cmd='help',arg,third]=args.filter(a=>!a.startsWith('--'));
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='help')return {reads:Object.keys(reads),writes:['add store|customer|part|claim','intake','update','approve','notice','start','quality-check','collect','use-part','receive-part','resolve-claim','log'],other:['ticket','questions 1..10','weekly-review','draft-pickup','import repairdesk','export'],syntax:'Options use --name=value. Every command accepts --json. See README and .claude/commands.'};
 if(cmd==='questions'){if(!arg)return questions.map(([question],i)=>({number:i+1,question}));const n=integer(arg);if(n<1||n>10)throw Error('Question number must be 1..10');return db.query(questions[n-1][1]);}
 if(cmd==='weekly-review')return {bench:await db.query(reads.bench),attention:await db.query(reads.attention),compliance:await db.query(reads.compliance),claims:await db.query(reads.claims)};
 if(cmd==='ticket'){const t=await ticket(db,arg);return {ticket:t,customer:(await db.query('SELECT * FROM customers WHERE id=$1',[t.customer_id]))[0],parts:await db.query('SELECT * FROM part_usage WHERE ticket_id=$1',[t.id]),events:await db.query('SELECT * FROM events WHERE ticket_id=$1 ORDER BY created_at',[t.id]),claims:await db.query('SELECT * FROM claims WHERE ticket_id=$1',[t.id])};}
 if(cmd==='import'){if(arg!=='repairdesk')throw Error('Use import repairdesk');return importRepairdesk(db,o);}
 if(cmd==='export'){
 const out=path.resolve(o.out||path.join(REPO_ROOT,'exports',`repair-${Date.now()}.json`));const data={format:'repair-shop-v1',exported_at:new Date().toISOString()};
 await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{for(const t of ['stores','customers','tickets','parts','part_usage','events','claims'])data[t]=await db.query(`SELECT * FROM ${t} ORDER BY id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(data,null,2),{flag:'wx'});return {file:out,counts:Object.fromEntries(Object.entries(data).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))};
 }
 if(cmd==='add'){
 if(arg==='store'){const country=need(o,'country');if(!['NZ','AU'].includes(country))throw Error('country is NZ or AU');return insert(db,'stores',{name:need(o,'name'),country,currency:country==='NZ'?'NZD':'AUD',timezone:o.timezone||(country==='NZ'?'Pacific/Auckland':'Australia/Sydney')});}
 if(arg==='customer')return insert(db,'customers',{name:need(o,'name'),email:o.email||null,phone:o.phone||null});
 if(arg==='part'){const s=await resolve(db,'stores',need(o,'store'));return insert(db,'parts',{store_id:s.id,sku:need(o,'sku'),name:need(o,'name'),on_hand:integer(o.quantity||'0'),reorder_at:integer(o.reorder||'0'),unit_cost_cents:cents(o.cost||'0'),supplier:o.supplier||null});}
 if(arg==='claim'){const t=await ticket(db,need(o,'ticket'));return insert(db,'claims',{ticket_id:t.id,issue:need(o,'issue'),follow_up_on:date(need(o,'due'))});}
 throw Error('Use add store|customer|part|claim');
 }
 if(cmd==='intake'){const s=await resolve(db,'stores',need(o,'store')),c=await resolve(db,'customers',need(o,'customer'));return insert(db,'tickets',{ref:need(o,'ref'),store_id:s.id,customer_id:c.id,device:need(o,'device'),fault:need(o,'fault'),condition:need(o,'condition'),serial:o.serial||null,technician:o.technician||'Unassigned',due_on:o.due?date(o.due):null,quote_cents:o.quote?cents(o.quote):null});}
 if(cmd==='resolve-claim'){const c=await resolve(db,'claims',arg,'issue');return (await db.query("UPDATE claims SET status='resolved',resolution=$1 WHERE id=$2 RETURNING *",[need(o,'resolution'),c.id]))[0];}
 if(cmd==='receive-part'){const p=await resolve(db,'parts',arg,'sku');const n=integer(need(o,'quantity'));if(!n)throw Error('Quantity must be positive');return(await db.query('UPDATE parts SET on_hand=on_hand+$1 WHERE id=$2 RETURNING *',[n,p.id]))[0];}
 const t=await ticket(db,arg);
 if(cmd==='draft-pickup'){
 if(t.status!=='ready')throw Error('Only ready repairs can have collection drafts');const c=(await db.query('SELECT * FROM customers WHERE id=$1',[t.customer_id]))[0];
 const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`pickup-${t.id}-${Date.now()}.md`);
 fs.writeFileSync(file,`DRAFT ONLY\n\nTo: ${c.email||'[confirm address]'}\nSubject: Your repair ${t.ref} is ready\n\nHello ${c.name},\n\nYour ${t.device} is ready for collection. Please contact the shop to arrange pickup and confirm any outstanding balance.\n\nThe repair team\n`,{flag:'wx'});return {file,sent:false};
 }
 return tx(db,async()=>{
 // Lock the ticket before transitions so two operators cannot pass stale guards.
 const locked=(await db.query('SELECT * FROM tickets WHERE id=$1 FOR UPDATE',[t.id]))[0];Object.assign(t,locked);
 if(cmd==='log')return log(db,t,o,need(o,'note'));
 if(cmd==='use-part'){
 if(!['approved','repairing','parts'].includes(t.status))throw Error('Repair must be approved and active before using parts');
 const p=await resolve(db,'parts',need(o,'part'),'sku'),n=integer(need(o,'quantity'));if(!n||p.store_id!==t.store_id)throw Error('Positive quantity and matching store required');
 const changed=await db.query('UPDATE parts SET on_hand=on_hand-$1 WHERE id=$2 AND on_hand>=$1 RETURNING *',[n,p.id]);if(!changed.length)throw Error('Insufficient stock');
 await log(db,t,o,`Used ${n} of ${p.sku}`);return insert(db,'part_usage',{ticket_id:t.id,part_id:p.id,quantity:n,unit_cost_cents:p.unit_cost_cents});
 }
 let change={};
 if(cmd==='update'){
 const allowed={due:['due_on',date],technician:['technician',String],condition:['condition',String],invoice:['invoice_cents',cents],paid:['paid_cents',cents],contact:['last_contact_at',stamp],warranty:['warranty_until',date]};
 for(const [k,v] of Object.entries(o)){if(['actor','json'].includes(k))continue;if(!allowed[k])throw Error(`Unsupported update --${k}`);const [col,parse]=allowed[k];change[col]=parse(v);}
 if(!Object.keys(change).length)throw Error('No changes supplied');
 }else if(cmd==='notice'){
 change={notice_at:stamp(need(o,'at')),notice_ref:need(o,'evidence'),notice_data_loss:o['data-loss']==='yes',notice_refurbished:o.refurbished==='yes',refurbished_possible:o.refurbished==='yes'};
 if(Date.parse(change.notice_at)>Date.now())throw Error('Notice evidence cannot be in the future');
 }else if(cmd==='approve'){
 if(t.status!=='assessment')throw Error('Only assessment tickets can be approved');
 const accepted=stamp(need(o,'accepted'));if(Date.parse(accepted)>Date.now())throw Error('Acceptance cannot be in the future');
 const s=(await db.query('SELECT * FROM stores WHERE id=$1',[t.store_id]))[0];
 if(s.country==='AU'&&(t.stores_data||t.refurbished_possible)&&(!t.notice_at||new Date(t.notice_at)>new Date(accepted)||!t.notice_ref||(t.stores_data&&!t.notice_data_loss)||(t.refurbished_possible&&!t.notice_refurbished)))throw Error('AU written notice evidence must precede acceptance');
 change={status:'approved',approval_ref:need(o,'evidence'),accepted_at:accepted,quote_cents:cents(need(o,'quote'))};
 }else if(cmd==='start'){
 if(!['approved','parts'].includes(t.status))throw Error('Start requires approved or parts status');
 if(!t.approval_ref)throw Error('Approval evidence required');change={status:'repairing'};
 }else if(cmd==='await-parts'){
 if(!['approved','repairing'].includes(t.status))throw Error('Only active approved work can wait for parts');change={status:'parts'};
 }else if(cmd==='quality-check'){
 if(!['repairing','parts'].includes(t.status))throw Error('Quality check requires an active repair');
 if(!t.approval_ref)throw Error('Approval evidence required');change={status:'ready',qa_note:need(o,'note'),qa_by:need(o,'actor'),ready_at:new Date().toISOString()};
 }else if(cmd==='collect'){
 if(t.status!=='ready'||!t.qa_note||!t.qa_by)throw Error('Collection requires ready status and quality evidence');change={status:'collected',collected_at:new Date().toISOString()};need(o,'note');
 }else throw Error(`Unknown command: ${cmd}`);
 const keys=Object.keys(change);const updated=(await db.query(`UPDATE tickets SET ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE id=$${keys.length+1} RETURNING *`,[...Object.values(change),t.id]))[0];
 await log(db,t,o,`${cmd}: ${o.note||JSON.stringify(change)}`);return updated;
 });
}
export function format(value){if(Array.isArray(value)){if(!value.length)return '(none)';return table(value,Object.keys(value[0]).map(key=>({key,label:key,width:65,format:v=>v===null?'unknown':typeof v==='object'?JSON.stringify(v):String(v)})));}return JSON.stringify(value,null,2);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
