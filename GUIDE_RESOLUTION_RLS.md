# 🔧 Guide de Résolution - Problème de Chargement des Paramètres

## 📋 Symptômes

- ✅ Les données sont dans Supabase (table `company_settings`)
- ❌ L'application affiche les valeurs par défaut
- ❌ Les paramètres ne se chargent pas

---

## 🎯 Solution en 3 Étapes

### Étape 1 : Ouvrir la Console du Navigateur

1. Ouvrez votre application
2. Appuyez sur **F12** pour ouvrir la console
3. Rechargez la page (**Ctrl+R** ou **F5**)

### Étape 2 : Analyser les Logs

Cherchez ces messages dans la console :

#### ✅ Si vous voyez :
```
📥 [LOAD] Chargement des paramètres depuis Supabase...
📥 [LOAD] User ID: xxx-xxx-xxx
📥 [LOAD] Résultat Supabase: {hasData: true, hasError: false, ...}
✅ [LOAD] Paramètres chargés avec succès depuis Supabase
```
→ **Tout fonctionne !** Les paramètres sont chargés.

#### ❌ Si vous voyez :
```
🔒 [LOAD] PROBLÈME DE PERMISSIONS RLS !
🔒 [LOAD] Les policies RLS bloquent la lecture.
```
→ **Problème RLS** - Passez à l'Étape 3

#### ❌ Si vous voyez :
```
⚠️ [LOAD] Aucun paramètre trouvé pour cet utilisateur
⚠️ [LOAD] User ID recherché: xxx-xxx-xxx
```
→ **User ID différent** - Voir Solution B ci-dessous

### Étape 3 : Exécuter le Script de Correction

1. Ouvrez **Supabase Dashboard**
2. Allez dans **SQL Editor**
3. Cliquez sur **New Query**
4. Copiez le contenu du fichier `fix_company_settings_rls.sql`
5. Collez-le dans l'éditeur
6. Cliquez sur **Run** (ou **Ctrl+Enter**)

#### Résultat attendu :
```
✅ 4 policies créées (SELECT, INSERT, UPDATE, DELETE)
✅ RLS activé
✅ Test de lecture réussi
```

7. **Rechargez votre application** (Ctrl+F5)
8. **Vérifiez la console** - Les paramètres devraient maintenant se charger

---

## 🔍 Solutions Alternatives

### Solution A : Vérifier les Policies RLS

Dans Supabase Dashboard → **Authentication** → **Policies** :

Vérifiez que ces 4 policies existent pour `company_settings` :

| Policy | Type | Condition |
|--------|------|-----------|
| Users can view their own settings | SELECT | `auth.uid() = user_id` |
| Users can insert their own settings | INSERT | `auth.uid() = user_id` |
| Users can update their own settings | UPDATE | `auth.uid() = user_id` |
| Users can delete their own settings | DELETE | `auth.uid() = user_id` |

Si elles manquent → Exécutez `fix_company_settings_rls.sql`

---

### Solution B : Corriger le User ID

Si le User ID ne correspond pas :

1. **Notez le User ID** affiché dans la console :
   ```
   📥 [LOAD] User ID: abc-123-def-456
   ```

2. Dans Supabase Dashboard → **Table Editor** → `company_settings`

3. **Vérifiez le `user_id`** dans la table

4. **Si différent**, mettez à jour :
   ```sql
   UPDATE company_settings 
   SET user_id = 'abc-123-def-456'  -- Remplacez par le User ID de la console
   WHERE user_id = 'ancien-user-id';
   ```

5. **Rechargez l'application**

---

### Solution C : Désactiver Temporairement RLS (Test Uniquement)

⚠️ **ATTENTION** : À utiliser UNIQUEMENT pour tester !

Dans Supabase Dashboard → **SQL Editor** :

```sql
-- Désactiver RLS temporairement
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
```

Rechargez l'application :
- ✅ **Si ça fonctionne** → Le problème vient bien de RLS
- ❌ **Si ça ne fonctionne pas** → Le problème est ailleurs

**Réactivez RLS immédiatement** :
```sql
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
```

Puis exécutez `fix_company_settings_rls.sql` pour corriger les policies.

---

## 📊 Diagnostic Complet

### Test Manuel dans Supabase

Dans **SQL Editor**, exécutez :

```sql
-- 1. Vérifier votre User ID
SELECT auth.uid() as "Mon User ID";

-- 2. Vérifier les données dans company_settings
SELECT user_id, name, email 
FROM company_settings;

-- 3. Tester la lecture avec RLS
SELECT * 
FROM company_settings 
WHERE user_id = auth.uid();
```

#### Résultats attendus :

**Requête 1** : Affiche votre User ID actuel
```
Mon User ID: abc-123-def-456
```

**Requête 2** : Affiche toutes les lignes (si vous êtes admin)
```
user_id              | name           | email
---------------------|----------------|------------------
abc-123-def-456      | Mon Entreprise | contact@email.com
```

**Requête 3** : Affiche VOS paramètres uniquement
```
✅ 1 ligne retournée → RLS fonctionne correctement
❌ 0 ligne retournée → Problème RLS ou User ID différent
```

---

## ✅ Checklist de Vérification

Après avoir appliqué les solutions :

- [ ] Console ouverte (F12)
- [ ] Logs `[LOAD]` visibles
- [ ] Script `fix_company_settings_rls.sql` exécuté
- [ ] 4 policies créées dans Supabase
- [ ] User ID vérifié et correspond
- [ ] Application rechargée (Ctrl+F5)
- [ ] Paramètres chargés avec succès
- [ ] Message `✅ [LOAD] Paramètres chargés avec succès` visible

---

## 🆘 Si le Problème Persiste

1. **Copiez tous les logs de la console** (Ctrl+A dans la console, Ctrl+C)
2. **Faites une capture d'écran** de la table `company_settings`
3. **Notez le User ID** affiché dans les logs
4. **Vérifiez les policies** dans Supabase Dashboard
5. Contactez le support avec ces informations

---

## 📁 Fichiers Utiles

- `fix_company_settings_rls.sql` - Script de correction RLS
- `DEBUG_PARAMETRES.md` - Guide de débogage détaillé
- `supabase-schema-fixed.sql` - Schéma complet de la base

---

**Généré par** : Kiro AI Assistant  
**Date** : 29 Mai 2026  
**Version** : 1.2.0
