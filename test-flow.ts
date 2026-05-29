import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadCompanySettings, saveCompanySettings, loadProformas, saveProforma } from './src/lib/supabase-helpers';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTestFlow() {
  console.log('\n=== DÉBUT DU TEST DU FLUX DE BOUT EN BOUT ===');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  
  try {
    // 1. Inscription
    console.log(`\n1. Inscription de l'utilisateur: ${testEmail}...`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Test User',
          company: 'Test Company'
        }
      }
    });

    if (signUpError) {
      console.error('❌ Échec de l\'inscription:', signUpError.message);
      return;
    }
    
    const user = signUpData.user;
    if (!user) {
      console.error('❌ Aucun utilisateur retourné après inscription');
      return;
    }
    console.log('✅ Inscription réussie. ID utilisateur:', user.id);

    // 2. Connexion pour être sûr d'avoir une session active
    console.log('\n2. Connexion de l\'utilisateur...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('❌ Échec de la connexion:', signInError.message);
      return;
    }
    console.log('✅ Connexion réussie. Session active.');

    // 3. Sauvegarde des paramètres de l'entreprise
    console.log('\n3. Sauvegarde des paramètres d\'entreprise...');
    const testSettings = {
      name: 'Entreprise Test SAS',
      address: '456 Rue de l\'Innovation, Paris',
      email: testEmail,
      phone: '+33123456789',
      siret: '12345678901234',
      siren: '123456789',
      rcs: 'RCS Paris B 123 456 789'
    };

    const saveSettingsResult = await saveCompanySettings(user.id, testSettings);
    if (!saveSettingsResult.success) {
      console.error('❌ Échec de la sauvegarde des paramètres:', saveSettingsResult.error);
      return;
    }
    console.log('✅ Paramètres d\'entreprise sauvegardés avec succès.');

    // 4. Chargement des paramètres de l'entreprise
    console.log('\n4. Chargement des paramètres d\'entreprise...');
    const loadedSettings = await loadCompanySettings(user.id);
    if (!loadedSettings) {
      console.error('❌ Impossible de charger les paramètres d\'entreprise (retourne null)');
    } else {
      console.log('✅ Paramètres d\'entreprise chargés avec succès:', loadedSettings);
    }

    // 5. Sauvegarde d'un proforma
    console.log('\n5. Sauvegarde d\'un proforma de test...');
    const testProforma = {
      id: `test-pf-${Date.now()}`,
      type: 'PROFORMA' as const,
      number: 'PF-TEST-001',
      date: new Date().toISOString(),
      client: {
        name: 'Client de Test',
        phone: '+33699887766'
      },
      items: [
        {
          id: 'item-1',
          description: 'Prestation de test',
          quantity: 2,
          unitPrice: 500
        }
      ],
      discountPercent: 10,
      total: 900
    };

    const saveProformaResult = await saveProforma(user.id, testProforma);
    if (!saveProformaResult.success) {
      console.error('❌ Échec de la sauvegarde du proforma:', saveProformaResult.error);
    } else {
      console.log('✅ Proforma sauvegardé avec succès.');
    }

    // 6. Chargement des proformas
    console.log('\n6. Chargement des proformas...');
    const loadedProformas = await loadProformas(user.id);
    console.log(`✅ Nombre de proformas chargés: ${loadedProformas.length}`);
    if (loadedProformas.length > 0) {
      console.log('   Détail du premier proforma:', loadedProformas[0]);
    }

    // 7. Nettoyage de l'utilisateur de test (si possible)
    // L'API anon ne peut pas supprimer d'utilisateur de auth.users, mais on s'en fiche pour ce test.
    
    console.log('\n=== TOUS LES TESTS DU FLUX SONT TERMINÉS ===');
  } catch (err) {
    console.error('❌ Erreur inattendue lors du test du flux:', err);
  }
}

runTestFlow();
