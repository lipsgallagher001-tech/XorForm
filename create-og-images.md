# 🎨 Guide de Création des Images Open Graph

## Images Requises

### 1. og-image.png (1200x630px)
**Utilisation:** Facebook, LinkedIn, WhatsApp  
**Format:** PNG ou JPG  
**Taille max:** 8 MB  
**Ratio:** 1.91:1

**Contenu suggéré:**
```
┌─────────────────────────────────────────┐
│                                         │
│  [Logo X]  XorForm                      │
│                                         │
│  Générateur de Proforma                 │
│  et Factures Professionnel              │
│                                         │
│  ✓ Gratuit  ✓ Rapide  ✓ Sécurisé      │
│                                         │
│  [Screenshot de l'interface]            │
│                                         │
└─────────────────────────────────────────┘
```

**Couleurs:**
- Background: Blanc ou #f8fafc
- Texte principal: #0a1f2c (navy)
- Accents: #ffcc00 (yellow)
- Bordure: #c0e0e7 (light blue)

---

### 2. twitter-image.png (1200x675px)
**Utilisation:** Twitter/X  
**Format:** PNG ou JPG  
**Taille max:** 5 MB  
**Ratio:** 16:9

**Contenu suggéré:**
```
┌─────────────────────────────────────────┐
│                                         │
│  XorForm                                │
│  Créez vos factures en 2 minutes        │
│                                         │
│  [Mockup de l'app sur laptop]           │
│                                         │
│  xorform.com                            │
└─────────────────────────────────────────┘
```

---

### 3. screenshot.png (1280x720px)
**Utilisation:** Schema.org, PWA stores  
**Format:** PNG  
**Ratio:** 16:9

**Contenu:** Screenshot réel de l'application en action

---

## 🛠️ Outils de Création

### Option 1: Canva (Recommandé - Gratuit)
1. Aller sur https://www.canva.com
2. Créer un design personnalisé (1200x630px)
3. Utiliser les templates "Social Media"
4. Exporter en PNG haute qualité

**Template Canva suggéré:**
- Rechercher "Open Graph" ou "Facebook Post"
- Adapter aux dimensions exactes

### Option 2: Figma (Professionnel - Gratuit)
1. Créer un nouveau fichier
2. Frame: 1200x630px
3. Designer l'image
4. Export: PNG 2x

### Option 3: Photoshop / GIMP
- Créer un nouveau document
- Dimensions: 1200x630px
- Résolution: 72 DPI
- Mode couleur: RVB

### Option 4: Code (HTML to Image)
```html
<!-- og-template.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      font-family: 'Inter', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 60px;
    }
    .logo {
      width: 120px;
      height: 120px;
      background: #0a1f2c;
      border-radius: 24px;
      margin: 0 auto 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 60px;
      font-weight: 900;
      color: #ffcc00;
    }
    h1 {
      font-size: 72px;
      font-weight: 900;
      color: #0a1f2c;
      margin: 0 0 20px;
    }
    p {
      font-size: 36px;
      color: #64748b;
      margin: 0 0 40px;
    }
    .features {
      display: flex;
      gap: 40px;
      justify-content: center;
      font-size: 28px;
      color: #0a1f2c;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">X</div>
    <h1>XorForm</h1>
    <p>Générateur de Proforma et Factures</p>
    <div class="features">
      <span>✓ Gratuit</span>
      <span>✓ Rapide</span>
      <span>✓ Sécurisé</span>
    </div>
  </div>
</body>
</html>
```

**Convertir en image:**
- Utiliser https://htmlcsstoimage.com/
- Ou Puppeteer (Node.js)

---

## 📸 Prendre un Screenshot de l'App

### Méthode 1: Navigateur
1. Ouvrir l'app en local (`npm run dev`)
2. Ouvrir DevTools (F12)
3. Toggle device toolbar (Ctrl+Shift+M)
4. Sélectionner "Responsive" 1280x720
5. Capture screenshot (Ctrl+Shift+P → "Capture screenshot")

### Méthode 2: Extension Chrome
- **Awesome Screenshot**
- **Full Page Screen Capture**
- **Nimbus Screenshot**

### Méthode 3: Code (Puppeteer)
```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:3000');
  
  // Attendre que l'app soit chargée
  await page.waitForSelector('.app-container');
  
  await page.screenshot({ 
    path: 'public/screenshot.png',
    fullPage: false
  });
  
  await browser.close();
  console.log('✅ Screenshot créé');
})();
```

---

## ✅ Checklist de Validation

### Avant de publier, vérifier:

- [ ] **Dimensions exactes**
  - og-image.png: 1200x630px
  - twitter-image.png: 1200x675px
  - screenshot.png: 1280x720px

- [ ] **Qualité**
  - Résolution suffisante (pas de flou)
  - Texte lisible sur mobile
  - Couleurs fidèles à la marque

- [ ] **Contenu**
  - Logo visible
  - Nom de l'app clair
  - Proposition de valeur évidente
  - Pas de texte coupé

- [ ] **Taille fichier**
  - og-image < 8 MB
  - twitter-image < 5 MB
  - Optimisé (compression)

- [ ] **Tests**
  - Facebook Debugger: https://developers.facebook.com/tools/debug/
  - Twitter Card Validator: https://cards-dev.twitter.com/validator
  - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

---

## 🧪 Tester les Images

### Facebook Debugger
1. Aller sur https://developers.facebook.com/tools/debug/
2. Entrer l'URL: https://xorform.com
3. Cliquer "Debug"
4. Vérifier l'aperçu
5. Si nécessaire, "Scrape Again"

### Twitter Card Validator
1. Aller sur https://cards-dev.twitter.com/validator
2. Entrer l'URL
3. Vérifier l'aperçu
4. Corriger si nécessaire

### LinkedIn Post Inspector
1. Aller sur https://www.linkedin.com/post-inspector/
2. Entrer l'URL
3. Vérifier l'aperçu

---

## 📦 Placement des Fichiers

```
public/
├── og-image.png          (1200x630)
├── twitter-image.png     (1200x675)
├── screenshot.png        (1280x720)
├── screenshot-desktop.png (1280x720)
└── screenshot-mobile.png  (750x1334)
```

---

## 💡 Conseils de Design

### Typographie
- **Titre:** 60-80px, bold
- **Sous-titre:** 30-40px, regular
- **Corps:** 24-32px

### Espacement
- Marges: 60-80px
- Entre éléments: 30-40px

### Contraste
- Ratio minimum: 4.5:1 (WCAG AA)
- Tester sur https://webaim.org/resources/contrastchecker/

### Responsive
- Tester l'aperçu sur mobile (preview réduit)
- Texte lisible même en petit

---

## 🎨 Exemples de Bonnes Pratiques

### ✅ BON
- Logo visible et reconnaissable
- Texte court et impactant
- Couleurs de marque cohérentes
- Call-to-action clair
- Pas de texte coupé

### ❌ MAUVAIS
- Trop de texte
- Texte trop petit
- Couleurs qui clashent
- Logo pixelisé
- Éléments coupés sur les bords

---

## 🚀 Après Création

1. **Placer les fichiers** dans `public/`
2. **Mettre à jour** `index.html` si nécessaire
3. **Tester** avec les validators
4. **Déployer** sur le serveur
5. **Vérifier** en production
6. **Partager** un post test sur chaque plateforme

---

**Besoin d'aide?**
- Canva Templates: https://www.canva.com/templates/
- Unsplash (images): https://unsplash.com/
- Pexels (images): https://www.pexels.com/
