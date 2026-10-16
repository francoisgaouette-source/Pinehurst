import {readFile} from 'node:fs/promises';
import {validateCloudConfig} from '../src/cloud-config.js';
const config=JSON.parse(await readFile(new URL('../public/cloud-config.json',import.meta.url),'utf8'));
if(config.supabaseUrl||config.publishableKey)validateCloudConfig(config);
if(process.env.VITE_SUPABASE_URL||process.env.VITE_SUPABASE_PUBLISHABLE_KEY)validateCloudConfig({supabaseUrl:process.env.VITE_SUPABASE_URL,publishableKey:process.env.VITE_SUPABASE_PUBLISHABLE_KEY});
console.log(config.supabaseUrl||process.env.VITE_SUPABASE_URL?'Configuration publique Supabase validée.':'Base non configurée : le site indiquera le mode local.');
