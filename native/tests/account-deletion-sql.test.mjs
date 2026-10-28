import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const caseId = '44444444-4444-4444-8444-444444444444';

test(
  'deletion locks writes, preserves other accounts and removes personal rows',
  { timeout: 30000 },
  async (t) => {
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,owner_id text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO authenticated;
    GRANT SELECT,INSERT,DELETE ON storage.objects TO authenticated;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
    INSERT INTO auth.users VALUES ('${owner}'),('${other}');`);
    for (const file of [
      '202610270001_public_data.sql',
      '202610270002_family_media.sql',
      '202610270003_family_case_readback.sql',
      '202610270004_private_media_gateway.sql',
      '202610280001_account_deletion.sql',
    ])
      await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
    await db.exec(`INSERT INTO public.amparo_family_cases(id,owner_id,label) VALUES ('${caseId}','${owner}','Owned case');
    INSERT INTO public.amparo_family_members(case_id,user_id,role,accepted_at) VALUES ('${caseId}','${other}','editor',now());
    INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES ('amparo-evidence','${owner}/photo.png','${owner}'),('amparo-evidence','${other}/keep.png','${other}');
    SET ROLE authenticated; SET request.jwt.claim.sub='${owner}';`);
    await assert.rejects(
      db.query('SELECT public.amparo_begin_deletion($1)', [other]),
      /permission denied/,
    );
    await db.exec('RESET ROLE');
    await db.query('SELECT public.amparo_begin_deletion($1)', [owner]);
    assert.deepEqual(
      (
        await db.query('SELECT * FROM public.amparo_deletion_objects($1)', [
          owner,
        ])
      ).rows.map((row) => row.name),
      [owner + '/photo.png'],
    );
    await assert.rejects(
      db.query('SELECT public.amparo_erase_account_data($1)', [owner]),
      /Storage cleanup required/,
    );
    await db.exec(
      `SET ROLE authenticated; SET request.jwt.claim.sub='${owner}';`,
    );
    await assert.rejects(
      db.query(
        'INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES ($1,$2,$3)',
        ['amparo-evidence', owner + '/late.png', owner],
      ),
      /row-level security/,
    );
    await db.exec(`SET request.jwt.claim.sub='${other}';`);
    await assert.rejects(
      db.query(
        'INSERT INTO public.amparo_family_events(case_id,author_id,stage,note) VALUES ($1,$2,$3,$4)',
        [caseId, other, 'reported', 'Late shared update'],
      ),
      /row-level security/,
    );
    await db.exec(
      `RESET ROLE; DELETE FROM storage.objects WHERE owner_id='${owner}';`,
    );
    await db.query('SELECT public.amparo_erase_account_data($1)', [owner]);
    await db.query('DELETE FROM auth.users WHERE id=$1', [owner]);
    assert.equal(
      (await db.query('SELECT * FROM public.amparo_family_cases')).rows.length,
      0,
    );
    assert.deepEqual(
      (await db.query('SELECT id FROM auth.users')).rows.map((row) => row.id),
      [other],
    );
    assert.deepEqual(
      (await db.query('SELECT name FROM storage.objects')).rows.map(
        (row) => row.name,
      ),
      [other + '/keep.png'],
    );
  },
);
