-- 0009 Bewertungen.

CREATE TABLE reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Genau eine Bewertung pro Auftrag. Ohne abgeschlossenen Auftrag keine
  -- Bewertung - das ist der einfachste wirksame Schutz gegen Fake-Rezensionen.
  job_id      uuid NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_business_idx ON reviews (business_id, created_at DESC);
