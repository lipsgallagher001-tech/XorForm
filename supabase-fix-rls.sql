-- Script de correction pour les politiques RLS
-- À exécuter dans l'éditeur SQL de Supabase

-- Désactiver temporairement RLS pour tester
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE proformas DISABLE ROW LEVEL SECURITY;

-- OU si tu veux garder RLS activé, supprime les anciennes politiques et recrée-les

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can delete their own company settings" ON company_settings;

DROP POLICY IF EXISTS "Users can view their own proformas" ON proformas;
DROP POLICY IF EXISTS "Users can insert their own proformas" ON proformas;
DROP POLICY IF EXISTS "Users can update their own proformas" ON proformas;
DROP POLICY IF EXISTS "Users can delete their own proformas" ON proformas;

-- Recréer les politiques avec auth.uid() qui fonctionne avec Supabase Auth
CREATE POLICY "Enable all for authenticated users" ON company_settings
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable all for authenticated users" ON proformas
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Réactiver RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE proformas ENABLE ROW LEVEL SECURITY;
