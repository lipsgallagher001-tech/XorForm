import { supabase } from './supabase';
import { Proforma, CompanyInfo } from '../types';
import { createError, handleError, ErrorCodes, AppError } from './errors';

/**
 * Fonctions utilitaires pour gérer les données avec Supabase
 */

export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: AppError;
}

// ==================== COMPANY SETTINGS ====================

export async function loadCompanySettings(userId: string): Promise<CompanyInfo | null> {
  try {
    console.log('📥 [LOAD] Chargement des paramètres depuis Supabase...');
    console.log('📥 [LOAD] User ID:', userId);
    
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Logs détaillés pour diagnostic
    console.log('📥 [LOAD] Résultat Supabase:', { 
      hasData: !!data, 
      hasError: !!error,
      dataPreview: data ? { name: data.name, email: data.email } : null
    });

    if (error) {
      console.error('❌ [LOAD] Erreur Supabase détectée:');
      console.error('❌ [LOAD] Code:', error.code);
      console.error('❌ [LOAD] Message:', error.message);
      console.error('❌ [LOAD] Détails:', error.details);
      console.error('❌ [LOAD] Hint:', error.hint);
      
      // Diagnostics spécifiques
      if (error.code === '42501') {
        console.error('🔒 [LOAD] PROBLÈME DE PERMISSIONS RLS !');
        console.error('🔒 [LOAD] Les policies RLS bloquent la lecture.');
        console.error('🔒 [LOAD] Solution: Exécutez fix_company_settings_rls.sql');
      } else if (error.code === '42P01') {
        console.error('🗄️ [LOAD] TABLE NON TROUVÉE !');
        console.error('🗄️ [LOAD] La table company_settings n\'existe pas.');
        console.error('🗄️ [LOAD] Solution: Exécutez supabase-schema-fixed.sql');
      }
      
      throw error;
    }

    if (!data) {
      console.warn('⚠️ [LOAD] Aucun paramètre trouvé pour cet utilisateur');
      console.warn('⚠️ [LOAD] Vérifications à faire:');
      console.warn('⚠️ [LOAD] 1. La ligne existe-t-elle dans company_settings avec ce user_id ?');
      console.warn('⚠️ [LOAD] 2. Les policies RLS SELECT sont-elles configurées ?');
      console.warn('⚠️ [LOAD] 3. Le user_id correspond-il à auth.uid() ?');
      console.warn(`⚠️ [LOAD] User ID recherché: ${userId}`);
      console.warn('⚠️ [LOAD] Solution: Exécutez fix_company_settings_rls.sql');
      return null;
    }

    console.log('📦 [LOAD] Données brutes récupérées:', data);

    // Convertir les données Supabase vers le format CompanyInfo
    const settings: CompanyInfo = {
      name: data.name,
      address: data.address,
      email: data.email,
      phone: data.phone,
      logo: data.logo || undefined,
      logoWidth: data.logo_width || undefined,
      logoHeight: data.logo_height || undefined,
      signature: data.signature || undefined,
      signatureWidth: data.signature_width || undefined,
      signatureHeight: data.signature_height || undefined,
      stamp: data.stamp || undefined,
      stampWidth: data.stamp_width || undefined,
      stampHeight: data.stamp_height || undefined,
      watermark: data.watermark || undefined,
      services: data.services || undefined,
      siret: data.siret || undefined,
      siren: data.siren || undefined,
      rcs: data.rcs || undefined
    };
    
    console.log('✅ [LOAD] Paramètres chargés avec succès depuis Supabase');
    console.log('✅ [LOAD] Nom entreprise:', settings.name);
    console.log('✅ [LOAD] Email:', settings.email);
    return settings;
  } catch (err) {
    const error = handleError(err);
    console.error('❌ [LOAD] Erreur inattendue lors du chargement:');
    console.error('❌ [LOAD] Type:', error.name);
    console.error('❌ [LOAD] Message:', error.message);
    console.error('❌ [LOAD] Code:', error.code);
    console.error('❌ [LOAD] Détails:', error.details);
    
    // Retourner null au lieu de throw pour ne pas bloquer l'app
    console.warn('⚠️ [LOAD] Retour de null - l\'application utilisera les valeurs par défaut');
    return null;
  }
}

export async function saveCompanySettings(
  userId: string, 
  settings: CompanyInfo
): Promise<OperationResult> {
  try {
    console.log('💾 Sauvegarde des paramètres dans Supabase...', { userId, name: settings.name });
    
    const dataToSave = {
      user_id: userId,
      name: settings.name,
      address: settings.address,
      email: settings.email,
      phone: settings.phone,
      logo: settings.logo || null,
      logo_width: settings.logoWidth || 15,
      logo_height: settings.logoHeight || 15,
      signature: settings.signature || null,
      signature_width: settings.signatureWidth || 35,
      signature_height: settings.signatureHeight || 25,
      stamp: settings.stamp || null,
      stamp_width: settings.stampWidth || 35,
      stamp_height: settings.stampHeight || 25,
      watermark: settings.watermark || null,
      services: settings.services || null,
      siret: settings.siret || null,
      siren: settings.siren || null,
      rcs: settings.rcs || null
    };

    // Vérifier si les paramètres existent déjà
    const { data: existing, error: selectError } = await supabase
      .from('company_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    let result;
    if (existing) {
      // Mise à jour
      console.log('🔄 Mise à jour des paramètres existants');
      result = await supabase
        .from('company_settings')
        .update({
          ...dataToSave,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();
    } else {
      // Insertion
      console.log('➕ Insertion de nouveaux paramètres');
      result = await supabase
        .from('company_settings')
        .insert(dataToSave)
        .select();
    }

    if (result.error) {
      throw result.error;
    }

    console.log('✅ Paramètres sauvegardés avec succès dans Supabase');
    return { success: true };
    
  } catch (err) {
    const error = handleError(err);
    console.error('❌ Erreur lors de la sauvegarde:', error);
    return { 
      success: false, 
      error: createError(ErrorCodes.SAVE_FAILED, { 
        userId,
        originalError: error 
      })
    };
  }
}

// ==================== PROFORMAS ====================

export async function loadProformas(userId: string): Promise<Proforma[]> {
  try {
    const { data, error } = await supabase
      .from('proformas')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Erreur lors du chargement des proformas:', error);
      return [];
    }

    if (!data) return [];

    // Convertir les données Supabase vers le format Proforma
    return data.map(item => ({
      id: item.id,
      type: item.type as 'PROFORMA' | 'FACTURE',
      number: item.number,
      date: item.date,
      client: {
        name: item.client_name,
        phone: item.client_phone || ''
      },
      items: typeof item.items === 'string' ? JSON.parse(item.items) : item.items,
      discountPercent: item.discount_percent || 0,
      total: item.total
    }));
  } catch (err) {
    console.error('Erreur inattendue:', err);
    return [];
  }
}

export async function saveProforma(
  userId: string, 
  proforma: Proforma
): Promise<OperationResult> {
  try {
    console.log('💾 Tentative de sauvegarde du proforma...', {
      userId,
      proformaId: proforma.id,
      number: proforma.number,
      clientName: proforma.client.name
    });

    const dataToInsert = {
      id: proforma.id,
      user_id: userId,
      type: proforma.type,
      number: proforma.number,
      date: proforma.date,
      client_name: proforma.client.name,
      client_phone: proforma.client.phone || '',
      items: JSON.stringify(proforma.items),
      discount_percent: proforma.discountPercent || 0,
      total: proforma.total
    };

    console.log('📦 Données à insérer:', dataToInsert);

    // Vérifier si le proforma existe déjà
    const { data: existing } = await supabase
      .from('proformas')
      .select('id')
      .eq('id', proforma.id)
      .single();

    let result;
    if (existing) {
      // Mise à jour
      console.log('🔄 Mise à jour du proforma existant');
      result = await supabase
        .from('proformas')
        .update({
          ...dataToInsert,
          updated_at: new Date().toISOString()
        })
        .eq('id', proforma.id)
        .select();
    } else {
      // Insertion
      console.log('➕ Insertion d\'un nouveau proforma');
      result = await supabase
        .from('proformas')
        .insert(dataToInsert)
        .select();
    }

    if (result.error) {
      throw result.error;
    }

    console.log('✅ Proforma sauvegardé avec succès:', result.data);
    return { success: true, data: result.data };
    
  } catch (err) {
    const error = handleError(err);
    console.error('❌ Erreur lors de la sauvegarde du proforma:', error);
    return { 
      success: false, 
      error: createError(ErrorCodes.SAVE_FAILED, { 
        proformaId: proforma.id,
        originalError: error 
      })
    };
  }
}

export async function deleteProforma(proformaId: string): Promise<OperationResult> {
  try {
    const { error } = await supabase
      .from('proformas')
      .delete()
      .eq('id', proformaId);

    if (error) {
      throw error;
    }

    console.log('✅ Proforma supprimé avec succès');
    return { success: true };
  } catch (err) {
    const error = handleError(err);
    console.error('❌ Erreur lors de la suppression du proforma:', error);
    return { 
      success: false, 
      error: createError(ErrorCodes.DELETE_FAILED, { 
        proformaId,
        originalError: error 
      })
    };
  }
}

export async function deleteMultipleProformas(proformaIds: string[]): Promise<OperationResult> {
  try {
    const { error } = await supabase
      .from('proformas')
      .delete()
      .in('id', proformaIds);

    if (error) {
      throw error;
    }

    console.log(`✅ ${proformaIds.length} proformas supprimés avec succès`);
    return { success: true };
  } catch (err) {
    const error = handleError(err);
    console.error('❌ Erreur lors de la suppression des proformas:', error);
    return { 
      success: false, 
      error: createError(ErrorCodes.DELETE_FAILED, { 
        count: proformaIds.length,
        originalError: error 
      })
    };
  }
}
