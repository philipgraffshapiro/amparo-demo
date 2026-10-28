BEGIN;
-- INSERT ... RETURNING needs a policy that can read the new owner's row
-- without looking it up through a STABLE function's earlier snapshot.
ALTER POLICY amparo_family_read ON public.amparo_family_cases
  USING (owner_id=(SELECT auth.uid()) OR public.amparo_case_access(id));
COMMIT;
