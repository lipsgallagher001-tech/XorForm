-- ============================================================================
-- Script de correction RLS pour company_settings
-- ============================================================================
-- Ce script corrige les problèmes de Row Level Security (RLS) qui empêchent
-- le chargement des paramètres d'entreprise depuis Supabase.
-- ============================================================================

-- Étape 1 : Vérifier l'état actuel de RLS
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Activé"
FROM pg_tables 
WHERE tablename = 'company_settings';

-- Étape 2 : Vérifier les policies existantes
-- ============================================================================
SELECT 
    policyname as "Nom de la Policy",
    cmd as "Commande",
    qual as "Condition",
    with_check as "Vérification"
FROM pg_policies 
WHERE tablename = 'company_settings';

-- Étape 3 : Supprimer les anciennes policies (si elles existent)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON company_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON company_settings;

-- Étape 4 : Activer RLS sur la table
-- ============================================================================
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Étape 5 : Créer les policies correctes
-- ============================================================================

-- Policy SELECT : Permettre aux utilisateurs de lire leurs propres paramètres
CREATE POLICY "Users can view their own settings"
ON company_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Policy INSERT : Permettre aux utilisateurs de créer leurs propres paramètres
CREATE POLICY "Users can insert their own settings"
ON company_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE : Permettre aux utilisateurs de modifier leurs propres paramètres
CREATE POLICY "Users can update their own settings"
ON company_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy DELETE : Permettre aux utilisateurs de supprimer leurs propres paramètres
CREATE POLICY "Users can delete their own settings"
ON company_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Étape 6 : Vérifier que les policies ont été créées
-- ============================================================================
SELECT 
    policyname as "Nom de la Policy",
    cmd as "Commande",
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ Lecture'
        WHEN cmd = 'INSERT' THEN '✅ Création'
        WHEN cmd = 'UPDATE' THEN '✅ Modification'
        WHEN cmd = 'DELETE' THEN '✅ Suppression'
    END as "Type"
FROM pg_policies 
WHERE tablename = 'company_settings'
ORDER BY cmd;

-- Étape 7 : Tester la lecture des paramètres
-- ============================================================================
-- Cette requête devrait retourner vos paramètres si tout fonctionne
SELECT 
    user_id,
    name,
    email,
    created_at,
    updated_at
FROM company_settings
WHERE user_id = auth.uid();

-- ============================================================================
-- OPTION ALTERNATIVE : Désactiver temporairement RLS pour tester
-- ============================================================================
-- ⚠️ ATTENTION : Ceci désactive la sécurité ! À utiliser UNIQUEMENT pour tester
-- ⚠️ Ne PAS utiliser en production !
-- 
-- Pour désactiver RLS temporairement :
-- ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
--
-- Pour réactiver RLS après le test :
-- ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC : Vérifier les user_id
-- ============================================================================
-- Cette requête affiche tous les user_id dans company_settings
-- et l'user_id de l'utilisateur connecté
SELECT 
    'User connecté' as source,
    auth.uid() as user_id
UNION ALL
SELECT 
    'Paramètres en base' as source,
    user_id
FROM company_settings;

-- ============================================================================
-- CORRECTION : Si les user_id ne correspondent pas
-- ============================================================================
-- Si vous voyez que les user_id sont différents, vous pouvez les corriger :
-- 
-- UPDATE company_settings 
-- SET user_id = auth.uid()
-- WHERE user_id = 'ANCIEN_USER_ID';
--
-- Remplacez 'ANCIEN_USER_ID' par l'ancien user_id affiché dans le diagnostic
-- ============================================================================

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
-- Après avoir exécuté ce script :
-- 1. Vérifiez que les 4 policies sont créées (SELECT, INSERT, UPDATE, DELETE)
-- 2. Vérifiez que le user_id correspond entre auth.uid() et company_settings
-- 3. Rechargez votre application et vérifiez la console (F12)
-- 4. Les paramètres devraient maintenant se charger correctement
-- ============================================================================
