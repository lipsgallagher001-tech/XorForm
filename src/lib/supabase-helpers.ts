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
    console.log('📥 Chargement paramètres...', userId.substring(0, 8));
    
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Erreur Supabase:', error.code, error.message);
      
      // Diagnostics spécifiques
      if (error.code === '42501') {
        console.error('🔒 PROBLÈME RLS ! Exécutez fix_company_settings_rls.sql');
      } else if (error.code === '42P01') {
        console.error('🗄️ TABLE MANQUANTE ! Exécutez supabase-schema-fixed.sql');
      }
      
      throw error;
    }

    if (!data) {
      console.warn('⚠️ Aucun paramètre trouvé. Exécutez fix_company_settings_rls.sql');
      return null;
    }

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
    
    console.log('✅ Paramètres chargés:', settings.name);
    return settings;
  } catch (err) {
    const error = handleError(err);
    console.error('❌ Erreur chargement:', error.code);
    return null;
  }
}

export async function saveCompanySettings(
  userId: string, 
  settings: CompanyInfo
): Promise<OperationResult> {
  try {
    console.log('💾 Sauvegarde paramètres...', settings.name);
    
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

    if (selectError) throw selectError;

    let result;
    if (existing) {
      // Mise à jour
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
      result = await supabase
        .from('company_settings')
        .insert(dataToSave)
        .select();
    }

    if (result.error) throw result.error;

    console.log('✅ Paramètres sauvegardés');
    return { success: true };
    
  } catch (err) {
    const error = handleError(err);
    console.error('❌ Erreur sauvegarde:', error);
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
    console.log('💾 Sauvegarde proforma...', proforma.number);

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

    // Vérifier si le proforma existe déjà
    const { data: existing } = await supabase
      .from('proformas')
      .select('id')
      .eq('id', proforma.id)
      .single();

    let result;
    if (existing) {
      // Mise à jour
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
      result = await supabase
        .from('proformas')
        .insert(dataToInsert)
        .select();
    }

    if (result.error) throw result.error;

    console.log('✅ Proforma sauvegardé');
    return { success: true, data: result.data };
    
  } catch (err) {
    const error = handleError(err);
    console.error('❌ Erreur sauvegarde proforma:', error);
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
