-- 0002 Kategorien.
--
-- Kategorien sind Daten, keine fest einprogrammierte Handwerkerliste. Neue
-- Branchen (Auto, Haushalt, Garten, Freelancer ...) kommen ueber Zeilen in
-- dieser Tabelle dazu, nicht ueber ein Deployment.

CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name       text NOT NULL,
  icon       text,
  parent_id  uuid REFERENCES categories(id) ON DELETE RESTRICT,
  position   integer NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Zwei Ebenen reichen fuer den Start (Handwerk > Sanitaer). Tiefer wird die
  -- Auswahl in der App unuebersichtlich.
  CONSTRAINT categories_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX categories_parent_id_idx ON categories (parent_id, position);
