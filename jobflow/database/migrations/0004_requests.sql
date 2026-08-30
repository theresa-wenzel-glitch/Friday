-- 0004 Anfragen und ihre Fotos.

CREATE TABLE requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Anfangs null: die KI schlaegt die Kategorie erst nach der Analyse vor.
  category_id    uuid REFERENCES categories(id) ON DELETE SET NULL,
  title          text,
  description    text NOT NULL CHECK (length(description) >= 10),
  urgency        text NOT NULL DEFAULT 'NORMAL' CHECK (urgency IN ('LOW', 'NORMAL', 'HIGH')),
  latitude       double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude      double precision CHECK (longitude BETWEEN -180 AND 180),
  -- Grobe Ortsangabe fuer die Anzeige ("45127 Essen"). Die genaue Adresse
  -- braucht erst das Unternehmen, das den Auftrag bekommt.
  location_label text,
  desired_from   timestamptz,
  desired_to     timestamptz,
  status         text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ANALYZING', 'OPEN', 'MATCHING', 'OFFERED', 'ACCEPTED', 'COMPLETED', 'CANCELLED')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT requests_coordinates_complete CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CONSTRAINT requests_desired_range CHECK (desired_from IS NULL OR desired_to IS NULL OR desired_from <= desired_to)
);

CREATE TRIGGER requests_touch_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION jobflow_touch_updated_at();

-- "Meine Anfragen" ist der haeufigste Zugriff der Kunden-App.
CREATE INDEX requests_customer_idx ON requests (customer_id, created_at DESC);
CREATE INDEX requests_status_idx ON requests (status, created_at DESC);
CREATE INDEX requests_category_idx ON requests (category_id) WHERE category_id IS NOT NULL;

CREATE TABLE request_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  -- Schluessel im Object Storage, nie eine oeffentliche URL. Der Zugriff laeuft
  -- immer ueber die API, die vorher die Berechtigung prueft.
  storage_key  text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  byte_size    integer NOT NULL CHECK (byte_size > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX request_photos_request_idx ON request_photos (request_id, created_at);
