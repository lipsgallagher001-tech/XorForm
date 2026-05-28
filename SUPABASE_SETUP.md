# Configuration Supabase pour XorForm

## Étape 1 : Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un compte ou se connecter
3. Cliquer sur "New Project"
4. Remplir les informations :
   - **Name** : XorForm
   - **Database Password** : Choisir un mot de passe fort
   - **Region** : Choisir la région la plus proche (ex: Europe West)
5. Cliquer sur "Create new project"
6. Attendre quelques minutes que le projet soit créé

## Étape 2 : Obtenir les clés API

1. Dans le dashboard Supabase, aller dans **Settings** (icône engrenage en bas à gauche)
2. Cliquer sur **API** dans le menu latéral
3. Copier les informations suivantes :
   - **Project URL** (commence par `https://...supabase.co`)
   - **anon public** key (la clé publique)

## Étape 3 : Configurer les variables d'environnement

1. Ouvrir le fichier `.env` à la racine du projet
2. Remplacer les valeurs par vos clés :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_publique
```

3. **IMPORTANT** : Ne jamais commiter le fichier `.env` sur GitHub (il est déjà dans `.gitignore`)

## Étape 4 : Créer les tables dans Supabase

1. Dans le dashboard Supabase, aller dans **SQL Editor** (icône base de données)
2. Cliquer sur **New query**
3. Copier tout le contenu du fichier `supabase-schema.sql`
4. Coller dans l'éditeur SQL
5. Cliquer sur **Run** (ou Ctrl+Enter)
6. Vérifier qu'il n'y a pas d'erreurs

## Étape 5 : Configurer l'authentification

1. Dans le dashboard Supabase, aller dans **Authentication** > **Providers**
2. Activer **Email** (devrait être activé par défaut)
3. Dans **Authentication** > **URL Configuration**, configurer :
   - **Site URL** : `http://localhost:5173` (pour le développement)
   - **Redirect URLs** : Ajouter `http://localhost:5173/**`

## Étape 6 : Vérifier les tables

1. Aller dans **Table Editor**
2. Vous devriez voir 3 tables :
   - `users` : Stocke les utilisateurs
   - `company_settings` : Stocke les paramètres d'entreprise
   - `proformas` : Stocke les proformas et factures

## Étape 7 : Tester la connexion

1. Redémarrer le serveur de développement :
   ```bash
   npm run dev
   ```

2. Ouvrir l'application dans le navigateur
3. Essayer de créer un compte
4. Vérifier dans Supabase **Authentication** > **Users** que l'utilisateur a été créé

## Structure de la base de données

### Table `users`
- `id` : UUID (clé primaire)
- `email` : Email unique
- `name` : Nom de l'utilisateur
- `company` : Nom de l'entreprise
- `password_hash` : Hash du mot de passe
- `created_at` : Date de création

### Table `company_settings`
- `id` : UUID (clé primaire)
- `user_id` : Référence vers users
- `name`, `address`, `email`, `phone` : Infos entreprise
- `logo`, `signature`, `stamp` : Images en base64
- `logo_width`, `logo_height`, etc. : Dimensions
- `watermark`, `services` : Textes personnalisés
- `siret`, `siren`, `rcs` : Infos légales

### Table `proformas`
- `id` : UUID (clé primaire)
- `user_id` : Référence vers users
- `type` : 'PROFORMA' ou 'FACTURE'
- `number` : Numéro du document
- `date` : Date du document
- `client_name`, `client_phone` : Infos client
- `items` : JSON des articles
- `discount_percent` : Pourcentage de réduction
- `total` : Montant total

## Sécurité (Row Level Security)

Les politiques RLS sont activées pour garantir que :
- Chaque utilisateur ne peut voir que ses propres données
- Impossible d'accéder aux données d'un autre utilisateur
- Les opérations CRUD sont limitées aux données de l'utilisateur connecté

## Prochaines étapes

Une fois Supabase configuré, l'application va :
1. Stocker les utilisateurs dans Supabase au lieu de localStorage
2. Sauvegarder les proformas dans la base de données
3. Synchroniser les paramètres d'entreprise
4. Permettre l'accès depuis n'importe quel appareil

## Support

En cas de problème :
1. Vérifier que les clés API sont correctes dans `.env`
2. Vérifier que les tables ont été créées correctement
3. Consulter les logs dans **Logs** > **Postgres Logs** dans Supabase
4. Vérifier la console du navigateur pour les erreurs JavaScript
