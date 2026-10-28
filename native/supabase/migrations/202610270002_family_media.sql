BEGIN;

CREATE TABLE public.amparo_family_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 120),
  report_reference text,
  next_check_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.amparo_family_members (
  case_id uuid NOT NULL REFERENCES public.amparo_family_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('viewer','editor')),
  accepted_at timestamptz,
  PRIMARY KEY(case_id,user_id)
);
CREATE TABLE public.amparo_family_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.amparo_family_cases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  stage text NOT NULL CHECK (stage IN ('reported','contacted','located','supported','resolved')),
  note text NOT NULL CHECK (length(note) BETWEEN 8 AND 800),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX amparo_family_events_case_time ON public.amparo_family_events(case_id,created_at);
CREATE INDEX amparo_family_members_user ON public.amparo_family_members(user_id,case_id);

CREATE TABLE public.amparo_report_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  case_id uuid REFERENCES public.amparo_family_cases(id) ON DELETE CASCADE,
  report_reference text,
  object_key text NOT NULL UNIQUE CHECK (object_key LIKE owner_id::text || '/%'),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  byte_size bigint NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.amparo_family_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amparo_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amparo_family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amparo_report_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.amparo_family_cases,public.amparo_family_members,
  public.amparo_family_events,public.amparo_report_media FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.amparo_family_cases TO authenticated;
GRANT SELECT,DELETE ON public.amparo_family_members TO authenticated;
GRANT INSERT(case_id,user_id,role),UPDATE(role) ON public.amparo_family_members TO authenticated;
GRANT SELECT,INSERT ON public.amparo_family_events TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.amparo_report_media TO authenticated;
GRANT ALL ON public.amparo_family_cases,public.amparo_family_members,
  public.amparo_family_events,public.amparo_report_media TO service_role;

CREATE FUNCTION public.amparo_case_access(target uuid, write_access boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.amparo_family_cases c
    WHERE c.id=target AND c.owner_id=(SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.amparo_family_members m
    WHERE m.case_id=target AND m.user_id=(SELECT auth.uid())
    AND m.accepted_at IS NOT NULL AND (NOT write_access OR m.role='editor'));
$$;
REVOKE ALL ON FUNCTION public.amparo_case_access(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.amparo_case_access(uuid,boolean) TO authenticated,service_role;

CREATE FUNCTION public.amparo_accept_invitation(target uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.amparo_family_members SET accepted_at=now()
  WHERE case_id=target AND user_id=(SELECT auth.uid()) AND accepted_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.amparo_accept_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.amparo_accept_invitation(uuid) TO authenticated;

CREATE POLICY amparo_family_read ON public.amparo_family_cases FOR SELECT TO authenticated
  USING (public.amparo_case_access(id));
CREATE POLICY amparo_family_create ON public.amparo_family_cases FOR INSERT TO authenticated
  WITH CHECK (owner_id=(SELECT auth.uid()));
CREATE POLICY amparo_family_update ON public.amparo_family_cases FOR UPDATE TO authenticated
  USING (owner_id=(SELECT auth.uid())) WITH CHECK (owner_id=(SELECT auth.uid()));
CREATE POLICY amparo_family_delete ON public.amparo_family_cases FOR DELETE TO authenticated
  USING (owner_id=(SELECT auth.uid()));
CREATE POLICY amparo_members_read ON public.amparo_family_members FOR SELECT TO authenticated
  USING (user_id=(SELECT auth.uid()) OR public.amparo_case_access(case_id));
CREATE POLICY amparo_members_manage ON public.amparo_family_members TO authenticated
  USING (EXISTS (SELECT 1 FROM public.amparo_family_cases c WHERE c.id=case_id AND c.owner_id=(SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.amparo_family_cases c WHERE c.id=case_id AND c.owner_id=(SELECT auth.uid())));
CREATE POLICY amparo_events_read ON public.amparo_family_events FOR SELECT TO authenticated
  USING (public.amparo_case_access(case_id));
CREATE POLICY amparo_events_append ON public.amparo_family_events FOR INSERT TO authenticated
  WITH CHECK (author_id=(SELECT auth.uid()) AND public.amparo_case_access(case_id,true));
CREATE POLICY amparo_media_read ON public.amparo_report_media FOR SELECT TO authenticated
  USING (owner_id=(SELECT auth.uid()) OR public.amparo_case_access(case_id));
CREATE POLICY amparo_media_insert ON public.amparo_report_media FOR INSERT TO authenticated
  WITH CHECK (owner_id=(SELECT auth.uid()) AND (case_id IS NULL OR public.amparo_case_access(case_id,true)));
CREATE POLICY amparo_media_delete ON public.amparo_report_media FOR DELETE TO authenticated
  USING (owner_id=(SELECT auth.uid()));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
  ('amparo-evidence','amparo-evidence',false,5242880,ARRAY['image/jpeg','image/png','image/webp']),
  ('amparo-approved-media','amparo-approved-media',true,5242880,ARRAY['image/jpeg','image/png','image/webp']);

CREATE POLICY amparo_evidence_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='amparo-evidence' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY amparo_evidence_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='amparo-evidence' AND ((storage.foldername(name))[1]=(SELECT auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.amparo_report_media m WHERE m.object_key=name AND public.amparo_case_access(m.case_id))));
CREATE POLICY amparo_evidence_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='amparo-evidence' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);

-- No authenticated write policy for approved public media. A trusted service
-- must strip metadata, check rights and review the copy before publication.
COMMIT;
