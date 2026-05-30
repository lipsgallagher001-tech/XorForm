# 🚀 Guide de Déploiement Vercel - XorForm

**Date** : 30 Mai 2026  
**Version** : 3.1.0

---

## ✅ Prérequis

- ✅ Compte Vercel (gratuit)
- ✅ Projet GitHub connecté
- ✅ Variables d'environnement Supabase

---

## 📋 Étapes de Déploiement

### 1. Créer un Projet Vercel

1. Aller sur https://vercel.com
2. Cliquer sur **"New Project"**
3. Importer depuis GitHub : `lipsgallagher001-tech/XorForm`
4. Cliquer sur **"Import"**

### 2. Configurer les Variables d'Environnement

Dans les paramètres du projet Vercel :

1. Aller dans **Settings** → **Environment Variables**
2. Ajouter ces variables :

```
VITE_SUPABASE_URL=https://upmlijsgwfxeuynvmgkj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwbWxpanNnd2Z4ZXV5bnZtZ2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTExNzcsImV4cCI6MjA5NTY2NzE3N30.G7j0NiLVoD0AbpHlg7hnmnnt9CTDquNoyg7UCo8Jegk
```

3. Sélectionner **Production**, **Preview**, et **Development**
4. Cliquer sur **"Save"**

### 3. Configurer le Build

Vercel devrait détecter automatiquement :
- **Framework Preset** : Vite
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Install Command** : `npm install`

Si ce n'est pas le cas, configurez manuellement dans **Settings** → **Build & Development Settings**.

### 4. Déployer

1. Cliquer sur **"Deploy"**
2. Attendre la fin du build (2-3 minutes)
3. Vérifier le déploiement

---

## ⚠️ Warnings Connus

### Warning: `node-domexception` déprécié

```
npm warn deprecated node-domexception@1.0.0
```

**Impact** : Aucun, c'est juste un warning
**Cause** : Dépendance indirecte de Supabase ou jsPDF
**Action** : Aucune action requise, le build fonctionne

---

## 🔧 Configuration Vercel

### Fichiers de Configuration

1. **vercel.json** - Configuration principale
   - Rewrites pour SPA
   - Headers de sécurité
   - Cache des assets

2. **.vercelignore** - Fichiers à exclure
   - Documentation (*.md)
   - Scripts SQL (*.sql)
   - Fichiers de développement

### Headers de Sécurité

Les headers suivants sont automatiquement ajoutés :
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`

### Cache

- Assets (`/assets/*`) : Cache 1 an (immutable)
- Autres fichiers : Pas de cache (SPA)

---

## 🌐 Domaine Personnalisé

### Ajouter un Domaine

1. Aller dans **Settings** → **Domains**
2. Cliquer sur **"Add"**
3. Entrer votre domaine : `xorform.com`
4. Suivre les instructions DNS

### Configuration DNS

Ajouter ces enregistrements chez votre registrar :

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## 🔍 Vérification du Déploiement

### 1. Vérifier le Build

Dans les logs Vercel, vous devriez voir :

```
✓ Building...
✓ Compiled successfully
✓ Build Completed
✓ Deployment Ready
```

### 2. Tester l'Application

1. Ouvrir l'URL Vercel (ex: `xorform.vercel.app`)
2. Vérifier que la page se charge
3. Se connecter avec un compte
4. Tester les fonctionnalités :
   - ✅ Connexion/Inscription
   - ✅ Paramètres entreprise
   - ✅ Création proforma
   - ✅ Génération PDF

### 3. Vérifier la Console

Ouvrir la console (F12) et vérifier :
- ✅ Pas d'erreurs rouges
- ✅ Connexion Supabase OK
- ✅ Données chargées

---

## 🐛 Problèmes Courants

### Erreur : "Failed to load resource"

**Cause** : Variables d'environnement manquantes

**Solution** :
1. Vérifier dans **Settings** → **Environment Variables**
2. Ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
3. Redéployer

### Erreur : "404 Not Found" sur les routes

**Cause** : Rewrites manquants

**Solution** :
1. Vérifier que `vercel.json` existe
2. Vérifier la section `rewrites`
3. Redéployer

### Build échoue

**Cause** : Erreurs TypeScript ou dépendances manquantes

**Solution** :
1. Tester localement : `npm run build`
2. Corriger les erreurs
3. Commit et push
4. Vercel redéploie automatiquement

### Application lente

**Cause** : Pas de cache ou bundle trop gros

**Solution** :
1. Vérifier les headers de cache dans `vercel.json`
2. Optimiser le bundle (voir `AUDIT_COMPLET_2026.md`)
3. Activer la compression Brotli (automatique sur Vercel)

---

## 📊 Métriques de Performance

### Objectifs

- **First Contentful Paint** : < 1.5s
- **Time to Interactive** : < 3.5s
- **Largest Contentful Paint** : < 2.5s
- **Cumulative Layout Shift** : < 0.1

### Vérifier les Performances

1. Aller sur https://pagespeed.web.dev/
2. Entrer l'URL de votre site
3. Analyser les résultats

---

## 🔄 Déploiement Automatique

### Branches

- **main** → Production (xorform.com)
- **develop** → Preview (xorform-git-develop.vercel.app)
- **feature/*** → Preview (xorform-git-feature-xxx.vercel.app)

### Workflow

1. Commit et push sur GitHub
2. Vercel détecte automatiquement
3. Build et déploiement automatique
4. Notification par email

---

## 📝 Checklist de Déploiement

Avant de déployer en production :

- [ ] Variables d'environnement configurées
- [ ] Build local réussi (`npm run build`)
- [ ] Tests manuels OK
- [ ] Base de données Supabase configurée
- [ ] Script SQL exécuté (`supabase-init-simple.sql`)
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] SSL/HTTPS activé (automatique sur Vercel)
- [ ] Headers de sécurité configurés
- [ ] Cache configuré
- [ ] Monitoring activé

---

## 🎉 Déploiement Réussi !

Votre application est maintenant en ligne ! 🚀

### Prochaines Étapes

1. ✅ Partager l'URL avec vos utilisateurs
2. ✅ Configurer un domaine personnalisé
3. ✅ Activer le monitoring (Vercel Analytics)
4. ✅ Configurer les alertes
5. ✅ Optimiser les performances

---

## 📖 Ressources

- **Documentation Vercel** : https://vercel.com/docs
- **Vercel CLI** : https://vercel.com/docs/cli
- **Vercel Analytics** : https://vercel.com/analytics
- **Support Vercel** : https://vercel.com/support

---

**Créé par** : Kiro AI Assistant  
**Date** : 30 Mai 2026  
**Version** : 3.1.0
