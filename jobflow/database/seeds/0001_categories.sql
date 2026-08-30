-- Startkategorien.
--
-- Das sind Ausgangsdaten, keine feste Struktur: spaeter werden Kategorien
-- ueber die Administration gepflegt. Die Seeds sind idempotent, ein zweiter
-- Lauf aendert nichts.

INSERT INTO categories (slug, name, icon, parent_id, position) VALUES
  ('handwerk',         'Handwerk',           '🔨', NULL, 10),
  ('auto',             'Auto',               '🚗', NULL, 20),
  ('haushalt',         'Haushalt',           '🏠', NULL, 30),
  ('garten',           'Garten',             '🌳', NULL, 40),
  ('dienstleistungen', 'Dienstleistungen',   '📸', NULL, 50),
  ('lernen',           'Lernen',             '📚', NULL, 60)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (slug, name, icon, parent_id, position)
SELECT v.slug, v.name, v.icon, p.id, v.position
FROM (VALUES
  ('sanitaer',     'Sanitaer',            '🚿', 'handwerk', 10),
  ('elektrik',     'Elektrik',            '💡', 'handwerk', 20),
  ('heizung',      'Heizung',             '🔥', 'handwerk', 30),
  ('maler',        'Maler',               '🎨', 'handwerk', 40),
  ('dach',         'Dach',                '🏘️', 'handwerk', 50),
  ('schreiner',    'Schreiner',           '🪚', 'handwerk', 60),
  ('schluessel',   'Schluesseldienst',    '🔑', 'handwerk', 70),

  ('kfz-reparatur', 'Reparatur',          '🔧', 'auto', 10),
  ('kfz-reifen',    'Reifen',             '🛞', 'auto', 20),
  ('kfz-inspektion','Inspektion',         '📋', 'auto', 30),

  ('reinigung',    'Reinigung',           '🧽', 'haushalt', 10),
  ('umzug',        'Umzug',               '📦', 'haushalt', 20),
  ('montage',      'Moebelmontage',       '🪛', 'haushalt', 30),

  ('gartenpflege', 'Gartenpflege',        '✂️', 'garten', 10),
  ('gartenbau',    'Gartengestaltung',    '🌱', 'garten', 20),
  ('baumpflege',   'Baumpflege',          '🌲', 'garten', 30),

  ('fotografie',   'Fotografie',          '📷', 'dienstleistungen', 10),
  ('tierbetreuung','Tierbetreuung',       '🐕', 'dienstleistungen', 20),
  ('veranstaltung','Veranstaltung',       '🎪', 'dienstleistungen', 30),

  ('nachhilfe',    'Nachhilfe',           '✏️', 'lernen', 10),
  ('musik',        'Musikunterricht',     '🎸', 'lernen', 20),
  ('sprachen',     'Sprachen',            '🗣️', 'lernen', 30)
) AS v(slug, name, icon, parent_slug, position)
JOIN categories p ON p.slug = v.parent_slug
ON CONFLICT (slug) DO NOTHING;
