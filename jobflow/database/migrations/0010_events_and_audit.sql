-- 0010 Produktereignisse und Protokoll.

-- Funnel-Ereignisse. Bewusst ohne personenbezogene Freitexte: wir wollen
-- wissen, wo Nutzer abspringen, nicht was sie geschrieben haben.
CREATE TABLE analytics_events (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  request_id  uuid REFERENCES requests(id) ON DELETE SET NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  properties  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_name_idx ON analytics_events (name, created_at DESC);
CREATE INDEX analytics_events_request_idx ON analytics_events (request_id) WHERE request_id IS NOT NULL;

-- Protokoll sicherheitsrelevanter Aktionen (Anmeldung, Sperrung, Verifizierung,
-- Angebotsannahme). Wird nur geschrieben, nie geaendert.
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text,
  entity_id   uuid,
  -- Auf /24 bzw. /48 gekuerzte IP-Adresse: genug fuer Missbrauchserkennung,
  -- ohne einen vollstaendigen Bewegungsverlauf zu speichern.
  ip_prefix   text,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_actor_idx ON audit_log (actor_id, created_at DESC);
CREATE INDEX audit_log_action_idx ON audit_log (action, created_at DESC);
