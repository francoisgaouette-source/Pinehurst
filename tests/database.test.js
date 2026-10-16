import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('database SQL: invitations, RLS, atomic writes and stale-version conflicts',async()=>{
 const db=new PGlite();
 try{
  await db.exec([
   'create role anon; create role authenticated; create schema auth;',
   "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
   "create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;",
   'grant usage on schema auth to anon,authenticated;'
  ].join('\n'));
  const sql=await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8');
  await db.exec(sql);await db.exec(sql);
  await db.exec("insert into pinehurst_private.members(email) values ('member@example.com')");
  await db.exec('set role anon');
  await assert.rejects(()=>db.query('select * from public.pinehurst_read()'),/permission denied/);
  await db.exec("reset role; set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);select set_config('request.jwt.claims','{\"email\":\"outsider@example.com\"}',false);");
  await assert.rejects(()=>db.query('select * from public.pinehurst_read()'),/réservé/);
  assert.equal((await db.query('select * from public.pinehurst_fields')).rows.length,0);
  await assert.rejects(()=>db.query('select * from pinehurst_private.members'),/permission denied/);
  await db.exec("select set_config('request.jwt.claims','{\"email\":\"member@example.com\"}',false);");
  const patch=(path,value,expectedVersion=null)=>({path,value,expectedVersion,deleted:false});
  const save=changes=>db.query('select * from public.pinehurst_apply($1::jsonb)',[JSON.stringify(changes)]);
  assert.equal(Number((await save([patch(['scores','Simon St-Denis','0'],'35')])).rows[0].version),1);
  await assert.rejects(()=>save([patch(['scores','Simon St-Denis','0'],'99')]),/autre appareil/);
  assert.equal((await db.query('select * from public.pinehurst_read()')).rows[0].value,'35');
  await assert.rejects(()=>save([patch(['notes'],'must roll back'),patch(['scores','Simon St-Denis','0'],'99')]),/autre appareil/);
  assert.equal((await db.query('select * from public.pinehurst_fields')).rows.length,1);
  assert.equal(Number((await save([patch(['scores','Simon St-Denis','0'],'40',1)])).rows[0].version),2);
  await assert.rejects(()=>save([patch(['scores','__proto__','polluted'],'bad')]),/invalide/);
  await assert.rejects(()=>db.query("update public.pinehurst_fields set value='\"bypass\"'::jsonb"),/permission denied/);
  await db.exec("select set_config('request.jwt.claims','{\"email\":\"outsider@example.com\"}',false);");
  assert.equal((await db.query('select * from public.pinehurst_fields')).rows.length,0);
 }finally{await db.close();}
});
