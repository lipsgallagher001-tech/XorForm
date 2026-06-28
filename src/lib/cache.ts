/**
 * Système de cache pour améliorer les performances de chargement
 * Utilise localStorage comme cache avec expiration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
  ttl?: number; // Durée de vie personnalisée
}

const CACHE_VERSION = '1.0.0';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Sauvegarder des données dans le cache
 * @param key - Clé du cache
 * @param data - Données à mettre en cache
 * @param ttl - Durée de vie en millisecondes (optionnel, par défaut 5 minutes)
 */
export function setCache<T>(key: string, data: T, ttl?: number): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
      ttl: ttl || CACHE_DURATION,
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  } catch (error) {
    console.warn('Erreur cache (setCache):', error);
  }
}

/**
 * Récupérer des données du cache
 * Retourne null si le cache est expiré, invalide ou vide
 */
export function getCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);

    // Vérifier la version
    if (entry.version !== CACHE_VERSION) {
      console.log(`🗑️ Cache invalidé (version): ${key}`);
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    // Vérifier l'expiration
    const cacheDuration = entry.ttl || CACHE_DURATION;
    const age = Date.now() - entry.timestamp;
    if (age > cacheDuration) {
      console.log(`🗑️ Cache expiré (${Math.round(age / 1000)}s): ${key}`);
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    // ⚡ VALIDATION: Vérifier que les données ne sont pas vides
    if (!entry.data) {
      console.log(`🗑️ Cache vide (null): ${key}`);
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    // Pour les objets, vérifier qu'ils ont des propriétés
    if (typeof entry.data === 'object' && !Array.isArray(entry.data)) {
      const hasData = Object.keys(entry.data).length > 0;
      if (!hasData) {
        console.log(`🗑️ Cache vide (objet vide): ${key}`);
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
    }

    // Pour les tableaux, vérifier qu'ils ne sont pas vides (sauf si c'est normal)
    if (Array.isArray(entry.data) && key.includes('proformas')) {
      // Les proformas peuvent être un tableau vide (normal pour un nouvel utilisateur)
      // On accepte donc les tableaux vides pour les proformas
    }

    return entry.data;
  } catch (error) {
    console.warn('Erreur cache (getCache):', error);
    localStorage.removeItem(`cache_${key}`);
    return null;
  }
}

/**
 * Invalider le cache pour une clé spécifique
 */
export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(`cache_${key}`);
  } catch (error) {
    console.warn('Erreur cache (invalidateCache):', error);
  }
}

/**
 * Invalider toutes les entrées de cache dont la clé commence par un préfixe donné.
 * Utile pour invalider `proformas_userId_20`, `proformas_userId_50`, etc. en une seule fois.
 */
export function invalidateCacheByPrefix(prefix: string): void {
  try {
    const fullPrefix = `cache_${prefix}`;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(fullPrefix)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Erreur cache (invalidateCacheByPrefix):', error);
  }
}

/**
 * Invalider tout le cache
 */
export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('🗑️ Cache vidé complètement');
  } catch (error) {
    console.warn('Erreur cache (clearCache):', error);
  }
}

/**
 * Nettoyer le cache corrompu ou invalide
 * À appeler au démarrage de l'application
 */
export function cleanupCache(): void {
  try {
    const keys = Object.keys(localStorage);
    let cleaned = 0;
    
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const cached = localStorage.getItem(key);
          if (!cached) return;
          
          const entry = JSON.parse(cached);
          
          // Vérifier la version
          if (entry.version !== CACHE_VERSION) {
            localStorage.removeItem(key);
            cleaned++;
            return;
          }
          
          // Vérifier l'expiration
          const age = Date.now() - entry.timestamp;
          if (age > CACHE_DURATION) {
            localStorage.removeItem(key);
            cleaned++;
            return;
          }
          
          // Vérifier que les données ne sont pas vides
          if (!entry.data || (typeof entry.data === 'object' && !Array.isArray(entry.data) && Object.keys(entry.data).length === 0)) {
            localStorage.removeItem(key);
            cleaned++;
            return;
          }
        } catch (error) {
          // Cache corrompu, le supprimer
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} entrée(s) de cache nettoyée(s)`);
    }
  } catch (error) {
    console.warn('Erreur cache (cleanupCache):', error);
  }
}

/**
 * Compresser une image base64 pour réduire la taille
 */
export function compressImage(base64: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Redimensionner si nécessaire
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convertir en base64 avec compression
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = reject;
    img.src = base64;
  });
}
