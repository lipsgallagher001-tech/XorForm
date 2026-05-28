/**
 * Script pour générer tous les favicons nécessaires
 * Usage: node generate-favicons.js
 * 
 * Prérequis: npm install sharp
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_SVG = './public/favicon.svg';
const OUTPUT_DIR = './public';

// Tailles à générer
const SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// Vérifier que le fichier SVG existe
if (!fs.existsSync(INPUT_SVG)) {
  console.error('❌ Erreur: favicon.svg introuvable dans ./public/');
  process.exit(1);
}

// Créer le dossier de sortie s'il n'existe pas
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🎨 Génération des favicons...\n');

// Générer chaque taille
const promises = SIZES.map(({ size, name }) => {
  const outputPath = path.join(OUTPUT_DIR, name);
  
  return sharp(INPUT_SVG)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 10, g: 31, b: 44, alpha: 1 } // app-navy
    })
    .png()
    .toFile(outputPath)
    .then(() => {
      console.log(`✅ ${name} (${size}x${size}) créé`);
      return { success: true, name };
    })
    .catch(err => {
      console.error(`❌ Erreur lors de la création de ${name}:`, err.message);
      return { success: false, name, error: err.message };
    });
});

// Attendre que toutes les images soient générées
Promise.all(promises)
  .then(results => {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n📊 Résumé:');
    console.log(`   ✅ ${successful} favicons générés avec succès`);
    if (failed > 0) {
      console.log(`   ❌ ${failed} échecs`);
    }
    
    console.log('\n🎉 Génération terminée!');
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Vérifier les fichiers dans ./public/');
    console.log('   2. Tester sur différents navigateurs');
    console.log('   3. Valider avec https://realfavicongenerator.net/favicon_checker');
  })
  .catch(err => {
    console.error('\n❌ Erreur fatale:', err);
    process.exit(1);
  });
