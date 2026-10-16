const dangerous = new Set(['__proto__','prototype','constructor']);
export function pathKey(path){return JSON.stringify(path);}
export function validPath(path){return Array.isArray(path)&&path.length>0&&path.length<=8&&path.every(p=>typeof p==='string'&&p.length>0&&p.length<=200&&!dangerous.has(p)&&!/[\x00-\x1f]/.test(p));}
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function diffFields(before,after,path=[]){
 if(JSON.stringify(before)===JSON.stringify(after))return [];
 if(plain(before)||plain(after)){
  const a=plain(before)?before:{},b=plain(after)?after:{};
  return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>diffFields(a[key],b[key],[...path,key]));
 }
 if(Array.isArray(before)&&Array.isArray(after)&&path[0]==='rounds'&&before.length===after.length)
  return before.flatMap((v,i)=>diffFields(v,after[i],[...path,String(i)]));
 // A newly added rounds array also needs independent fields for each course/time.
 if(Array.isArray(after)&&path[0]==='rounds')
  return after.flatMap((v,i)=>diffFields(undefined,v,[...path,String(i)]));
 return path.length?[{path,value:after===undefined?null:after,deleted:after===undefined}]:[];
}
export function setField(root,path,value,deleted=false){
 if(!validPath(path))throw new Error('Chemin de données invalide.');
 let cursor=root;
 for(let i=0;i<path.length-1;i++){
  const key=path[i];
  if(cursor[key]===null||typeof cursor[key]!=='object')cursor[key]=path[0]==='rounds'&&i===0?[]:{};
  cursor=cursor[key];
 }
 if(deleted)delete cursor[path.at(-1)];else cursor[path.at(-1)]=structuredClone(value);
 return root;
}
export function hydrate(defaults,rows,pending=[]){
 const data=structuredClone(defaults);
 for(const row of rows)if(validPath(row.path))setField(data,row.path,row.value,row.deleted);
 for(const patch of pending)setField(data,patch.path,patch.value,patch.deleted);
 return data;
}
export class SyncEngine{
 constructor({defaults,transport,onChange=()=>{},storage=null,cacheKey='pinehurst-cloud'}){
  this.defaults=defaults;this.transport=transport;this.onChange=onChange;this.storage=storage;this.cacheKey=cacheKey;
  this.rows=new Map();this.pending=new Map();this.sequence=0;this.ready=false;this.busy=false;this.stopped=false;this.status='loading';this.error='';
  try{const cached=JSON.parse(storage?.getItem(cacheKey)||'null');for(const r of cached?.rows||[])if(validPath(r.path))this.rows.set(pathKey(r.path),r);for(const p of cached?.pending||[])if(validPath(p.path))this.pending.set(pathKey(p.path),{...p,seq:++this.sequence});}catch{}
  this.data=hydrate(defaults,[...this.rows.values()],[...this.pending.values()]);
 }
 emit(){this.data=hydrate(this.defaults,[...this.rows.values()],[...this.pending.values()]);try{this.storage?.setItem(this.cacheKey,JSON.stringify({rows:[...this.rows.values()],pending:[...this.pending.values()]}));}catch{this.error='Le stockage local est plein. Exportez vos données pour conserver une copie.';}if(!this.stopped)this.onChange({data:this.data,status:this.status,error:this.error,pending:this.pending.size,conflicts:this.conflicts().length});}
 conflicts(){return [...this.pending.values()].filter(p=>(this.rows.get(pathKey(p.path))?.version??null)!==p.expectedVersion);}
 merge(rows){
  for(const row of rows){if(!validPath(row.path))continue;const key=pathKey(row.path),old=this.rows.get(key);if(!old||row.version>=old.version)this.rows.set(key,row);}
  for(const [key,p] of this.pending){const r=this.rows.get(key);if(r&&r.deleted===p.deleted&&JSON.stringify(r.value)===JSON.stringify(p.value))this.pending.delete(key);}
 }
 async refresh(){if(this.stopped||this.reading)return;this.reading=true;try{this.merge(await this.transport.read());this.ready=true;this.error='';this.status=this.conflicts().length?'conflict':this.pending.size?'pending':'synced';}catch(e){this.error=e.message;this.status='error';}finally{this.reading=false;this.emit();}}
 edit(changes){
  if(!this.ready)throw new Error('Attendez le chargement de la base avant de modifier les données.');
  const next={...this.data,...(typeof changes==='function'?changes(this.data):changes)};
  for(const patch of diffFields(this.data,next)){if(!validPath(patch.path))throw new Error('Données non prises en charge.');const key=pathKey(patch.path),old=this.pending.get(key);this.pending.set(key,{...patch,expectedVersion:old?old.expectedVersion:(this.rows.get(key)?.version??null),seq:++this.sequence});}
  this.status=this.conflicts().length?'conflict':this.pending.size?'pending':'synced';this.emit();
 }
 async flush(){
  if(this.stopped||this.busy||!this.ready||!this.pending.size||this.conflicts().length)return;
  this.busy=true;this.status='saving';this.error='';const snapshot=[...this.pending.values()].map(p=>({...p}));this.emit();
  try{
   const saved=await this.transport.save(snapshot.map(({seq,...p})=>p));
   for(const row of saved){const key=pathKey(row.path),sent=snapshot.find(p=>pathKey(p.path)===key),queued=this.pending.get(key);if(queued&&sent){if(queued.seq===sent.seq)this.pending.delete(key);else queued.expectedVersion=row.version;}}
   this.merge(saved);this.status=this.conflicts().length?'conflict':this.pending.size?'pending':'synced';
  }catch(e){this.error=e.message;this.status=e.code==='P0001'?'conflict':'error';await this.refresh();if(this.pending.size&&this.status==='pending'){this.status='error';this.error=e.message;}}
  finally{this.busy=false;this.emit();}
 }
 resolve(useLocal){
  for(const patch of this.conflicts()){const key=pathKey(patch.path);if(useLocal)patch.expectedVersion=this.rows.get(key)?.version??null;else this.pending.delete(key);}
  this.status=this.pending.size?'pending':'synced';this.error='';this.emit();
 }
 stop(){this.stopped=true;}
}
