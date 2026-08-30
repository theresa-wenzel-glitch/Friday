-- 0006 Matching.

-- Entfernung zwischen zwei Koordinaten in Kilometern (Haversine).
-- Bewusst als eigene Funktion statt als Extension: JobFlow soll auf jeder
-- normalen PostgreSQL-Installation laufen, auch ohne PostGIS oder earthdistance.
CREATE OR REPLACE FUNCTION jobflow_distance_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
) RETURNS double precision AS $$
DECLARE
  earth_radius_km constant double precision := 6371.0088;
  d_lat double precision;
  d_lon double precision;
  a double precision;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  d_lat := radians(lat2 - lat1);
  d_lon := radians(lon2 - lon1);
  a := sin(d_lat / 2) ^ 2
     + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ^ 2;
  RETURN earth_radius_km * 2 * asin(least(1, sqrt(a)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE matches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  score       integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  -- Warum dieses Unternehmen vorgeschlagen wird. Als JSON, weil sich die
  -- Faktoren mit den Gewichten weiterentwickeln werden.
  reasons     jsonb NOT NULL DEFAULT '[]'::jsonb,
  distance_km double precision CHECK (distance_km IS NULL OR distance_km >= 0),
  status      text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'NOTIFIED', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Ein Unternehmen wird pro Anfrage genau einmal vorgeschlagen.
  CONSTRAINT matches_unique UNIQUE (request_id, business_id)
);

CREATE INDEX matches_request_idx ON matches (request_id, score DESC);
CREATE INDEX matches_business_idx ON matches (business_id, created_at DESC);
