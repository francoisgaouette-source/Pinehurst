export function validateCloudConfig(config){
 const url=new URL(String(config.supabaseUrl||'').trim());
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw new Error('Entrez l’URL HTTPS du projet Supabase.');
 if(url.hostname==='jqgsjaktksnodagdnpij.supabase.co')throw new Error('Utilisez un projet Pinehurst distinct de Scotland.');
 const key=String(config.publishableKey||'').trim();
 let role='';try{role=JSON.parse(atob(key.split('.')[1])).role;}catch{}
 if(key.startsWith('sb_secret_')||role==='service_role')throw new Error('N’utilisez jamais la clé secrète ou service_role dans le site. Choisissez la clé publishable.');
 if(!key.startsWith('sb_publishable_')&&role!=='anon')throw new Error('La clé doit être publique : publishable ou ancienne clé anon.');
 return {supabaseUrl:url.origin,publishableKey:key};
}
export async function loadCloudConfig(){
 let local;try{local=JSON.parse(localStorage.getItem('pinehurst-cloud-config')||'null');}catch{}
 if(local?.supabaseUrl)return validateCloudConfig(local);
 if(window.__PINEHURST_CLOUD_CONFIG__?.supabaseUrl)return validateCloudConfig(window.__PINEHURST_CLOUD_CONFIG__);
 if(import.meta.env.VITE_SUPABASE_URL)return validateCloudConfig({supabaseUrl:import.meta.env.VITE_SUPABASE_URL,publishableKey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY});
 if(window.__PINEHURST_CLOUD_CONFIG__!==undefined||location.protocol==='file:')return null;
 const response=await fetch(new URL('cloud-config.json',location.href),{cache:'no-store'});
 if(!response.ok)throw new Error('La configuration partagée est indisponible.');
 const config=await response.json();return config.supabaseUrl?validateCloudConfig(config):null;
}
