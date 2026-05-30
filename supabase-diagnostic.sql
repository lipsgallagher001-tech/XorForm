-- ============================================================================
-- DIAGNOSTIC SUPABASE - XorForm
-- ============================================================================
-- Exécutez ce script pour diagnostiquer les problèmes
-- ============================================================================

-- 1. Vérifier si les tables existent
SELECT 
  'Tables existantes' as "Diagnostic",
  string_agg(tablename, ', ') as "Résultat"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('company_settings', 'proformas');

-- 2. Vérifier si RLS est activé
SELECT 
  'RLS Status' as "Diagnostic",
  tablename as "Table",
  CASE WHEN rowsecurity THEN '✅ Activé' ELSE '❌ Désactivé' END as "État"
FROM pg_tables 
WHERE tablename IN ('company_settings', 'proformas')
ORDER BY tablename;

-- 3. Compter les policies
SELECT 
  'Nombre de Policies' as "Diagnostic",
  tablename as "Table",
  COUNT(*) as "Nombre"
FROM pg_policies 
WHERE tablename IN ('company_settings', 'proformas')
GROUP BY tablename
ORDER BY tablename;

-- 4. Lister toutes les policies
SELECT 
  'Liste des Policies' as "Diagnostic",
  tablename as "Table",
  policyname as "Policy",
  cmd as "Commande",
  roles::text as "Rôles"
FROM pg_policies 
WHERE tablename IN ('company_settings', 'proformas')
ORDER BY tablename, cmd;

-- 5. Vérifier les indexes
SELECT 
  'Indexes' as "Diagnostic",
  tablename as "Table",
  indexname as "Index"
FROM pg_indexes 
WHERE tablename IN ('company_settings', 'proformas')
ORDER BY tablename, indexname;

-- 6. Compter les données
SELECT 
  'Nombre de lignes' as "Diagnostic",
  'company_settings' as "Table",
  COUNT(*) as "Lignes"
FROM company_settings
UNION ALL
SELECT 
  'Nombre de lignes' as "Diagnostic",
  'proformas' as "Table",
  COUNT(*) as "Lignes"
FROM proformas;

-- 7. Vérifier l'utilisateur actuel
SELECT 
  'Utilisateur actuel' as "Diagnostic",
  auth.uid() as "User ID",
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ Non authentifié'
    ELSE '✅ Authentifié'
  END as "État";

-- 8. Vérifier les données de l'utilisateur actuel
SELECT 
  'Mes données' as "Diagnostic",
  'company_settings' as "Table",
  COUNT(*) as "Mes lignes"
FROM company_settings
WHERE user_id = auth.uid()
UNION ALL
SELECT 
  'Mes données' as "Diagnostic",
  'proformas' as "Table",
  COUNT(*) as "Mes lignes"
FROM proformas
WHERE user_id = auth.uid();

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

DO $$
DECLARE
  tables_exist INTEGER;
  rls_enabled INTEGER;
  policies_count INTEGER;
  user_authenticated BOOLEAN;
BEGIN
  -- Compter les tables
  SELECT COUNT(*) INTO tables_exist
  FROM pg_tables 
  WHERE tablename IN ('company_settings', 'proformas');
  
  -- Compter RLS activé
  SELECT COUNT(*) INTO rls_enabled
  FROM pg_tables 
  WHERE tablename IN ('company_settings', 'proformas')
    AND rowsecurity = true;
  
  -- Compter les policies
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies 
  WHERE tablename IN ('company_settings', 'proformas');
  
  -- Vérifier authentification
  user_authenticated := auth.uid() IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DU DIAGNOSTIC';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables créées: % / 2', tables_exist;
  RAISE NOTICE 'RLS activé: % / 2', rls_enabled;
  RAISE NOTICE 'Policies créées: % / 8', policies_count;
  RAISE NOTICE 'Utilisateur authentifié: %', CASE WHEN user_authenticated THEN '✅ OUI' ELSE '❌ NON' END;
  RAISE NOTICE '';
  
  IF tables_exist < 2 THEN
    RAISE NOTICE '❌ PROBLÈME: Tables manquantes';
    RAISE NOTICE '   → Exécutez supabase-init-simple.sql';
  END IF;
  
  IF rls_enabled < 2 THEN
    RAISE NOTICE '❌ PROBLÈME: RLS non activé';
    RAISE NOTICE '   → Exécutez supabase-init-simple.sql';
  END IF;
  
  IF policies_count < 8 THEN
    RAISE NOTICE '❌ PROBLÈME: Policies manquantes (% / 8)', policies_count;
    RAISE NOTICE '   → Exécutez supabase-init-simple.sql';
  END IF;
  
  IF NOT user_authenticated THEN
    RAISE NOTICE '⚠️ ATTENTION: Non authentifié';
    RAISE NOTICE '   → Connectez-vous à l''application d''abord';
  END IF;
  
  IF tables_exist = 2 AND rls_enabled = 2 AND policies_count = 8 THEN
    RAISE NOTICE '✅ TOUT EST OK !';
    RAISE NOTICE '   → Videz le cache et rechargez l''application';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
