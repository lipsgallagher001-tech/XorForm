-- ============================================================================
-- XORFORM - Script d'Initialisation Base de Données
-- ============================================================================
-- Version: 3.0.0
-- Date: 29 Mai 2026
-- Description: Script complet pour créer et configurer la base de données
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: NETTOYAGE (Supprimer les anciennes tables si elles existent)
-- ============================================================================

-- Désactiver temporairement RLS pour éviter les erreurs 406
ALTER TABLE IF EXISTS company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proformas DISABLE ROW LEVEL SECURITY;

-- Supprimer les tables existantes (CASCADE supprime automatiquement les policies)
DROP TABLE IF EXISTS proformas CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;

-- Supprimer les fonctions si elles existent
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- ÉTAPE 2: CRÉATION DES TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: company_settings
-- Description: Paramètres d'entreprise pour chaque utilisateur
-- ----------------------------------------------------------------------------
CREATE TABLE company_settings (
  -- Identifiants
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
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_siret CHECK (siret IS NULL OR siret ~ '^\d{14}$'),
  CONSTRAINT valid_siren CHECK (siren IS NULL OR siren ~ '^\d{9}$')
);

-- Commentaires
COMMENT ON TABLE company_settings IS 'Paramètres d''entreprise pour chaque utilisateur';
COMMENT ON COLUMN company_settings.user_id IS 'Référence vers auth.users';
COMMENT ON COLUMN company_settings.logo IS 'Logo en base64';
COMMENT ON COLUMN company_settings.signature IS 'Signature en base64';
COMMENT ON COLUMN company_settings.stamp IS 'Cachet en base64';

-- ----------------------------------------------------------------------------
-- Table: proformas
-- Description: Proformas et factures générées par les utilisateurs
-- ----------------------------------------------------------------------------
CREATE TABLE proformas (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Type de document
  type VARCHAR(10) NOT NULL CHECK (type IN ('PROFORMA', 'FACTURE')),
  
  -- Informations du document
  number VARCHAR(50) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Informations client
  client_name VARCHAR(200) NOT NULL,
  client_phone VARCHAR(50),
  
  -- Contenu (JSON)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Calculs
  discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT unique_user_number UNIQUE(user_id, number)
);

-- Commentaires
COMMENT ON TABLE proformas IS 'Proformas et factures générées';
COMMENT ON COLUMN proformas.type IS 'Type: PROFORMA ou FACTURE';
COMMENT ON COLUMN proformas.items IS 'Articles au format JSON: [{id, description, quantity, unitPrice}]';
COMMENT ON COLUMN proformas.discount_percent IS 'Pourcentage de réduction (0-100)';

-- ============================================================================
-- ÉTAPE 3: CRÉATION DES INDEX (Performance)
-- ============================================================================

-- Index sur company_settings
CREATE INDEX idx_company_settings_user_id ON company_settings(user_id);

-- Index sur proformas
CREATE INDEX idx_proformas_user_id ON proformas(user_id);
CREATE INDEX idx_proformas_date ON proformas(date DESC);
CREATE INDEX idx_proformas_number ON proformas(number);
CREATE INDEX idx_proformas_type ON proformas(type);
CREATE INDEX idx_proformas_items ON proformas USING GIN (items);

-- ============================================================================
-- ÉTAPE 4: ACTIVATION DE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur les tables
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE proformas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 5: CRÉATION DES POLICIES RLS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Policies pour company_settings
-- ----------------------------------------------------------------------------

-- SELECT: Les utilisateurs peuvent voir leurs propres paramètres
CREATE POLICY "Users can view their own settings"
ON company_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Les utilisateurs peuvent créer leurs propres paramètres
CREATE POLICY "Users can insert their own settings"
ON company_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Les utilisateurs peuvent modifier leurs propres paramètres
CREATE POLICY "Users can update their own settings"
ON company_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Les utilisateurs peuvent supprimer leurs propres paramètres
CREATE POLICY "Users can delete their own settings"
ON company_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Policies pour proformas
-- ----------------------------------------------------------------------------

-- SELECT: Les utilisateurs peuvent voir leurs propres proformas
CREATE POLICY "Users can view their own proformas"
ON proformas
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Les utilisateurs peuvent créer leurs propres proformas
CREATE POLICY "Users can insert their own proformas"
ON proformas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Les utilisateurs peuvent modifier leurs propres proformas
CREATE POLICY "Users can update their own proformas"
ON proformas
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Les utilisateurs peuvent supprimer leurs propres proformas
CREATE POLICY "Users can delete their own proformas"
ON proformas
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- ÉTAPE 6: FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
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

-- Vérifier que les tables sont créées
SELECT 
  'company_settings' as table_name,
  COUNT(*) as row_count
FROM company_settings
UNION ALL
SELECT 
  'proformas' as table_name,
  COUNT(*) as row_count
FROM proformas;

-- Vérifier que RLS est activé
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Activé"
FROM pg_tables 
WHERE tablename IN ('company_settings', 'proformas')
ORDER BY tablename;

-- Vérifier les policies
SELECT 
  tablename as "Table",
  policyname as "Policy",
  cmd as "Commande"
FROM pg_policies 
WHERE tablename IN ('company_settings', 'proformas')
ORDER BY tablename, cmd;

-- Vérifier les indexes
SELECT 
  tablename as "Table",
  indexname as "Index"
FROM pg_indexes 
WHERE tablename IN ('company_settings', 'proformas')
ORDER BY tablename, indexname;

-- ============================================================================
-- ÉTAPE 8: DONNÉES DE TEST (OPTIONNEL - Décommenter si besoin)
-- ============================================================================

/*
-- Insérer des paramètres de test
INSERT INTO company_settings (
  user_id,
  name,
  address,
  email,
  phone
) VALUES (
  auth.uid(),
  'XOR COMMUNICATION',
  '123 Rue de Test, 75001 Paris',
  'contact@xorcom.fr',
  '01 23 45 67 89'
);

-- Insérer un proforma de test
INSERT INTO proformas (
  user_id,
  type,
  number,
  date,
  client_name,
  client_phone,
  items,
  discount_percent,
  total
) VALUES (
  auth.uid(),
  'PROFORMA',
  'PF-2026-001',
  NOW(),
  'Client Test',
  '06 12 34 56 78',
  '[
    {
      "id": "1",
      "description": "Service de test",
      "quantity": 1,
      "unitPrice": 1000
    }
  ]'::jsonb,
  0,
  1000
);
*/

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Base de données initialisée avec succès !';
  RAISE NOTICE '📊 Tables créées: company_settings, proformas';
  RAISE NOTICE '🔒 RLS activé avec 8 policies';
  RAISE NOTICE '⚡ 6 indexes créés pour la performance';
  RAISE NOTICE '🔄 Triggers updated_at configurés';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prochaines étapes:';
  RAISE NOTICE '1. Vérifier les résultats ci-dessus';
  RAISE NOTICE '2. Tester la connexion depuis l''application';
  RAISE NOTICE '3. Créer vos paramètres d''entreprise';
END $$;

