BEGIN;

CREATE SCHEMA IF NOT EXISTS amparo_private;
REVOKE ALL ON SCHEMA amparo_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA amparo_private TO service_role;

CREATE TABLE public.amparo_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  documentation_url text,
  source_scope text,
  last_success_at timestamptz,
  health jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.amparo_items (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES public.amparo_sources(id),
  external_id text NOT NULL,
  version_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('policy','news','media','statistic','reference','community_report')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 2000),
  url text,
  published_value text,
  date_precision text NOT NULL DEFAULT 'unknown' CHECK (date_precision IN ('day','instant','unknown')),
  observed_at timestamptz,
  area_id text,
  language text,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload)='object'),
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, external_id)
);
CREATE INDEX amparo_items_area_kind ON public.amparo_items(area_id,kind,review_status);

CREATE TABLE public.amparo_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','es')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.amparo_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (topic IN ('news','policy','community_report')),
  area_id text CHECK (area_id IS NULL OR area_id ~ '^US-[0-9]{5}$'),
  channel text NOT NULL DEFAULT 'in-app' CHECK (channel IN ('in-app','push','email','sms')),
  consent_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX amparo_subscriptions_user ON public.amparo_subscriptions(user_id);
CREATE UNIQUE INDEX amparo_unique_active_subscription ON public.amparo_subscriptions
  (user_id,topic,coalesce(area_id,''),channel) WHERE active;

CREATE TABLE amparo_private.captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.amparo_sources(id),
  origin text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  fetched_at timestamptz NOT NULL,
  object_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE amparo_private.report_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL UNIQUE,
  received_at timestamptz NOT NULL DEFAULT now(),
  observed_at timestamptz NOT NULL,
  area_id text NOT NULL CHECK (area_id ~ '^US-[0-9]{5}$'),
  consent_at timestamptz NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected'))
);

CREATE TABLE amparo_private.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.amparo_subscriptions(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES public.amparo_items(id),
  version_id text NOT NULL,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','sending','delivered','failed','cancelled')),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  provider_receipt text,
  payload jsonb NOT NULL,
  UNIQUE(subscription_id,item_id,version_id)
);

ALTER TABLE public.amparo_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amparo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amparo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amparo_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE amparo_private.captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE amparo_private.report_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE amparo_private.notification_outbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.amparo_sources, public.amparo_items,
  public.amparo_profiles, public.amparo_subscriptions FROM anon, authenticated;
GRANT SELECT ON public.amparo_sources, public.amparo_items TO anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.amparo_profiles, public.amparo_subscriptions TO authenticated;
GRANT ALL ON public.amparo_sources, public.amparo_items,
  public.amparo_profiles, public.amparo_subscriptions TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA amparo_private TO service_role;

CREATE POLICY amparo_sources_read ON public.amparo_sources FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY amparo_items_read ON public.amparo_items FOR SELECT TO anon,authenticated USING (review_status='approved');
CREATE POLICY amparo_profiles_owner ON public.amparo_profiles TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY amparo_subscriptions_owner ON public.amparo_subscriptions TO authenticated
  USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);

COMMIT;
