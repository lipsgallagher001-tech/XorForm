# 🔄 Guide de Restauration de la Base de Données

## 📋 Vue d'Ensemble

Ce guide explique comment restaurer complètement la base de données XorForm avec le script `supabase-init.sql`.

---

## ⚠️ ATTENTION

**Ce script va SUPPRIMER toutes les données existantes !**

Avant de continuer :
- [ ] Sauvegarder vos données actuelles (si nécessaire)
- [ ] Vérifier que vous êtes sur le bon projet Supabase
- [ ] Lire ce guide en entier

---

## 🚀 Procédure de Restauration

### Étape 1 : Ouvrir Supabase Dashboard

1. Aller sur https://supabase.com
2. Se connecter à votre compte
3. Sélectionner votre projet **XorForm**

### Étape 2 : Ouvrir le SQL Editor

1. Dans le menu de gauche, cliquer sur **"SQL Editor"** (icône 📝)
2. Cliquer sur **"New query"**

### Étape 3 : Copier le Script

1. Ouvrir le fichier `supabase-init.sql`
2. **Copier TOUT le contenu** (Ctrl+A puis Ctrl+C)
3. **Coller** dans le SQL Editor de Supabase (Ctrl+V)

### Étape 4 : Exécuter le Script

1. Cliquer sur le bouton **"Run"** (ou Ctrl+Enter)
2. Attendre l'exécution (environ 5-10 secondes)
3. Vérifier les résultats

### Étape 5 : Vérifier les Résultats

Vous devriez voir plusieurs sections de résultats :

#### ✅ Section 1 : Comptage des lignes
```
table_name         | row_count
-------------------|----------
company_settings   | 0
proformas          | 0
```

#### ✅ Section 2 : RLS activé
```
schemaname | tablename         | RLS Activé
-----------|-------------------|------------
public     | company_settings  | true
public     | proformas         | true
```

#### ✅ Section 3 : Policies créées
```
Table             | Policy                              | Commande
------------------|-------------------------------------|----------
company_settings  | Users can view their own settings   | SELECT
company_settings  | Users can insert their own settings | INSERT
company_settings  | Users can update their own settings | UPDATE
company_settings  | Users can delete their own settings | DELETE
proformas         | Users can view their own proformas  | SELECT
proformas         | Users can insert their own proformas| INSERT
proformas         | Users can update their own proformas| UPDATE
proformas         | Users can delete their own proformas| DELETE
```

#### ✅ Section 4 : Indexes créés
```
Table             | Index
------------------|----------------------------------
company_settings  | company_settings_pkey
company_settings  | idx_company_settings_user_id
company_settings  | unique_user_settings
proformas         | proformas_pkey
proformas         | idx_proformas_user_id
proformas         | idx_proformas_date
proformas         | idx_proformas_number
proformas         | idx_proformas_type
proformas         | idx_proformas_items
proformas         | unique_user_number
```

#### ✅ Message de succès
```
✅ Base de données initialisée avec succès !
📊 Tables créées: company_settings, proformas
🔒 RLS activé avec 8 policies
⚡ 6 indexes créés pour la performance
🔄 Triggers updated_at configurés
```

---

## 🧪 Tester la Connexion

### Depuis l'Application

1. **Vider le cache** du navigateur :
```javascript
// Dans la console (F12)
localStorage.clear();
location.reload();
```

2. **Se connecter** à l'application

3. **Ouvrir les paramètres** entreprise

4. **Remplir les informations** :
   - Nom commercial
   - Adresse
   - Email
   - Téléphone

5. **Cliquer sur "Enregistrer"**

6. **Vérifier** que les données sont sauvegardées :
   - Fermer les paramètres
   - Rouvrir les paramètres
   - Les données devraient être là ✅

### Depuis Supabase

1. Aller dans **Table Editor**
2. Ouvrir la table `company_settings`
3. Vérifier qu'une ligne a été créée avec vos données

---

## 📊 Structure de la Base de Données

### Table : company_settings

```sql
Colonnes:
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── name (VARCHAR, REQUIS)
├── address (TEXT, REQUIS)
├── email (VARCHAR, REQUIS)
├── phone (VARCHAR, REQUIS)
├── logo (TEXT, base64)
├── logo_width, logo_height (NUMERIC)
├── signature (TEXT, base64)
├── signature_width, signature_height (NUMERIC)
├── stamp (TEXT, base64)
├── stamp_width, stamp_height (NUMERIC)
├── watermark (VARCHAR)
├── services (TEXT)
├── siret (VARCHAR, 14 chiffres)
├── siren (VARCHAR, 9 chiffres)
├── rcs (VARCHAR)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Contraintes:
├── UNIQUE(user_id) - Un seul paramétrage par utilisateur
├── CHECK email valide
├── CHECK siret 14 chiffres
└── CHECK siren 9 chiffres

Indexes:
└── idx_company_settings_user_id
```

### Table : proformas

```sql
Colonnes:
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── type (VARCHAR, PROFORMA ou FACTURE)
├── number (VARCHAR, REQUIS)
├── date (TIMESTAMPTZ)
├── client_name (VARCHAR, REQUIS)
├── client_phone (VARCHAR)
├── items (JSONB, articles)
├── discount_percent (NUMERIC, 0-100)
├── total (NUMERIC, >= 0)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

Contraintes:
├── UNIQUE(user_id, number) - Numéro unique par utilisateur
├── CHECK type IN ('PROFORMA', 'FACTURE')
├── CHECK discount_percent 0-100
└── CHECK total >= 0

Indexes:
├── idx_proformas_user_id
├── idx_proformas_date (DESC)
├── idx_proformas_number
├── idx_proformas_type
└── idx_proformas_items (GIN)
```

---

## 🔒 Sécurité (RLS)

### Policies Appliquées

Chaque utilisateur peut **UNIQUEMENT** :
- ✅ Voir ses propres données (`auth.uid() = user_id`)
- ✅ Créer ses propres données
- ✅ Modifier ses propres données
- ✅ Supprimer ses propres données

**Impossible** :
- ❌ Voir les données d'un autre utilisateur
- ❌ Modifier les données d'un autre utilisateur
- ❌ Supprimer les données d'un autre utilisateur

---

## ⚡ Performance

### Indexes Créés

Les indexes suivants optimisent les requêtes :

1. **idx_company_settings_user_id** : Recherche par utilisateur
2. **idx_proformas_user_id** : Recherche par utilisateur
3. **idx_proformas_date** : Tri par date (DESC)
4. **idx_proformas_number** : Recherche par numéro
5. **idx_proformas_type** : Filtrage par type
6. **idx_proformas_items** : Recherche dans les articles (GIN)

**Gain estimé** : +50% de vitesse sur les requêtes

### Triggers

- **update_updated_at** : Met à jour automatiquement `updated_at` lors des modifications

---

## 🔧 Maintenance

### Sauvegarder la Base de Données

Dans Supabase Dashboard :
1. Aller dans **Settings** → **Database**
2. Cliquer sur **"Backup"**
3. Télécharger le backup

### Restaurer depuis un Backup

1. Aller dans **SQL Editor**
2. Charger le fichier de backup
3. Exécuter

### Vider les Données (Garder la Structure)

```sql
-- Vider les tables sans les supprimer
TRUNCATE TABLE proformas CASCADE;
TRUNCATE TABLE company_settings CASCADE;
```

### Supprimer Complètement

```sql
-- Supprimer les tables
DROP TABLE IF EXISTS proformas CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
```

---

## ❓ Problèmes Courants

### Erreur : "permission denied for schema auth"

**Cause** : Vous n'avez pas les droits admin

**Solution** : Utilisez le compte propriétaire du projet Supabase

### Erreur : "relation already exists"

**Cause** : Les tables existent déjà

**Solution** : Le script les supprime automatiquement, réexécutez-le

### Les données ne se sauvegardent pas

**Vérifications** :
1. ✅ RLS activé ? (voir Section 2 des résultats)
2. ✅ Policies créées ? (voir Section 3 des résultats)
3. ✅ Connecté avec le bon compte ?
4. ✅ Cache vidé ? (`localStorage.clear()`)

### Les données ne se chargent pas

**Vérifications** :
1. ✅ Ouvrir la console (F12)
2. ✅ Chercher les erreurs
3. ✅ Vérifier le user_id dans les logs
4. ✅ Comparer avec le user_id dans Supabase

---

## 📝 Données de Test (Optionnel)

Si vous voulez insérer des données de test, décommentez la section **ÉTAPE 8** dans le script :

```sql
-- Insérer des paramètres de test
INSERT INTO company_settings (
  user_id,
  name,
  address,
  email,
  phone
) VALUES (
  auth.uid(),
  'XOR COMMUNICATION',
  '123 Rue de Test, 75001 Paris',
  'contact@xorcom.fr',
  '01 23 45 67 89'
);
```

---

## ✅ Checklist Finale

Après la restauration :

- [ ] Script exécuté sans erreur
- [ ] 2 tables créées (company_settings, proformas)
- [ ] RLS activé sur les 2 tables
- [ ] 8 policies créées (4 par table)
- [ ] 6 indexes créés
- [ ] 2 triggers créés
- [ ] Application testée
- [ ] Données sauvegardées avec succès
- [ ] Données chargées avec succès
- [ ] Cache fonctionne (2ème chargement rapide)

---

## 🎉 Félicitations !

Votre base de données est maintenant **propre et optimisée** ! 🚀

### Prochaines Étapes

1. ✅ Configurer vos paramètres d'entreprise
2. ✅ Créer votre premier proforma
3. ✅ Profiter de l'application !

---

**Créé par** : Kiro AI Assistant  
**Date** : 29 Mai 2026  
**Version** : 3.0.0

