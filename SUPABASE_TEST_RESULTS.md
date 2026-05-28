# Test de connexion Supabase

## ✅ Configuration effectuée

### 1. Installation
- ✅ Package `@supabase/supabase-js` installé
- ✅ Client Supabase configuré dans `src/lib/supabase.ts`
- ✅ Variables d'environnement configurées dans `.env`

### 2. Clés API configurées
- **URL Supabase** : `https://dpdvxncpjwcwkqoetyhv.supabase.co`
- **Clé Anon** : ✓ Configurée

### 3. Fichiers créés
- `src/lib/supabase.ts` - Client Supabase et types TypeScript
- `src/test-supabase.ts` - Script de test de connexion
- `src/components/SupabaseStatus.tsx` - Composant visuel de statut
- `supabase-schema.sql` - Script SQL pour créer les tables
- `.env` - Variables d'environnement
- `SUPABASE_SETUP.md` - Guide d'installation
- `SUPABASE_INTEGRATION.md` - Guide d'intégration

### 4. Composants modifiés
- `src/main.tsx` - Ajout du test automatique au démarrage
- `src/App.tsx` - Ajout du composant SupabaseStatus

## 🔍 Comment vérifier la connexion

### Méthode 1 : Console du navigateur
1. Ouvrir l'application dans le navigateur : http://localhost:3000
2. Ouvrir la console (F12)
3. Chercher les messages de test Supabase :
   - ✅ "Configuration Supabase chargée"
   - ✅ "Connexion à la base de données réussie"
   - ✅ "Table users existe"
   - etc.

### Méthode 2 : Indicateur visuel
- Un badge apparaît en bas à droite de l'écran :
  - 🔵 Bleu avec spinner = Vérification en cours
  - 🟢 Vert avec ✓ = Connecté à Supabase
  - 🔴 Rouge avec ✗ = Erreur de connexion

### Méthode 3 : Console JavaScript
Dans la console du navigateur, taper :
\`\`\`javascript
testSupabase()
\`\`\`

## ⚠️ Prochaines étapes IMPORTANTES

### 1. Créer les tables dans Supabase
Les tables n'existent pas encore dans votre base de données Supabase. Vous devez :

1. Aller sur https://supabase.com/dashboard
2. Ouvrir votre projet
3. Aller dans **SQL Editor**
4. Copier le contenu de `supabase-schema.sql`
5. Coller et exécuter le script

### 2. Vérifier les résultats
Après avoir exécuté le script SQL :
- Aller dans **Table Editor**
- Vérifier que 3 tables existent :
  - `users`
  - `company_settings`
  - `proformas`

### 3. Tester à nouveau
- Rafraîchir l'application
- L'indicateur devrait passer au vert ✅
- La console devrait afficher "Tous les tests sont passés avec succès !"

## 🐛 Résolution des problèmes

### Erreur : "Table users not found"
**Solution** : Les tables n'ont pas été créées. Exécuter `supabase-schema.sql` dans l'éditeur SQL de Supabase.

### Erreur : "Invalid API key"
**Solution** : Vérifier que les clés dans `.env` sont correctes.

### Erreur : "Network error"
**Solution** : 
- Vérifier la connexion Internet
- Vérifier que le projet Supabase est actif
- Vérifier l'URL du projet

## 📊 État actuel

- ✅ Client Supabase configuré
- ✅ Variables d'environnement configurées
- ✅ Tests automatiques en place
- ✅ Indicateur visuel ajouté
- ⏳ **Tables à créer** (exécuter supabase-schema.sql)
- ⏳ **Intégration authentification** (prochaine étape)
- ⏳ **Migration des données** (après authentification)

## 🎯 Prochaine étape

**Créer les tables dans Supabase en exécutant le script SQL !**

Une fois les tables créées, nous pourrons :
1. Intégrer l'authentification Supabase
2. Migrer les données de localStorage vers Supabase
3. Synchroniser les proformas en temps réel
4. Permettre l'accès multi-appareils
