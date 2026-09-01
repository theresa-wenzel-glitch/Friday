-- Die drei Pakete.
--
-- Die Preise und Grenzen sind ausdrücklich Hypothesen: erst echte Nutzer zeigen,
-- welche Zahlungsbereitschaft besteht und wo die Grenze zu eng wird. Sie stehen
-- deshalb in der Datenbank und nicht im Code - eine Änderung ist ein UPDATE,
-- kein Deployment.
--
--   UPDATE subscription_plans SET monthly_offer_limit = 4 WHERE code = 'FREE';
--
-- Alle Beträge in Cent.
--
-- Zum Guthaben von Free: eng genug, dass ein Betrieb mit laufendem Geschäft
-- schnell an die Grenze stößt - großzügig genug im ersten Monat, dass er
-- vorher einen Auftrag gewinnen konnte. Ein Betrieb, der nie einen Auftrag
-- über JobFlow gesehen hat, wechselt nicht auf Pro.

INSERT INTO subscription_plans
  (code, name, price_cents, monthly_offer_limit, first_month_offer_limit,
   ai_assistant, calendar, statistics, multi_user, position)
VALUES
  ('FREE',     'Free',     0,    3,    10,   false, false, false, false, 10),
  ('PRO',      'Pro',      2900, 50,   NULL, true,  true,  true,  false, 20),
  ('BUSINESS', 'Business', 7900, NULL, NULL, true,  true,  true,  true,  30)
ON CONFLICT (code) DO UPDATE SET
  name                    = EXCLUDED.name,
  price_cents             = EXCLUDED.price_cents,
  monthly_offer_limit     = EXCLUDED.monthly_offer_limit,
  first_month_offer_limit = EXCLUDED.first_month_offer_limit,
  ai_assistant            = EXCLUDED.ai_assistant,
  calendar                = EXCLUDED.calendar,
  statistics              = EXCLUDED.statistics,
  multi_user              = EXCLUDED.multi_user,
  position                = EXCLUDED.position;
