import { supabase } from './supabase';
import { Proforma, CompanyInfo } from '../types';
import { createError, handleError, ErrorCodes, AppError } from './errors';
import { getCache, setCache, invalidateCache, invalidateCacheByPrefix } from './cache';
import { perfMonitor } from './performance';

/**
 * Fonctions utilitaires pour gérer les données avec Supabase
 * Optimisées avec système de cache pour améliorer les performances
 */

export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: AppError;
}

// ==================== COMPANY SETTINGS ====================

export async function loadCompanySettings(userId: string): Promise<CompanyInfo | null> {
  perfMonitor.start('loadCompanySettings');
  
  try {
    // ⚡ OPTIMISATION: Vérifier le cache d'abord
    const cacheKey = `company_settings_${userId}`;
    const cached = getCache<CompanyInfo>(cacheKey);
    if (cached) {
      console.log('⚡ Paramètres chargés depuis le cache');
      perfMonitor.end('loadCompanySettings');
      return cached;
    }

    console.log('📥 Chargement paramètres depuis Supabase...', userId.substring(0, 8));
    perfMonitor.start('supabase_company_settings_query');
    
    // ⚡ OPTIMISATION CRITIQUE: NE PAS charger les images base64 (logo, signature, stamp)
    // Ces images peuvent faire plusieurs MB chacune et ralentir le chargement.
    // Elles sont chargées séparément via loadCompanyImages() uniquement pour le PDF.
    const { data, error } = await supabase
      .from('company_settings')
      .select('name, address, email, phone, logo_width, logo_height, signature_width, signature_height, stamp_width, stamp_height, watermark, services, siret, siren, rcs')
      .eq('user_id', userId)
      .maybeSingle();

    perfMonitor.end('supabase_company_settings_query');

    if (error) {
      console.error('❌ Erreur Supabase:', error.code, error.message);
      
      // Diagnostics spécifiques
      if (error.code === '42501') {
        console.error('🔒 PROBLÈME RLS ! Exécutez fix_company_settings_rls.sql');
      } else if (error.code === '42P01') {
        console.error('🗄️ TABLE MANQUANTE ! Exécutez supabase-schema-fixed.sql');
      }
      
      perfMonitor.end('loadCompanySettings');
      throw error;
    }

    if (!data) {
      console.warn('⚠️ Aucun paramètre trouvé. Exécutez fix_company_settings_rls.sql');
      perfMonitor.end('loadCompanySettings');
      return null;
    }

    // Convertir les données Supabase vers le format CompanyInfo
    // ⚡ Les images (logo, signature, stamp) ne sont PAS chargées ici (performance)
    const settings: CompanyInfo = {
      name: data.name,
      address: data.address,
      email: data.email,
      phone: data.phone,
      logoWidth: data.logo_width || undefined,
      logoHeight: data.logo_height || undefined,
      signatureWidth: data.signature_width || undefined,
      signatureHeight: data.signature_height || undefined,
      stampWidth: data.stamp_width || undefined,
      stampHeight: data.stamp_height || undefined,
      watermark: data.watermark || undefined,
      services: data.services || undefined,
      siret: data.siret || undefined,
      siren: data.siren || undefined,
      rcs: data.rcs || undefined
    };
    
    // ⚡ VALIDATION: Ne mettre en cache QUE si les données sont valides
    if (settings.name && settings.email) {
      setCache(cacheKey, settings);
      console.log('✅ Paramètres chargés et mis en cache:', settings.name);
    } else {
      console.warn('⚠️ Paramètres incomplets, pas de mise en cache');
    }
    
    perfMonitor.end('loadCompanySettings');
    return settings;
  } catch (err) {
    const error = handleError(err);
    console.error('❌ Erreur chargement:', error.code);
    perfMonitor.end('loadCompanySettings');
    return null;
  }
}

/**
 * ⚡ Charger UNIQUEMENT les images (logo, signature, stamp) d'un utilisateur.
 * Appelé seulement lors de la génération d'un PDF, pas au chargement initial.
 * Évite de télécharger plusieurs MB d'images base64 inutilement.
 */
export async function loadCompanyImages(userId: string): Promise<{
  logo?: string;
  signature?: string;
  stamp?: string;
} | null> {
  try {
    // Vérifier le cache d'abord
    const cacheKey = `company_images_${userId}`;
    const cached = getCache<{ logo?: string; signature?: string; stamp?: string }>(cacheKey);
    if (cached) {
      console.log('⚡ Images chargées depuis le cache');
      return cached;
    }

    console.log('📥 Chargement images depuis Supabase...');
    const { data, error } = await supabase
      .from('company_settings')
      .select('logo, signature, stamp')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      console.error('❌ Erreur chargement images:', error);
      return null;
    }

    const images = {
      logo: data.logo || undefined,
      signature: data.signature || undefined,
      stamp: data.stamp || undefined,
    };

    // Mettre en cache 10 minutes (les images changent rarement)
    setCache(cacheKey, images, 10 * 60 * 1000);
    console.log('✅ Images chargées et mises en cache');

    return images;
  } catch (err) {
    console.error('❌ Erreur chargement images:', err);
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

    // Upsert : insère ou met à jour en une seule requête
    const result = await supabase
      .from('company_settings')
      .upsert(
        { ...dataToSave, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select();

    if (result.error) throw result.error;

    // ⚡ OPTIMISATION: Invalider le cache après sauvegarde (settings + images)
    invalidateCache(`company_settings_${userId}`);
    invalidateCache(`company_images_${userId}`);

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

export async function loadProformas(userId: string, limit: number = 20): Promise<Proforma[]> {
  perfMonitor.start('loadProformas');
  
  try {
    // ⚡ OPTIMISATION: Vérifier le cache d'abord
    const cacheKey = `proformas_${userId}_${limit}`;
    const cached = getCache<Proforma[]>(cacheKey);
    if (cached) {
      console.log('⚡ Proformas chargés depuis le cache:', cached.length);
      perfMonitor.end('loadProformas');
      return cached;
    }

    perfMonitor.start('supabase_proformas_query');
    
    // ⚡ OPTIMISATION: Charger uniquement les champs essentiels (pas les items complets)
    const { data, error } = await supabase
      .from('proformas')
      .select('id, type, number, date, client_name, client_phone, discount_percent, total')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    perfMonitor.end('supabase_proformas_query');

    if (error) {
      console.error('Erreur lors du chargement des proformas:', error);
      perfMonitor.end('loadProformas');
      return [];
    }

    if (!data) {
      perfMonitor.end('loadProformas');
      return [];
    }

    // Convertir les données Supabase vers le format Proforma (sans items pour l'instant)
    const proformas = data.map(item => ({
      id: item.id,
      type: item.type as 'PROFORMA' | 'FACTURE',
      number: item.number,
      date: item.date,
      client: {
        name: item.client_name,
        phone: item.client_phone || ''
      },
      items: [], // ⚡ Items chargés à la demande
      discountPercent: item.discount_percent || 0,
      total: item.total
    }));

    // ⚡ OPTIMISATION: Mettre en cache avec TTL de 5 minutes
    setCache(cacheKey, proformas, 5 * 60 * 1000);

    perfMonitor.end('loadProformas');
    return proformas;
  } catch (err) {
    console.error('Erreur inattendue:', err);
    perfMonitor.end('loadProformas');
    return [];
  }
}

// ⚡ NOUVELLE FONCTION: Charger les détails d'un proforma spécifique
export async function loadProformaDetails(proformaId: string): Promise<Proforma | null> {
  try {
    const { data, error } = await supabase
      .from('proformas')
      .select('*')
      .eq('id', proformaId)
      .single();

    if (error || !data) {
      console.error('Erreur chargement détails proforma:', error);
      return null;
    }

    return {
      id: data.id,
      type: data.type as 'PROFORMA' | 'FACTURE',
      number: data.number,
      date: data.date,
      client: {
        name: data.client_name,
        phone: data.client_phone || ''
      },
      items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items,
      discountPercent: data.discount_percent || 0,
      total: data.total
    };
  } catch (err) {
    console.error('Erreur inattendue:', err);
    return null;
  }
}

export async function saveProforma(
  userId: string, 
  proforma: Proforma
): Promise<OperationResult<any>> {
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

    // Upsert : insère ou met à jour en une seule requête
    const result = await supabase
      .from('proformas')
      .upsert(
        { ...dataToInsert, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .select();

    if (result.error) throw result.error;

    // ⚡ OPTIMISATION: Invalider toutes les variantes de cache (proformas_userId_20, _50, etc.)
    invalidateCacheByPrefix(`proformas_${userId}`);

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

export async function deleteProforma(proformaId: string, userId: string): Promise<OperationResult> {
  try {
    const { error } = await supabase
      .from('proformas')
      .delete()
      .eq('id', proformaId);

    if (error) {
      throw error;
    }

    // ⚡ OPTIMISATION: Invalider toutes les variantes de cache (proformas_userId_20, _50, etc.)
    invalidateCacheByPrefix(`proformas_${userId}`);

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

export async function deleteMultipleProformas(proformaIds: string[], userId: string): Promise<OperationResult> {
  try {
    const { error } = await supabase
      .from('proformas')
      .delete()
      .in('id', proformaIds);

    if (error) {
      throw error;
    }

    // ⚡ OPTIMISATION: Invalider toutes les variantes de cache (proformas_userId_20, _50, etc.)
    invalidateCacheByPrefix(`proformas_${userId}`);

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
