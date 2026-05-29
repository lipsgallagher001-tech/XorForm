/**
 * Système de cache pour améliorer les performances de chargement
 * Utilise localStorage comme cache avec expiration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

const CACHE_VERSION = '1.0.0';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Sauvegarder des données dans le cache
 */
export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  } catch (error) {
    console.warn('Erreur cache (setCache):', error);
  }
}

/**
 * Récupérer des données du cache
 * Retourne null si le cache est expiré ou invalide
 */
export function getCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);

    // Vérifier la version
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    // Vérifier l'expiration
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_DURATION) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.warn('Erreur cache (getCache):', error);
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
  } catch (error) {
    console.warn('Erreur cache (clearCache):', error);
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
