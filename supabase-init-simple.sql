-- ============================================================================
-- XORFORM - Script d'Initialisation SIMPLIFIÉ
-- ============================================================================
-- Version: 3.1.0
-- Date: 30 Mai 2026
-- Description: Script simplifié sans erreurs
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: NETTOYAGE COMPLET
-- ============================================================================

-- Supprimer les tables (CASCADE supprime tout automatiquement)
DROP TABLE IF EXISTS proformas CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- ÉTAPE 2: CRÉATION DES TABLES
-- ============================================================================

-- Table: company_settings
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informations de base (REQUIS)
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  
  -- Images (base64, OPTIONNEL)
  logo TEXT,
  logo_width NUMERIC(5,2) DEFAULT 15,
  logo_height NUMERIC(5,2) DEFAULT 15,
  
  signature TEXT,
  signature_width NUMERIC(5,2) DEFAULT 35,
  signature_height NUMERIC(5,2) DEFAULT 25,
  
  stamp TEXT,
  stamp_width NUMERIC(5,2) DEFAULT 35,
  stamp_height NUMERIC(5,2) DEFAULT 25,
  
  -- Informations supplémentaires (OPTIONNEL)
  watermark VARCHAR(50),
  services TEXT,
  
  -- Informations légales (OPTIONNEL)
  siret VARCHAR(14),
  siren VARCHAR(9),
  rcs VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT unique_user_settings UNIQUE(user_id),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Table: proformas
CREATE TABLE proformas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type VARCHAR(10) NOT NULL CHECK (type IN ('PROFORMA', 'FACTURE')),
  number VARCHAR(50) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  client_name VARCHAR(200) NOT NULL,
  client_phone VARCHAR(50),
  
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_number UNIQUE(user_id, number)
);

-- ============================================================================
-- ÉTAPE 3: CRÉATION DES INDEX
-- ============================================================================

CREATE INDEX idx_company_settings_user_id ON company_settings(user_id);
CREATE INDEX idx_proformas_user_id ON proformas(user_id);
CREATE INDEX idx_proformas_date ON proformas(date DESC);
CREATE INDEX idx_proformas_number ON proformas(number);
CREATE INDEX idx_proformas_type ON proformas(type);
CREATE INDEX idx_proformas_items ON proformas USING GIN (items);

-- ============================================================================
-- ÉTAPE 4: ACTIVATION DE RLS
-- ============================================================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE proformas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 5: CRÉATION DES POLICIES (SIMPLIFIÉES)
-- ============================================================================

-- Policies pour company_settings (ACCÈS COMPLET pour utilisateurs authentifiés)
CREATE POLICY "company_settings_select" ON company_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "company_settings_insert" ON company_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "company_settings_update" ON company_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "company_settings_delete" ON company_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies pour proformas (ACCÈS COMPLET pour utilisateurs authentifiés)
CREATE POLICY "proformas_select" ON proformas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "proformas_insert" ON proformas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proformas_update" ON proformas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proformas_delete" ON proformas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- ÉTAPE 6: FONCTION POUR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proformas_updated_at
  BEFORE UPDATE ON proformas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ÉTAPE 7: VÉRIFICATION
-- ============================================================================

-- Vérifier les tables
SELECT 'company_settings' as table_name, COUNT(*) as row_count FROM company_settings
UNION ALL
SELECT 'proformas' as table_name, COUNT(*) as row_count FROM proformas;

-- Vérifier RLS
SELECT tablename, rowsecurity as "RLS Activé"
FROM pg_tables 
WHERE tablename IN ('company_settings', 'proformas')
ORDER BY tablename;

-- Vérifier les policies
SELECT tablename as "Table", policyname as "Policy", cmd as "Commande"
FROM pg_policies 
WHERE tablename IN ('company_settings', 'proformas')
ORDER BY tablename, cmd;

-- Vérifier les indexes
SELECT tablename as "Table", indexname as "Index"
FROM pg_indexes 
WHERE tablename IN ('company_settings', 'proformas')
ORDER BY tablename, indexname;

-- ============================================================================
-- MESSAGE DE SUCCÈS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Base de données initialisée avec succès !';
  RAISE NOTICE '📊 Tables créées: company_settings, proformas';
  RAISE NOTICE '🔒 RLS activé avec 8 policies';
  RAISE NOTICE '⚡ 6 indexes créés';
  RAISE NOTICE '🔄 Triggers configurés';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prochaines étapes:';
  RAISE NOTICE '1. Vider le cache: localStorage.clear() dans la console';
  RAISE NOTICE '2. Recharger la page (F5)';
  RAISE NOTICE '3. Se connecter';
  RAISE NOTICE '4. Configurer les paramètres entreprise';
END $$;
