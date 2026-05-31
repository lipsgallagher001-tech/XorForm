-- ==========================================
-- OPTIMISATION: Création d'index pour accélérer les requêtes
-- ==========================================
-- Date: 31 Mai 2026
-- Objectif: Accélérer le chargement des données de 5-10x
-- Durée d'exécution: < 1 seconde
-- ==========================================

-- Index sur proformas (user_id + date DESC)
-- Accélère le chargement de l'historique trié par date
CREATE INDEX IF NOT EXISTS idx_proformas_user_date 
ON proformas(user_id, date DESC);

-- Index sur proformas (user_id + type)
-- Accélère le filtrage par type (PROFORMA/FACTURE)
CREATE INDEX IF NOT EXISTS idx_proformas_user_type 
ON proformas(user_id, type);

-- Index sur proformas (user_id + number)
-- Accélère la recherche par numéro
CREATE INDEX IF NOT EXISTS idx_proformas_user_number 
ON proformas(user_id, number);

-- Index sur company_settings (user_id)
-- Accélère le chargement des paramètres entreprise
CREATE INDEX IF NOT EXISTS idx_company_settings_user 
ON company_settings(user_id);

-- ==========================================
-- VÉRIFICATION: Afficher les index créés
-- ==========================================

SELECT 
  schemaname AS "Schéma",
  tablename AS "Table",
  indexname AS "Index",
  indexdef AS "Définition"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('proformas', 'company_settings')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ==========================================
-- RÉSULTAT ATTENDU
-- ==========================================
-- ✅ 4 index créés
-- ✅ Requêtes 5-10x plus rapides
-- ✅ Chargement initial: 0.2-0.5s (au lieu de 2-3s)
-- ==========================================
