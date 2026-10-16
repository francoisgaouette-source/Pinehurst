import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {loadCloudConfig,validateCloudConfig} from './cloud-config.js';
import {SyncEngine,diffFields,setField} from './sync-engine.js';

export function useCloudTrip(defaults,loadLocal){
 const [trip,setTrip]=useState(loadLocal),[storageError,setStorageError]=useState(''),[config,setConfig]=useState(null),[session,setSession]=useState(null),[sync,setSync]=useState({status:'local',pending:0,conflicts:0,error:''});
 const tripRef=useRef(trip),engineRef=useRef(null),timer=useRef(),sessionRef=useRef(session);
 sessionRef.current=session;
 const client=useMemo(()=>config?createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit',storageKey:'pinehurst-auth-'+new URL(config.supabaseUrl).hostname}}):null,[config]);
 const localView=useCallback(()=>{const data=loadLocal();tripRef.current=data;setTrip(data);},[loadLocal]);
 useEffect(()=>{let alive=true;loadCloudConfig().then(c=>{if(alive)setConfig(c);}).catch(e=>{if(alive)setSync(s=>({...s,error:e.message}));});return()=>{alive=false;};},[]);
 useEffect(()=>{
  if(!client){setSession(null);return;}
  let alive=true;
  client.auth.getSession().then(({data,error})=>{if(alive){if(error)setSync(s=>({...s,error:error.message}));setSession(data.session);}});
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,next)=>{if(alive)setSession(next);});
  return()=>{alive=false;subscription.unsubscribe();};
 },[client]);
 const userId=session?.user?.id;
 useEffect(()=>{
  clearTimeout(timer.current);
  if(!client||!userId){engineRef.current=null;localView();setSync(s=>({...s,status:'local',pending:0,conflicts:0}));return;}
  const transport={
   async read(){const {data,error}=await client.rpc('pinehurst_read');if(error)throw error;return data||[];},
   async save(changes){const {data,error}=await client.rpc('pinehurst_apply',{p_changes:changes});if(error)throw error;return data||[];},
  };
  const engine=new SyncEngine({defaults,transport,storage:localStorage,cacheKey:'pinehurst-cloud-'+new URL(config.supabaseUrl).hostname+'-'+userId,onChange:s=>{
   tripRef.current=s.data;setTrip(s.data);setSync({status:s.status,pending:s.pending,conflicts:s.conflicts,error:s.error});
   clearTimeout(timer.current);if(s.status==='pending')timer.current=setTimeout(()=>engine.flush(),600);
  }});
  engineRef.current=engine;engine.emit();engine.refresh().then(()=>engine.flush());
  const refresh=()=>{if(!engine.busy)engine.refresh().then(()=>engine.flush());};
  const interval=setInterval(()=>{if(document.visibilityState!=='hidden')refresh();},2500);
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{engine.stop();clearInterval(interval);clearTimeout(timer.current);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);if(engineRef.current===engine)engineRef.current=null;};
 },[client,userId,config,defaults,localView]);
 const update=useCallback(changes=>{
  if(sessionRef.current){try{if(!engineRef.current?.ready)throw new Error('La base est en cours de chargement ou inaccessible. Vos données locales restent conservées.');engineRef.current.edit(changes);setStorageError('');}catch(e){setStorageError(e.message);}return;}
  const next={...tripRef.current,...(typeof changes==='function'?changes(tripRef.current):changes)};tripRef.current=next;setTrip(next);
  try{localStorage.setItem('pinehurst-trip-v1',JSON.stringify(next));setStorageError('');}catch{setStorageError('La sauvegarde locale est indisponible. Exportez vos données avant de fermer cette page.');}
 },[]);
 async function configure(value){const checked=validateCloudConfig(value);localStorage.setItem('pinehurst-cloud-config',JSON.stringify(checked));setConfig(checked);}
 async function login(email){
  if(location.protocol==='file:')throw new Error('Pour vous connecter, ouvrez le site publié sur Netlify.');
  const {error}=await client.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:location.origin+location.pathname}});
  if(error)throw error;
 }
 async function logout(){const {error}=await client.auth.signOut();if(error)throw error;}
 const draftChanges=()=>{try{if(!localStorage.getItem('pinehurst-trip-v1'))return [];return diffFields(defaults,loadLocal());}catch{return [];}};
 function importDraft(){const changes=draftChanges();if(!changes.length)return;engineRef.current?.edit(current=>{const next=structuredClone(current);for(const p of changes)setField(next,p.path,p.value,p.deleted);return next;});}
 return {trip,update,storageError,cloud:{config,session,sync,configure,login,logout,refresh:()=>engineRef.current?.refresh().then(()=>engineRef.current?.flush()),resolve:local=>{engineRef.current?.resolve(local);engineRef.current?.flush();},draftChanges,importDraft}};
}
