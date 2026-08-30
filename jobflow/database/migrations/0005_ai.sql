-- 0005 KI-Analysen und Rueckfragen.
--
-- Die KI schreibt nie direkt in die Datenbank. Ihr Ergebnis geht durch die
-- Validierung im Backend und landet erst danach hier.

CREATE TABLE ai_analyses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  summary     text NOT NULL CHECK (length(summary) > 0),
  urgency     text NOT NULL CHECK (urgency IN ('LOW', 'NORMAL', 'HIGH')),
  confidence  numeric(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  -- Welcher Provider das Ergebnis erzeugt hat, z. B. "rules@1". Damit laesst
  -- sich spaeter nachvollziehen, welches Modell welche Qualitaet geliefert hat.
  provider    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Eine Anfrage kann mehrfach analysiert werden (z. B. nach Rueckfragen);
-- die juengste Analyse zaehlt.
CREATE INDEX ai_analyses_request_idx ON ai_analyses (request_id, created_at DESC);

CREATE TABLE ai_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES ai_analyses(id) ON DELETE CASCADE,
  position    integer NOT NULL CHECK (position >= 0),
  question    text NOT NULL CHECK (length(question) > 0),
  answer      text,
  answered_at timestamptz,
  CONSTRAINT ai_questions_unique_position UNIQUE (analysis_id, position),
  CONSTRAINT ai_questions_answer_consistent
    CHECK ((answer IS NULL AND answered_at IS NULL) OR (answer IS NOT NULL AND answered_at IS NOT NULL))
);

CREATE INDEX ai_questions_analysis_idx ON ai_questions (analysis_id, position);
