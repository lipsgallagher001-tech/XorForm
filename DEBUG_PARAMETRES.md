# 🔍 Guide de Débogage - Paramètres Non Chargés

## Problème
Les paramètres sont dans Supabase mais ne s'affichent pas dans l'application.

---

## ✅ Étapes de Vérification

### 1. Vérifier la Console du Navigateur

Ouvrez la console (F12) et cherchez ces messages :

#### Messages attendus au chargement :
```
📥 Chargement des données utilisateur... {userId: "xxx"}
📥 Chargement des paramètres depuis Supabase... {userId: "xxx"}
📦 Paramètres chargés: {name: "...", address: "...", ...}
✅ Paramètres chargés depuis Supabase: {...}
✅ Application des paramètres chargés
```

#### Si vous voyez :
```
⚠️ Aucun paramètre trouvé (nouvel utilisateur)
```
→ Les paramètres ne sont pas dans Supabase pour cet utilisateur

#### Si vous voyez :
```
❌ Erreur Supabase: {...}
```
→ Problème de connexion ou de permissions

---

### 2. Vérifier l'User ID

Dans la console, notez le `userId` affiché dans les logs.

Puis dans Supabase Dashboard :
1. Allez dans **Table Editor**
2. Ouvrez la table `company_settings`
3. Vérifiez que le `user_id` correspond

**Important** : Le `user_id` doit être **exactement le même** !

---

### 3. Vérifier les Données dans Supabase

Dans Supabase Dashboard → Table Editor → `company_settings` :

Vérifiez que la ligne contient :
- ✅ `user_id` : UUID de l'utilisateur
- ✅ `name` : Nom de l'entreprise
- ✅ `address` : Adresse
- ✅ `email` : Email
- ✅ `phone` : Téléphone

---

### 4. Vérifier les Permissions RLS

Dans Supabase Dashboard → Authentication → Policies :

Pour la table `company_settings`, vous devez avoir :
- ✅ Policy "Users can view their own settings"
- ✅ Policy "Users can insert their own settings"
- ✅ Policy "Users can update their own settings"

---

### 5. Test Manuel de Chargement

Dans la console du navigateur, exécutez :

```javascript
// Récupérer l'user ID actuel
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user.id);

// Tester le chargement
const { data, error } = await supabase
  .from('company_settings')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle();

console.log('Data:', data);
console.log('Error:', error);
```

#### Résultats possibles :

**✅ Succès** :
```javascript
Data: {name: "...", address: "...", ...}
Error: null
```

**❌ Pas de données** :
```javascript
Data: null
Error: null
```
→ Les paramètres n'existent pas pour cet utilisateur

**❌ Erreur de permission** :
```javascript
Data: null
Error: {code: "42501", message: "permission denied"}
```
→ Problème de RLS, vérifiez les policies

**❌ Table non trouvée** :
```javascript
Data: null
Error: {code: "42P01", message: "relation does not exist"}
```
→ La table n'existe pas, exécutez `supabase-schema-fixed.sql`

---

## 🔧 Solutions par Problème

### Problème 1 : User ID différent

**Symptôme** : Le `user_id` dans Supabase ne correspond pas au `userId` dans les logs

**Solution** :
1. Notez le `userId` dans les logs de la console
2. Dans Supabase, mettez à jour le `user_id` dans `company_settings`
3. Ou supprimez la ligne et sauvegardez à nouveau depuis l'app

---

### Problème 2 : Permissions RLS

**Symptôme** : Erreur "permission denied" dans la console

**Solution** :
1. Allez dans Supabase Dashboard → SQL Editor
2. Exécutez :

```sql
-- Vérifier les policies existantes
SELECT * FROM pg_policies WHERE tablename = 'company_settings';

-- Si aucune policy, exécutez supabase-schema-fixed.sql
```

---

### Problème 3 : Données corrompues

**Symptôme** : Les données sont dans Supabase mais ne s'affichent pas

**Solution** :
1. Vérifiez que tous les champs requis sont remplis :
   - `name` (non null)
   - `address` (non null)
   - `email` (non null)
   - `phone` (non null)

2. Si un champ est NULL, mettez une valeur par défaut

---

### Problème 4 : Cache du navigateur

**Symptôme** : Les anciennes valeurs s'affichent

**Solution** :
1. Ouvrez la console (F12)
2. Allez dans **Application** → **Storage** → **Local Storage**
3. Supprimez toutes les clés `company_settings_*`
4. Rechargez la page (Ctrl+F5)

---

## 🚀 Forcer le Rechargement

Si rien ne fonctionne, forcez le rechargement :

1. **Déconnectez-vous** de l'application
2. **Supprimez le cache** :
   - Ouvrez la console (F12)
   - Application → Storage → Clear site data
3. **Reconnectez-vous**
4. Les paramètres devraient se charger

---

## 📞 Support

Si le problème persiste après toutes ces vérifications :

1. **Copiez les logs de la console** (tout le texte)
2. **Faites une capture d'écran** de la table `company_settings` dans Supabase
3. **Notez le User ID** affiché dans les logs
4. Contactez le support avec ces informations

---

## ✅ Checklist Rapide

- [ ] Console ouverte (F12)
- [ ] Logs visibles dans la console
- [ ] User ID noté
- [ ] User ID vérifié dans Supabase
- [ ] Données présentes dans `company_settings`
- [ ] Policies RLS vérifiées
- [ ] Cache navigateur vidé
- [ ] Déconnexion/Reconnexion testée

---

**Généré par** : Kiro AI Assistant  
**Date** : 29 Mai 2026
