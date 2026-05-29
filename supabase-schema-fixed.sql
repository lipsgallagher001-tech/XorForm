-- ============================================
-- SCHÉMA SUPABASE POUR XORFORM (CORRIGÉ)
-- À exécuter dans le SQL Editor de Supabase
-- ============================================

-- Supprimer les anciennes tables si elles existent (ATTENTION: perte de données)
-- DROP TABLE IF EXISTS proformas CASCADE;
-- DROP TABLE IF EXISTS company_settings CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- TABLE: company_settings
-- Paramètres d'entreprise pour chaque utilisateur
-- ============================================
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Mon Entreprise',
  address TEXT NOT NULL DEFAULT '123 Rue du Commerce, Paris',
  email TEXT NOT NULL DEFAULT 'contact@entreprise.fr',
  phone TEXT NOT NULL DEFAULT '01 23 45 67 89',
  logo TEXT,
  logo_width NUMERIC DEFAULT 15,
  logo_height NUMERIC DEFAULT 15,
  signature TEXT,
  signature_width NUMERIC DEFAULT 35,
  signature_height NUMERIC DEFAULT 25,
  stamp TEXT,
  stamp_width NUMERIC DEFAULT 35,
  stamp_height NUMERIC DEFAULT 25,
  watermark TEXT,
  services TEXT,
  siret TEXT,
  siren TEXT,
  rcs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- TABLE: proformas
-- Proformas et factures
-- ============================================
CREATE TABLE IF NOT EXISTS proformas (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PROFORMA', 'FACTURE')),
  number TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  items JSONB NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEX pour améliorer les performances
-- ============================================
CREATE INDEX IF NOT EXISTS idx_proformas_user_id ON proformas(user_id);
CREATE INDEX IF NOT EXISTS idx_proformas_date ON proformas(date DESC);
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);

-- ============================================
-- ACTIVER ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE proformas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITIQUES RLS pour company_settings
-- ============================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can delete their own company settings" ON company_settings;

-- Créer les nouvelles politiques
CREATE POLICY "Users can view their own company settings" 
  ON company_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company settings" 
  ON company_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings" 
  ON company_settings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company settings" 
  ON company_settings FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- POLITIQUES RLS pour proformas
-- ============================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view their own proformas" ON proformas;
DROP POLICY IF EXISTS "Users can insert their own proformas" ON proformas;
DROP POLICY IF EXISTS "Users can update their own proformas" ON proformas;
DROP POLICY IF EXISTS "Users can delete their own proformas" ON proformas;

-- Créer les nouvelles politiques
CREATE POLICY "Users can view their own proformas" 
  ON proformas FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proformas" 
  ON proformas FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proformas" 
  ON proformas FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proformas" 
  ON proformas FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- FONCTION pour mettre à jour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS pour updated_at
-- ============================================

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
DROP TRIGGER IF EXISTS update_proformas_updated_at ON proformas;

-- Créer les nouveaux triggers
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proformas_updated_at
  BEFORE UPDATE ON proformas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Exécutez ces requêtes pour vérifier que tout fonctionne:

-- SELECT * FROM company_settings;
-- SELECT * FROM proformas;

-- Pour voir les politiques RLS:
-- SELECT * FROM pg_policies WHERE tablename IN ('company_settings', 'proformas');
