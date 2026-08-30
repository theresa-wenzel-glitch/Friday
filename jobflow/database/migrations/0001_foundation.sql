-- 0001 Fundament: Hilfsfunktionen und Benutzer.
--
-- gen_random_uuid() ist seit PostgreSQL 13 im Kern enthalten, daher braucht
-- JobFlow keine zusaetzliche Extension.

-- Haelt updated_at aktuell, ohne dass jede Abfrage daran denken muss.
CREATE OR REPLACE FUNCTION jobflow_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- E-Mail-Adressen werden immer klein geschrieben gespeichert; der
  -- UNIQUE-Index arbeitet deshalb direkt auf der Spalte.
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  -- scrypt-Hash inklusive Salt und Parametern. Nie das Klartextpasswort.
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('CUSTOMER', 'BUSINESS', 'BUSINESS_EMPLOYEE', 'ADMIN')),
  phone         text,
  -- Gesetzt, sobald ein Konto gesperrt wurde. Gesperrte Konten koennen sich
  -- nicht anmelden und bestehende Sessions werden verworfen.
  blocked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_empty CHECK (length(email) > 0),
  CONSTRAINT users_name_not_empty CHECK (length(name) > 0)
);

CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION jobflow_touch_updated_at();

-- Sessions liegen in der Datenbank, damit eine Abmeldung sofort wirkt und
-- gesperrte Konten wirklich ausgesperrt sind. Ein reines JWT koennte das nicht.
CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SHA-256 des Tokens. Wer die Datenbank liest, kann sich damit nicht anmelden.
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
