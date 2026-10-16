import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudConfig} from '../src/cloud-config.js';
const token=role=>'header.'+btoa(JSON.stringify({role}))+'.signature';
test('public keys accepted, privileged keys and Scotland project rejected',()=>{
 assert.equal(validateCloudConfig({supabaseUrl:'https://pinehurst-example.supabase.co/',publishableKey:'sb_publishable_example'}).supabaseUrl,'https://pinehurst-example.supabase.co');
 assert.equal(validateCloudConfig({supabaseUrl:'https://pinehurst-example.supabase.co',publishableKey:token('anon')}).publishableKey,token('anon'));
 for(const publishableKey of ['sb_secret_never',token('service_role')])assert.throws(()=>validateCloudConfig({supabaseUrl:'https://pinehurst-example.supabase.co',publishableKey}),/secrète/);
 assert.throws(()=>validateCloudConfig({supabaseUrl:'https://jqgsjaktksnodagdnpij.supabase.co',publishableKey:'sb_publishable_example'}),/distinct/);
 assert.throws(()=>validateCloudConfig({supabaseUrl:'http://pinehurst-example.supabase.co',publishableKey:'sb_publishable_example'}),/HTTPS/);
});
