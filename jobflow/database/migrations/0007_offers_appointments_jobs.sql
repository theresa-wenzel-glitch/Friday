-- 0007 Angebote, Termine, Aufträge.

CREATE TABLE offers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id              uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  business_id             uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  -- Alle Beträge in Cent.
  labor_cents             integer NOT NULL CHECK (labor_cents >= 0),
  material_cents          integer NOT NULL DEFAULT 0 CHECK (material_cents >= 0),
  travel_cents            integer NOT NULL DEFAULT 0 CHECK (travel_cents >= 0),
  -- Immer die Summe der drei Positionen. Als generierte Spalte, damit die
  -- Summe gar nicht erst von der Anwendung abweichen kann.
  total_cents             integer GENERATED ALWAYS AS (labor_cents + material_cents + travel_cents) STORED,
  description             text NOT NULL CHECK (length(description) > 0),
  -- Kennzeichnet, ob der Text aus einem KI-Vorschlag stammt. Über Preis und
  -- Inhalt entscheidet immer das Unternehmen, nie die KI.
  description_ai_assisted boolean NOT NULL DEFAULT false,
  valid_until             timestamptz NOT NULL,
  status                  text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  -- Ein Unternehmen gibt pro Anfrage ein Angebot ab.
  CONSTRAINT offers_unique UNIQUE (request_id, business_id)
);

CREATE TRIGGER offers_touch_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION jobflow_touch_updated_at();

CREATE INDEX offers_request_idx ON offers (request_id, created_at DESC);
CREATE INDEX offers_business_idx ON offers (business_id, created_at DESC);

-- Pro Anfrage darf höchstens ein Angebot angenommen sein. Der Teilindex
-- erzwingt das in der Datenbank statt nur in der Anwendungslogik.
CREATE UNIQUE INDEX offers_one_accepted_per_request
  ON offers (request_id) WHERE status = 'ACCEPTED';

CREATE TABLE appointments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id   uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time   timestamptz NOT NULL,
  status     text NOT NULL DEFAULT 'PROPOSED'
    CHECK (status IN ('PROPOSED', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_order CHECK (start_time < end_time)
);

CREATE TRIGGER appointments_touch_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION jobflow_touch_updated_at();

CREATE INDEX appointments_offer_idx ON appointments (offer_id);
CREATE INDEX appointments_start_idx ON appointments (start_time);

-- Ein aktiver Termin pro Angebot; abgesagte bleiben zur Nachvollziehbarkeit stehen.
CREATE UNIQUE INDEX appointments_one_active_per_offer
  ON appointments (offer_id) WHERE status IN ('PROPOSED', 'CONFIRMED');

CREATE TABLE jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id     uuid NOT NULL UNIQUE REFERENCES offers(id) ON DELETE CASCADE,
  -- request_id, business_id und customer_id wären über offer herleitbar.
  -- Sie stehen hier trotzdem, weil praktisch jede Abfrage auf Aufträge nach
  -- genau diesen drei Feldern filtert.
  request_id   uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_completed_consistent
    CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE TRIGGER jobs_touch_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION jobflow_touch_updated_at();

CREATE INDEX jobs_customer_idx ON jobs (customer_id, created_at DESC);
CREATE INDEX jobs_business_idx ON jobs (business_id, created_at DESC);
CREATE INDEX jobs_request_idx ON jobs (request_id);
