-- 0008 Chat.
--
-- Jede Kombination aus Anfrage und Unternehmen bekommt genau eine Konversation.
-- So bleibt der Verlauf am Auftrag haengen und nicht an zwei Personen.

CREATE TABLE conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_unique UNIQUE (request_id, business_id)
);

CREATE INDEX conversations_customer_idx ON conversations (customer_id, last_message_at DESC NULLS LAST);
CREATE INDEX conversations_business_idx ON conversations (business_id, last_message_at DESC NULLS LAST);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (length(body) > 0),
  -- Muss in der Oberflaeche sichtbar gemacht werden: KI-Texte duerfen nicht
  -- aussehen, als haette sie ein Mensch geschrieben.
  is_ai_generated boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at);
