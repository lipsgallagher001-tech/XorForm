# Intégration Supabase - Guide de développement

## Fichiers créés

1. **`src/lib/supabase.ts`** : Configuration du client Supabase et types TypeScript
2. **`supabase-schema.sql`** : Script SQL pour créer les tables
3. **`.env`** : Variables d'environnement (à configurer avec vos clés)
4. **`SUPABASE_SETUP.md`** : Guide complet d'installation

## Prochaines étapes d'intégration

### 1. Modifier l'authentification

Actuellement, l'authentification utilise localStorage. Il faut la remplacer par Supabase Auth :

**Dans `src/Login.tsx` et `src/Register.tsx`** :
- Utiliser `supabase.auth.signInWithPassword()` pour la connexion
- Utiliser `supabase.auth.signUp()` pour l'inscription
- Utiliser `supabase.auth.signOut()` pour la déconnexion

### 2. Synchroniser les données

**Proformas** :
- Sauvegarder dans Supabase au lieu de localStorage
- Charger depuis Supabase au démarrage
- Synchronisation automatique

**Paramètres d'entreprise** :
- Sauvegarder dans `company_settings` table
- Charger au démarrage de l'application

### 3. Gestion des sessions

- Utiliser `supabase.auth.onAuthStateChange()` pour détecter les changements d'authentification
- Stocker la session dans le state React
- Rediriger automatiquement selon l'état de connexion

## Exemple d'utilisation

```typescript
import { supabase } from './lib/supabase';

// Inscription
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      name: 'John Doe',
      company: 'My Company'
    }
  }
});

// Connexion
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sauvegarder un proforma
const { data, error } = await supabase
  .from('proformas')
  .insert({
    user_id: user.id,
    type: 'PROFORMA',
    number: 'PF-2024-001',
    date: new Date().toISOString(),
    client_name: 'Client Name',
    client_phone: '+33612345678',
    items: JSON.stringify(items),
    discount_percent: 5,
    total: 1000
  });

// Charger les proformas
const { data, error } = await supabase
  .from('proformas')
  .select('*')
  .order('date', { ascending: false });
```

## Avantages de Supabase

✅ **Authentification sécurisée** : Gestion des mots de passe, sessions, tokens
✅ **Base de données PostgreSQL** : Puissante et fiable
✅ **Row Level Security** : Sécurité au niveau des lignes
✅ **Temps réel** : Synchronisation automatique entre appareils
✅ **Stockage de fichiers** : Pour les logos, signatures, cachets
✅ **API REST automatique** : Pas besoin de créer un backend
✅ **Gratuit jusqu'à 500 Mo** : Parfait pour commencer

## Migration des données

Pour migrer les données existantes de localStorage vers Supabase :

1. Créer un script de migration
2. Lire les données de localStorage
3. Les insérer dans Supabase
4. Vider localStorage après confirmation

## Sécurité

⚠️ **Important** :
- Ne jamais commiter le fichier `.env`
- Utiliser les politiques RLS pour protéger les données
- Valider les données côté serveur (Supabase Functions si nécessaire)
- Utiliser HTTPS en production

## Support et documentation

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
