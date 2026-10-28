BEGIN;
CREATE TABLE amparo_private.pending_deletions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE amparo_private.pending_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON amparo_private.pending_deletions FROM PUBLIC,anon,authenticated;
GRANT ALL ON amparo_private.pending_deletions TO service_role;
CREATE INDEX amparo_cases_owner ON public.amparo_family_cases(owner_id);
CREATE INDEX amparo_media_owner ON public.amparo_report_media(owner_id);
CREATE INDEX amparo_media_case ON public.amparo_report_media(case_id);

CREATE FUNCTION public.amparo_account_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id=(SELECT auth.uid()))
    AND NOT EXISTS(SELECT 1 FROM amparo_private.pending_deletions WHERE user_id=(SELECT auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.amparo_account_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.amparo_account_active() TO authenticated;

CREATE OR REPLACE FUNCTION public.amparo_case_access(target uuid, write_access boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.amparo_family_cases c WHERE c.id=target
    AND NOT EXISTS(SELECT 1 FROM amparo_private.pending_deletions d WHERE d.user_id=c.owner_id)
    AND (c.owner_id=(SELECT auth.uid()) OR EXISTS(
      SELECT 1 FROM public.amparo_family_members m WHERE m.case_id=c.id
      AND m.user_id=(SELECT auth.uid()) AND m.accepted_at IS NOT NULL
      AND (NOT write_access OR m.role='editor'))));
$$;
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['amparo_profiles','amparo_subscriptions','amparo_family_cases','amparo_family_members','amparo_family_events','amparo_report_media'] LOOP
    EXECUTE format('CREATE POLICY amparo_active_account ON public.%I AS RESTRICTIVE TO authenticated USING (public.amparo_account_active()) WITH CHECK (public.amparo_account_active())',name);
  END LOOP;
END $$;
CREATE POLICY amparo_active_storage ON storage.objects AS RESTRICTIVE TO authenticated
  USING (bucket_id NOT IN ('amparo-evidence','amparo-approved-media') OR public.amparo_account_active())
  WITH CHECK (bucket_id NOT IN ('amparo-evidence','amparo-approved-media') OR public.amparo_account_active());

CREATE FUNCTION public.amparo_begin_deletion(target uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  INSERT INTO amparo_private.pending_deletions(user_id)
  SELECT id FROM auth.users WHERE id=target ON CONFLICT(user_id) DO NOTHING;
$$;
CREATE FUNCTION public.amparo_deletion_objects(target uuid)
RETURNS TABLE(bucket_id text,name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT o.bucket_id,o.name FROM storage.objects o
  WHERE o.bucket_id IN ('amparo-evidence','amparo-approved-media')
    AND EXISTS(SELECT 1 FROM amparo_private.pending_deletions d WHERE d.user_id=target)
    AND (o.owner_id=target::text OR split_part(o.name,'/',1)=target::text OR EXISTS(
      SELECT 1 FROM public.amparo_report_media m JOIN public.amparo_family_cases c ON c.id=m.case_id
      WHERE c.owner_id=target AND m.object_key=o.name))
  ORDER BY o.bucket_id,o.name LIMIT 100;
$$;
CREATE FUNCTION public.amparo_erase_account_data(target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM amparo_private.pending_deletions WHERE user_id=target) THEN
    RAISE EXCEPTION 'Deletion has not been requested';
  END IF;
  IF EXISTS(SELECT 1 FROM public.amparo_deletion_objects(target)) THEN
    RAISE EXCEPTION 'Storage cleanup required';
  END IF;
  DELETE FROM amparo_private.report_submissions WHERE user_id=target;
  DELETE FROM public.amparo_family_events WHERE author_id=target;
  DELETE FROM public.amparo_family_members WHERE user_id=target;
  DELETE FROM public.amparo_report_media WHERE owner_id=target;
  DELETE FROM public.amparo_family_cases WHERE owner_id=target;
  DELETE FROM public.amparo_subscriptions WHERE user_id=target;
  DELETE FROM public.amparo_profiles WHERE user_id=target;
END;
$$;
REVOKE ALL ON FUNCTION public.amparo_begin_deletion(uuid),public.amparo_deletion_objects(uuid),public.amparo_erase_account_data(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.amparo_begin_deletion(uuid),public.amparo_deletion_objects(uuid),public.amparo_erase_account_data(uuid) TO service_role;
COMMIT;
