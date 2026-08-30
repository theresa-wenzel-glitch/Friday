-- 0003 Unternehmen, Leistungen, Mitarbeiter und Verfuegbarkeit.

CREATE TABLE businesses (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name                 text NOT NULL CHECK (length(name) > 0),
  description          text,
  verified             boolean NOT NULL DEFAULT false,
  verified_at          timestamptz,
  -- Aggregat aus reviews. Wird beim Anlegen einer Bewertung fortgeschrieben,
  -- damit das Matching nicht bei jeder Anfrage alle Bewertungen lesen muss.
  rating               numeric(3, 2) CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  review_count         integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  latitude             double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude            double precision CHECK (longitude BETWEEN -180 AND 180),
  service_radius_km    integer NOT NULL DEFAULT 30 CHECK (service_radius_km BETWEEN 1 AND 300),
  avg_response_minutes integer CHECK (avg_response_minutes IS NULL OR avg_response_minutes >= 0),
  completed_job_count  integer NOT NULL DEFAULT 0 CHECK (completed_job_count >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  -- Eine halbe Koordinate ist wertlos.
  CONSTRAINT businesses_coordinates_complete
    CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CONSTRAINT businesses_verified_at_consistent
    CHECK ((verified = false AND verified_at IS NULL) OR (verified = true AND verified_at IS NOT NULL))
);

CREATE TRIGGER businesses_touch_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION jobflow_touch_updated_at();

-- Grobfilter fuer das Matching: erst ueber das Rechteck vorselektieren,
-- danach die genaue Entfernung berechnen.
CREATE INDEX businesses_location_idx ON businesses (latitude, longitude)
  WHERE latitude IS NOT NULL;

CREATE TABLE business_services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id      uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name             text NOT NULL CHECK (length(name) > 0),
  description      text,
  -- Preise in Cent. Geld gehoert nie in eine Gleitkommazahl.
  price_min_cents  integer CHECK (price_min_cents IS NULL OR price_min_cents >= 0),
  price_max_cents  integer CHECK (price_max_cents IS NULL OR price_max_cents >= 0),
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_services_price_range
    CHECK (price_min_cents IS NULL OR price_max_cents IS NULL OR price_min_cents <= price_max_cents),
  -- Ein Unternehmen bietet eine Kategorie genau einmal an.
  CONSTRAINT business_services_unique_category UNIQUE (business_id, category_id)
);

CREATE INDEX business_services_category_idx ON business_services (category_id) WHERE active;

CREATE TABLE business_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_members_unique UNIQUE (business_id, user_id)
);

CREATE INDEX business_members_user_idx ON business_members (user_id);

-- Woechentlich wiederkehrende Verfuegbarkeit. Der Kunde bekommt spaeter nur
-- Zeitfenster angeboten, die hier hinterlegt sind.
CREATE TABLE business_availability (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  CONSTRAINT business_availability_order CHECK (start_time < end_time),
  CONSTRAINT business_availability_unique UNIQUE (business_id, weekday, start_time, end_time)
);

CREATE INDEX business_availability_business_idx ON business_availability (business_id, weekday);
