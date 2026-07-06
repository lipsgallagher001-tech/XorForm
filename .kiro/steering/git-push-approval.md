---
inclusion: always
---

# Règle : Demander avant de pusher

Avant d'exécuter **toute commande git push** (qu'il s'agisse d'un push direct, d'un push vers une branche, ou d'un push avec force), tu dois **obligatoirement demander une confirmation explicite à l'utilisateur**.

## Comportement attendu

1. Après avoir terminé des modifications sur le projet, **ne jamais pusher automatiquement**.
2. Résumer les changements effectués.
3. Poser la question : **"Veux-tu que je push ces modifications sur le dépôt distant ?"**
4. Attendre une réponse claire de l'utilisateur (oui / non / plus tard).
5. Seulement si l'utilisateur confirme → exécuter le push.

## Ce qui est interdit sans confirmation

- `git push`
- `git push origin <branche>`
- `git push --force` / `git push -f`
- Tout alias ou commande qui déclenche un push

## Ce qui est autorisé sans confirmation

- `git add`
- `git commit`
- `git status`
- `git diff`
- `git log`
- Toute modification de fichiers

## Exemple de message attendu

> J'ai effectué les modifications suivantes :
> - [liste des fichiers modifiés]
>
> Veux-tu que je push ces changements sur le dépôt distant ?
