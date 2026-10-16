import test from 'node:test';
import assert from 'node:assert/strict';
import {SyncEngine,diffFields,hydrate,validPath,pathKey} from '../src/sync-engine.js';
const defaults={scores:{},notes:'',selected:['A','B'],rounds:[{course:'No. 3',time:'14:40'}]};
function database(){
 const rows=new Map();let offline=false,lost=false;
 return {rows,setOffline:v=>offline=v,loseAck:()=>{lost=true;},transport:{
  async read(){if(offline)throw new Error('offline');return structuredClone([...rows.values()]);},
  async save(patches){
   if(offline)throw new Error('offline');
   for(const p of patches)if((rows.get(pathKey(p.path))?.version??null)!==p.expectedVersion)throw Object.assign(new Error('conflict'),{code:'P0001'});
   const saved=patches.map(p=>{const row={path:p.path,value:p.value,deleted:p.deleted,version:(rows.get(pathKey(p.path))?.version??0)+1};rows.set(pathKey(p.path),row);return structuredClone(row);});
   if(lost){lost=false;throw new Error('connection lost after save');}
   return saved;
  }
 }};
}
const engine=db=>new SyncEngine({defaults,transport:db.transport});
test('different devices merge separate player scores without replacing one another',async()=>{const db=database(),a=engine(db),b=engine(db);await a.refresh();await b.refresh();a.edit({scores:{A:{0:'35'}}});b.edit({scores:{B:{0:'40'}}});await a.flush();await b.flush();await a.refresh();await b.refresh();assert.deepEqual(a.data.scores,{A:{0:'35'},B:{0:'40'}});assert.deepEqual(b.data,a.data);assert.equal(a.status,'synced');});
test('same-field conflict preserves pending input until explicit resolution',async()=>{const db=database(),a=engine(db),b=engine(db);await a.refresh();await b.refresh();a.edit({notes:'Desktop'});b.edit({notes:'Mobile'});await a.flush();await b.flush();assert.equal(b.status,'conflict');assert.equal(b.pending.size,1);assert.equal(b.data.notes,'Mobile');b.resolve(false);assert.equal(b.data.notes,'Desktop');b.edit({notes:'Mobile explicit'});await b.flush();await a.refresh();assert.equal(a.data.notes,'Mobile explicit');});
test('local changes made while an earlier save is in flight remain queued',async()=>{const db=database();let release;const gate=new Promise(r=>{release=r;});const e=new SyncEngine({defaults,transport:{read:db.transport.read,save:async p=>{await gate;return db.transport.save(p);}}});await e.refresh();e.edit({notes:'first'});const save=e.flush();e.edit({notes:'second'});release();await save;assert.equal(e.data.notes,'second');assert.equal(e.pending.size,1);assert.equal([...e.pending.values()][0].expectedVersion,1);await e.flush();assert.equal(e.pending.size,0);assert.equal(db.rows.get('["notes"]').value,'second');});
test('acknowledgement loss is recovered by a read without duplicate writes',async()=>{const db=database(),e=engine(db);await e.refresh();e.edit({notes:'Saved'});db.loseAck();await e.flush();assert.equal(e.pending.size,0);assert.equal(e.status,'synced');assert.equal(db.rows.get('["notes"]').version,1);});
test('offline queue survives reload and uploads after connectivity returns',async()=>{const db=database(),store=new Map();const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};const a=new SyncEngine({defaults,transport:db.transport,storage});await a.refresh();db.setOffline(true);a.edit({notes:'Offline draft'});await a.flush();assert.equal(a.pending.size,1);const b=new SyncEngine({defaults,transport:db.transport,storage});assert.equal(b.data.notes,'Offline draft');db.setOffline(false);await b.refresh();await b.flush();assert.equal(b.pending.size,0);assert.equal(db.rows.get('["notes"]').value,'Offline draft');});
test('editing a field again does not silently rebase its earlier conflict',async()=>{const db=database(),a=engine(db),b=engine(db);await a.refresh();await b.refresh();a.edit({notes:'A'});b.edit({notes:'B'});await a.flush();await b.refresh();b.edit({notes:'B again'});assert.equal([...b.pending.values()][0].expectedVersion,null);assert.equal(b.conflicts().length,1);b.resolve(true);await b.flush();assert.equal(db.rows.get('["notes"]').value,'B again');});
test('round fields are independent; deletion and prototype paths are handled safely',()=>{assert.deepEqual(diffFields(defaults,{...defaults,rounds:[{course:'No. 3',time:'15:00'}]})[0].path,['rounds','0','time']);const changes=diffFields({scores:{A:{0:'35'}}},{scores:{A:{}}});assert.equal(changes[0].deleted,true);assert.deepEqual(hydrate({scores:{A:{0:'35'}}},changes),{scores:{A:{}}});assert.equal(validPath(['scores','__proto__','polluted']),false);assert.equal({}.polluted,undefined);});
