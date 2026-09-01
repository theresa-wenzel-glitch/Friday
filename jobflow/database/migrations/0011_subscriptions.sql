-- 0011 Abonnements und Verbrauch.
--
-- JobFlow kennt drei Arten von Geld, und sie werden bewusst getrennt geführt:
--
--   1. Abo:            Betrieb  ->  JobFlow   (diese Migration)
--   2. Auftrag:        Kunde    ->  Betrieb   (läuft am Marktplatz vorbei,
--                                              solange keine Treuhand besteht)
--   3. Vermittlung:    JobFlow behält ggf. einen Anteil aus 2.
--
-- Vermischt man sie in einer Tabelle, wird die Buchhaltung später nicht mehr
-- auseinanderzuhalten sein.

CREATE TABLE subscription_plans (
  -- Der Schlüssel steht auch im Code; die Tabelle macht Preise änderbar,
  -- ohne dass ein Deployment nötig wird.
  code               text PRIMARY KEY CHECK (code IN ('FREE', 'PRO', 'BUSINESS')),
  name               text NOT NULL,
  -- Preis in Cent, wie überall bei JobFlow.
  price_cents        integer NOT NULL CHECK (price_cents >= 0),
  currency           char(3) NOT NULL DEFAULT 'EUR',
  -- Wie viele Angebote der Betrieb je Abrechnungsmonat abgeben darf.
  -- NULL bedeutet unbegrenzt.
  monthly_offer_limit integer CHECK (monthly_offer_limit IS NULL OR monthly_offer_limit > 0),
  -- Welche Funktionen freigeschaltet sind.
  ai_assistant       boolean NOT NULL DEFAULT false,
  calendar           boolean NOT NULL DEFAULT false,
  statistics         boolean NOT NULL DEFAULT false,
  multi_user         boolean NOT NULL DEFAULT false,
  position           integer NOT NULL DEFAULT 0,
  active             boolean NOT NULL DEFAULT true
);

CREATE TABLE subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_code          text NOT NULL REFERENCES subscription_plans(code) ON DELETE RESTRICT,
  status             text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'INCOMPLETE')),
  -- Kennungen beim Zahlungsanbieter. Niemals Kartendaten, niemals IBAN:
  -- JobFlow speichert ausschließlich diese Verweise.
  provider           text,
  provider_customer_id     text,
  provider_subscription_id text,
  -- Laufender Abrechnungszeitraum. Daran hängt der Verbrauchszähler.
  period_start       timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  period_end         timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_period_order CHECK (period_start < period_end)
);

CREATE TRIGGER subscriptions_touch_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION jobflow_touch_updated_at();

-- Ein Betrieb hat höchstens ein aktives Abo. Der Teilindex erzwingt das in
-- der Datenbank, nicht nur in der Anwendungslogik.
CREATE UNIQUE INDEX subscriptions_one_active_per_business
  ON subscriptions (business_id) WHERE status IN ('ACTIVE', 'PAST_DUE');

CREATE INDEX subscriptions_provider_idx
  ON subscriptions (provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;

-- Verbrauch je Betrieb und Abrechnungsmonat.
--
-- Bewusst eine eigene Zeile statt eines Zählers am Betrieb: so bleibt
-- nachvollziehbar, wie viel in welchem Monat verbraucht wurde, und der
-- Monatswechsel setzt nichts zurück, was jemand später noch braucht.
CREATE TABLE usage_periods (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  -- Erster Tag des Abrechnungsmonats.
  period_start  date NOT NULL,
  offers_sent   integer NOT NULL DEFAULT 0 CHECK (offers_sent >= 0),
  ai_calls      integer NOT NULL DEFAULT 0 CHECK (ai_calls >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usage_periods_unique UNIQUE (business_id, period_start)
);

CREATE INDEX usage_periods_business_idx ON usage_periods (business_id, period_start DESC);

-- Ereignisse des Zahlungsanbieters.
--
-- Jedes eingehende Webhook-Ereignis wird protokolliert, bevor es wirkt. Zwei
-- Gründe: Anbieter senden dasselbe Ereignis mehrfach, und bei einem Streit
-- über eine Zahlung ist das hier die einzige Spur.
CREATE TABLE payment_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL,
  -- Kennung beim Anbieter. UNIQUE macht die Verarbeitung wiederholbar:
  -- ein zweites Mal dasselbe Ereignis ändert nichts.
  external_id   text NOT NULL,
  type          text NOT NULL,
  payload       jsonb NOT NULL,
  processed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_events_unique UNIQUE (provider, external_id)
);

CREATE INDEX payment_events_unprocessed_idx
  ON payment_events (created_at) WHERE processed_at IS NULL;
