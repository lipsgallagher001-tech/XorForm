# 🔧 Correction Erreur 406 - Lock Supabase

**Date** : 30 Mai 2026  
**Problème** : Lock non libéré, erreur 406, données ne se chargent pas

---

## 🎯 Solution Rapide (5 minutes)

### Étape 1 : Exécuter le Script Simplifié

1. **Ouvrir Supabase Dashboard**
   - https://supabase.com
   - Sélectionner votre projet XorForm

2. **Ouvrir SQL Editor**
   - Menu gauche → "SQL Editor"
   - Cliquer sur "New query"

3. **Copier et Exécuter**
   - Ouvrir le fichier `supabase-init-simple.sql`
   - Copier TOUT le contenu (Ctrl+A puis Ctrl+C)
   - Coller dans SQL Editor (Ctrl+V)
   - Cliquer sur **Run** (ou Ctrl+Enter)

4. **Vérifier le Message de Succès**
   ```
   ✅ Base de données initialisée avec succès !
   📊 Tables créées: company_settings, proformas
   🔒 RLS activé avec 8 policies
   ⚡ 6 indexes créés
   🔄 Triggers configurés
   ```

### Étape 2 : Vider le Cache de l'Application

1. **Ouvrir l'application** dans le navigateur
2. **Ouvrir la console** (F12)
3. **Exécuter** :
```javascript
localStorage.clear();
location.reload();
```

### Étape 3 : Se Reconnecter

1. Se connecter avec votre compte
2. Ouvrir les paramètres (⚙️)
3. Remplir les informations entreprise
4. Cliquer sur "Enregistrer"
5. Vérifier que ça fonctionne ✅

---

## 🔍 Diagnostic (Optionnel)

Si vous voulez vérifier l'état de votre base de données :

1. **Ouvrir SQL Editor** dans Supabase
2. **Copier et exécuter** `supabase-diagnostic.sql`
3. **Lire le résumé** à la fin

Le diagnostic vous dira :
- ✅ Tables créées : 2 / 2
- ✅ RLS activé : 2 / 2
- ✅ Policies créées : 8 / 8
- ✅ Utilisateur authentifié : OUI

---

## 📊 Différences entre les Scripts

### `supabase-init.sql` (Ancien - Causait des erreurs)
- ❌ Essayait de supprimer des policies sur des tables inexistantes
- ❌ Policies avec noms longs
- ❌ Pas de gestion des locks

### `supabase-init-simple.sql` (Nouveau - Fonctionne)
- ✅ Suppression propre avec CASCADE
- ✅ Policies avec noms courts
- ✅ Gestion des locks
- ✅ Messages de succès clairs

---

## ⚠️ Problèmes Courants

### Erreur : "Lock was not released"

**Cause** : Requête Supabase bloquée

**Solution** :
1. Attendre 30 secondes
2. Recharger la page (F5)
3. Vider le cache : `localStorage.clear()`
4. Se reconnecter

### Erreur : "Aucun paramètre trouvé"

**Cause** : Policies RLS bloquent l'accès

**Solution** :
1. Réexécuter `supabase-init-simple.sql`
2. Vérifier avec `supabase-diagnostic.sql`
3. Vider le cache
4. Se reconnecter

### Erreur 406 : "Not Acceptable"

**Cause** : Policies RLS mal configurées

**Solution** :
1. Réexécuter `supabase-init-simple.sql`
2. Les nouvelles policies incluent `TO authenticated`
3. Vider le cache
4. Se reconnecter

### Données ne se chargent pas

**Vérifications** :
1. ✅ Script SQL exécuté avec succès ?
2. ✅ Cache vidé ? (`localStorage.clear()`)
3. ✅ Connecté avec le bon compte ?
4. ✅ Console sans erreur ? (F12)

**Solution** :
1. Ouvrir la console (F12)
2. Chercher les erreurs en rouge
3. Vérifier les logs :
   - "✅ Paramètres chargés" = OK
   - "❌ Erreur Supabase" = Problème RLS
4. Si erreur RLS : Réexécuter le script SQL

---

## 🎯 Checklist de Vérification

Après avoir exécuté le script, vérifiez :

- [ ] Script SQL exécuté sans erreur
- [ ] Message "✅ Base de données initialisée avec succès !"
- [ ] 4 sections de résultats affichées
- [ ] Cache vidé (`localStorage.clear()`)
- [ ] Page rechargée (F5)
- [ ] Connecté à l'application
- [ ] Paramètres entreprise sauvegardés
- [ ] Paramètres persistent après rechargement
- [ ] Proforma créé avec succès
- [ ] PDF généré avec succès

---

## 📝 Logs à Vérifier

### Logs OK ✅

```
État authentifié, affichage de l'application
📥 Démarrage du chargement des données utilisateur...
⚡ Paramètres chargés depuis le cache
✅ Paramètres chargés: XOR COMMUNICATION
⚡ Proformas chargés depuis le cache: 5
Données chargées: {hasSettings: true, proformas: 5}
```

### Logs Problème ❌

```
❌ Erreur Supabase: 42501 permission denied
🔒 PROBLÈME RLS ! Exécutez fix_company_settings_rls.sql
⚠️ Aucun paramètre trouvé
Lock "lock:sb-upal1jsgwfxeuynvm6j-auth-token" was not released
Failed to load resource: status 406
```

**Si vous voyez ces erreurs** → Réexécuter `supabase-init-simple.sql`

---

## 🚀 Après la Correction

Une fois que tout fonctionne :

1. ✅ **Configurer vos paramètres** entreprise
2. ✅ **Créer votre premier proforma**
3. ✅ **Générer un PDF**
4. ✅ **Profiter de l'application** !

### Performance Attendue

- Premier chargement : 2-3 secondes
- Rechargement (cache) : < 0.5 seconde
- Interface visible : < 0.1 seconde
- Génération PDF : 1-2 secondes

---

## 📖 Fichiers Créés

1. **supabase-init-simple.sql** - Script SQL simplifié qui fonctionne
2. **supabase-diagnostic.sql** - Script de diagnostic
3. **CORRECTION_ERREUR_406.md** - Ce guide

---

## 🆘 Besoin d'Aide ?

Si le problème persiste :

1. **Exécuter le diagnostic** : `supabase-diagnostic.sql`
2. **Copier les résultats** du diagnostic
3. **Copier les logs** de la console (F12)
4. **Partager** ces informations

---

**Créé par** : Kiro AI Assistant  
**Date** : 30 Mai 2026  
**Version** : 3.1.0
