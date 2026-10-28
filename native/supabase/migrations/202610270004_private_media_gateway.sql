BEGIN;
-- Serve private evidence through the server gateway, which rechecks the
-- requester's current metadata RLS access before streaming bytes. Direct
-- authenticated storage URLs can retain cached access after membership changes.
DROP POLICY amparo_evidence_read ON storage.objects;
COMMIT;
