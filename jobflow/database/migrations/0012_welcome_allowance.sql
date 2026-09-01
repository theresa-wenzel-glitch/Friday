-- 0012 Willkommensguthaben.
--
-- Ein enges Free-Paket wirkt nur dann, wenn der Betrieb vorher erlebt hat,
-- wofür er zahlen soll. Wer nie einen Auftrag über JobFlow gewonnen hat, wechselt
-- nicht auf Pro - er geht.
--
-- Deshalb: im ersten Kalendermonat ein höheres Guthaben, danach das enge.
-- NULL bedeutet, dass es keinen Unterschied gibt.
ALTER TABLE subscription_plans
  ADD COLUMN first_month_offer_limit integer
    CHECK (first_month_offer_limit IS NULL OR first_month_offer_limit > 0);

COMMENT ON COLUMN subscription_plans.first_month_offer_limit IS
  'Guthaben im ersten Kalendermonat eines Betriebs. NULL = wie monthly_offer_limit.';
