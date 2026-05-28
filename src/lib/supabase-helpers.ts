import { supabase } from './supabase';
import { Proforma, CompanyInfo } from '../types';

/**
 * Fonctions utilitaires pour gérer les données avec Supabase
 */

// ==================== COMPANY SETTINGS ====================

export async function loadCompanySettings(userId: string): Promise<CompanyInfo | null> {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      return null;
    }

    if (!data) return null;

    // Convertir les données Supabase vers le format CompanyInfo
    return {
      name: data.name,
      address: data.address,
      email: data.email,
      phone: data.phone,
      logo: data.logo,
      logoWidth: data.logo_width,
      logoHeight: data.logo_height,
      signature: data.signature,
      signatureWidth: data.signature_width,
      signatureHeight: data.signature_height,
      stamp: data.stamp,
      stampWidth: data.stamp_width,
      stampHeight: data.stamp_height,
      watermark: data.watermark,
      services: data.services,
      siret: data.siret,
      siren: data.siren,
      rcs: data.rcs
    };
  } catch (err) {
    console.error('Erreur inattendue:', err);
    return null;
  }
}

export async function saveCompanySettings(userId: string, settings: CompanyInfo): Promise<boolean> {
  try {
    console.log('💾 Sauvegarde des paramètres d\'entreprise...', { userId, name: settings.name });
    
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
    const { data: existing } = await supabase
      .from('company_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

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
      console.error('❌ Erreur lors de la sauvegarde des paramètres:', result.error);
      return false;
    }

    console.log('✅ Paramètres sauvegardés avec succès');
    return true;
  } catch (err) {
    console.error('❌ Erreur inattendue:', err);
    return false;
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

export async function saveProforma(userId: string, proforma: Proforma): Promise<boolean> {
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
      console.error('❌ Erreur Supabase lors de la sauvegarde du proforma:', result.error);
      console.error('Détails de l\'erreur:', {
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
        code: result.error.code
      });
      return false;
    }

    console.log('✅ Proforma sauvegardé avec succès:', result.data);
    return true;
  } catch (err: any) {
    console.error('❌ Erreur inattendue lors de la sauvegarde:', err);
    console.error('Stack trace:', err.stack);
    return false;
  }
}

export async function deleteProforma(proformaId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('proformas')
      .delete()
      .eq('id', proformaId);

    if (error) {
      console.error('Erreur lors de la suppression du proforma:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Erreur inattendue:', err);
    return false;
  }
}

export async function deleteMultipleProformas(proformaIds: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('proformas')
      .delete()
      .in('id', proformaIds);

    if (error) {
      console.error('Erreur lors de la suppression des proformas:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Erreur inattendue:', err);
    return false;
  }
}
