import { supabase } from './lib/supabase';

/**
 * Script de test pour vérifier la connexion à Supabase
 */
export async function testSupabaseConnection() {
  console.log('🔍 Test de connexion à Supabase...\n');

  try {
    // Test 1: Vérifier la configuration
    console.log('✅ Configuration Supabase chargée');
    console.log('   URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('   Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Présente' : '✗ Manquante');
    console.log('');

    // Test 2: Vérifier la connexion à la base de données
    console.log('🔌 Test de connexion à la base de données...');
    const { data, error } = await supabase
      .from('proformas')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Erreur de connexion:', error.message);
      console.log('');
      console.log('💡 Solutions possibles:');
      console.log('   1. Vérifier que les tables ont été créées (exécuter supabase-schema.sql)');
      console.log('   2. Vérifier que les clés API sont correctes dans .env');
      console.log('   3. Vérifier que le projet Supabase est actif');
      return false;
    }

    console.log('✅ Connexion à la base de données réussie');
    console.log('');

    // Test 3: Vérifier les tables
    console.log('📋 Vérification des tables...');
    
    const tables = ['company_settings', 'proformas'];
    let allTablesExist = true;

    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count')
        .limit(1);

      if (tableError) {
        console.log(`   ❌ Table "${table}" non trouvée`);
        allTablesExist = false;
      } else {
        console.log(`   ✅ Table "${table}" existe`);
      }
    }

    console.log('');

    if (!allTablesExist) {
      console.log('⚠️  Certaines tables sont manquantes');
      console.log('💡 Exécuter le script supabase-schema.sql dans l\'éditeur SQL de Supabase');
      return false;
    }

    // Test 4: Vérifier l'authentification
    console.log('🔐 Test du système d\'authentification...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('✅ Session active trouvée');
      console.log('   Utilisateur:', session.user.email);
    } else {
      console.log('ℹ️  Aucune session active (normal si non connecté)');
    }

    console.log('');
    console.log('🎉 Tous les tests sont passés avec succès !');
    console.log('✨ Supabase est correctement configuré et connecté');
    
    return true;

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return false;
  }
}

// Exporter aussi une version qui peut être appelée depuis la console
(window as any).testSupabase = testSupabaseConnection;
