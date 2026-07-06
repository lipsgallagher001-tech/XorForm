/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interface représentant le résultat d'une optimisation d'image.
 */
interface OptimizedImageResult {
  data: string; // Chaîne en Base64 (Data URL)
  format: 'PNG' | 'JPEG'; // Format final de l'image
  width: number; // Nouvelle largeur en pixels
  height: number; // Nouvelle hauteur en pixels
}

/**
 * Optimise une image (depuis un fichier File ou une chaîne Base64) en la redimensionnant
 * et en la compressant côté client.
 * Si l'image possède du canal alpha (transparence), elle est conservée au format PNG.
 * Sinon, elle est convertie en JPEG pour économiser de l'espace (qualité ajustable).
 *
 * @param source Fichier Image (File) ou chaîne Base64 (Data URL)
 * @param maxWidth Largeur maximale autorisée
 * @param maxHeight Hauteur maximale autorisée
 * @param quality Qualité de compression pour le format JPEG (0.0 à 1.0)
 */
export async function optimizeImageClient(
  source: File | string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    const processImage = (src: string) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;

        // Calcul des nouvelles dimensions en préservant le ratio d'aspect
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback en cas d'erreur de contexte canvas
          resolve({ data: src, format: 'PNG', width: img.width, height: img.height });
          return;
        }

        // Dessiner l'image dans le canvas aux nouvelles dimensions
        ctx.drawImage(img, 0, 0, w, h);

        // Détection de la transparence (canal alpha) par échantillonnage rapide.
        // On n'analyse pas chaque pixel individuellement si l'image est grande.
        // Échantillonner 1 pixel sur 16 (pas de 16 dans la boucle) accélère le traitement de 16x.
        const imgData = ctx.getImageData(0, 0, w, h).data;
        let hasAlpha = false;
        const len = imgData.length;

        for (let i = 3; i < len; i += 16) {
          if (imgData[i] < 250) { // Une valeur d'alpha < 250 indique de la transparence
            hasAlpha = true;
            break;
          }
        }

        const format = hasAlpha ? 'PNG' : 'JPEG';
        const data = hasAlpha
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', quality);

        resolve({ data, format, width: w, height: h });
      };

      img.onerror = () => {
        reject(new Error("Impossible de charger l'image pour optimisation"));
      };

      img.src = src;
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          processImage(e.target.result as string);
        } else {
          reject(new Error("Erreur lors de la lecture du fichier image"));
        }
      };
      reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
      reader.readAsDataURL(source);
    } else {
      processImage(source);
    }
  });
}
