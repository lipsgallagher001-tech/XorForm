# 🔧 GUIDE DE CORRECTION SUPABASE

## 🐛 Problème Identifié

**Erreur:** `Failed to load resource: the server responded with a status of 500 company_settings:1`

**Cause:** Les tables `company_settings` et `proformas` n'existent pas dans votre base de données Supabase.

---

## ✅ Solution (5 minutes)

### Étape 1: Ouvrir Supabase Dashboard

1. Aller sur https://supabase.com
2. Se connecter à votre compte
3. Sélectionner votre projet XorForm

### Étape 2: Ouvrir le SQL Editor

1. Dans le menu de gauche, cliquer sur **"SQL Editor"** (icône 📝)
2. Cliquer sur **"New query"**

### Étape 3: Copier-Coller le SQL

1. Ouvrir le fichier `supabase-schema-fixed.sql`
2. **Copier TOUT le contenu** (Ctrl+A puis Ctrl+C)
3. **Coller** dans le SQL Editor de Supabase (Ctrl+V)

### Étape 4: Exécuter le SQL

1. Cliquer sur le bouton **"Run"** (ou Ctrl+Enter)
2. Attendre quelques secondes
3. Vous devriez voir : **"Success. No rows returned"**

### Étape 5: Vérifier que ça fonctionne

1. Dans le menu de gauche, cliquer sur **"Table Editor"**
2. Vous devriez voir 2 nouvelles tables :
   - ✅ `company_settings`
   - ✅ `proformas`

---

## 🧪 Tester l'Application

1. **Rafraîchir** votre application (F5)
2. **Ouvrir les paramètres** d'entreprise
3. **Modifier** vos informations
4. **Cliquer sur "Enregistrer"**
5. **Fermer et rouvrir** les paramètres
6. ✅ **Vos informations devraient être sauvegardées !**

---

## 🔍 Vérification dans la Console

Après avoir exécuté le SQL, testez à nouveau et regardez la console (F12) :

**Avant (erreur):**
```
❌ Failed to load resource: status 500 company_settings:1
```

**Après (succès):**
```
✅ Paramètres sauvegardés avec succès
📦 Paramètres chargés: {name: "XOR COMMUNICATION", ...}
```

---

## 📊 Structure des Tables Créées

### Table: `company_settings`
Stocke les paramètres d'entreprise pour chaque utilisateur :
- Nom commercial
- Adresse
- Email
- Téléphone
- Logo, Signature, Cachet (base64)
- Filigrane
- Services
- SIRET, SIREN, RCS

### Table: `proformas`
Stocke les proformas et factures :
- Type (PROFORMA ou FACTURE)
- Numéro
- Date
- Client (nom, téléphone)
- Items (produits/services)
- Réduction
- Total

---

## 🔐 Sécurité (RLS)

Les tables sont protégées par **Row Level Security (RLS)** :
- ✅ Chaque utilisateur ne voit que ses propres données
- ✅ Impossible d'accéder aux données d'un autre utilisateur
- ✅ Politiques automatiques basées sur `auth.uid()`

---

## ❓ Problèmes Courants

### Erreur: "permission denied for schema auth"
**Solution:** Vous n'avez pas les droits. Utilisez le compte propriétaire du projet Supabase.

### Erreur: "relation already exists"
**Solution:** Les tables existent déjà. Pas de problème, le SQL utilise `IF NOT EXISTS`.

### Les données ne se sauvegardent toujours pas
**Solution:** 
1. Vérifier que vous êtes bien connecté (voir l'icône utilisateur)
2. Ouvrir la console (F12) et regarder les erreurs
3. Vérifier que les tables existent dans Table Editor

---

## 🆘 Besoin d'Aide ?

Si ça ne fonctionne toujours pas :

1. **Copier les erreurs** de la console (F12)
2. **Faire une capture d'écran** du SQL Editor après exécution
3. **Vérifier** dans Table Editor que les tables existent

---

## ✅ Checklist Finale

- [ ] SQL exécuté sans erreur dans Supabase
- [ ] Tables `company_settings` et `proformas` visibles dans Table Editor
- [ ] Application rafraîchie (F5)
- [ ] Paramètres modifiés et sauvegardés
- [ ] Paramètres persistent après fermeture/réouverture
- [ ] Aucune erreur 500 dans la console

---

**Une fois le SQL exécuté, vos paramètres seront sauvegardés correctement ! 🎉**
