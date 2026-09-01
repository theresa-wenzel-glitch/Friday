-- Die drei Pakete.
--
-- Die Preise sind ausdrücklich Hypothesen: erst echte Nutzer zeigen, welche
-- Zahlungsbereitschaft besteht. Sie stehen deshalb in der Datenbank und nicht
-- im Code - eine Preisänderung ist eine Zeile, kein Deployment.
--
-- Alle Beträge in Cent.

INSERT INTO subscription_plans
  (code, name, price_cents, monthly_offer_limit, ai_assistant, calendar, statistics, multi_user, position)
VALUES
  ('FREE',     'Free',     0,    5,    false, false, false, false, 10),
  ('PRO',      'Pro',      2900, 50,   true,  true,  true,  false, 20),
  ('BUSINESS', 'Business', 7900, NULL, true,  true,  true,  true,  30)
ON CONFLICT (code) DO UPDATE SET
  name                = EXCLUDED.name,
  price_cents         = EXCLUDED.price_cents,
  monthly_offer_limit = EXCLUDED.monthly_offer_limit,
  ai_assistant        = EXCLUDED.ai_assistant,
  calendar            = EXCLUDED.calendar,
  statistics          = EXCLUDED.statistics,
  multi_user          = EXCLUDED.multi_user,
  position            = EXCLUDED.position;
