# Modifications pour résoudre le problème de déconnexion lors de la création d'un utilisateur

## Problème

Lorsqu'un administrateur crée un nouvel utilisateur, il est automatiquement déconnecté et doit se reconnecter. Ce comportement est dû au fait que Firebase Authentication déconnecte automatiquement l'utilisateur actuel lorsqu'un nouvel utilisateur est créé avec `createUserWithEmailAndPassword`.

## Solution

Pour résoudre ce problème, nous avons créé une fonction Cloud Firebase qui permet de créer un nouvel utilisateur sans déconnecter l'administrateur. Cette fonction est appelée depuis le composant `UserManagement.tsx` et utilise l'API Admin de Firebase pour créer l'utilisateur.

## Fichiers modifiés

1. **src/firebase.ts**
   - Ajout de l'import pour les fonctions Cloud Firebase
   - Initialisation du service Firebase Functions
   - Export de la fonction `createUserWithoutSignOut`

2. **src/components/UserManagement.tsx**
   - Modification de la fonction `handleSaveNewUser` pour utiliser la fonction Cloud Firebase
   - Simplification du code de création d'utilisateur
   - Amélioration de la gestion des erreurs

## Nouveaux fichiers

1. **functions/src/createUser.js**
   - Implémentation de la fonction Cloud Firebase `createUserWithoutSignOut`
   - Vérification des droits d'administrateur
   - Création de l'utilisateur dans Firebase Authentication et Firestore
   - Génération d'un lien de réinitialisation de mot de passe

2. **functions/src/index.js**
   - Export de la fonction Cloud Firebase

3. **functions/package.json**
   - Configuration des dépendances pour les fonctions Cloud Firebase

4. **functions/README.md**
   - Documentation pour le déploiement des fonctions Cloud Firebase

## Déploiement

Pour déployer les fonctions Cloud Firebase, suivez les instructions dans le fichier `functions/README.md`.

## Remarques

- La fonction Cloud Firebase nécessite un plan Blaze (pay-as-you-go) pour être déployée.
- La vérification des droits d'administrateur est actuellement basée sur l'email de l'utilisateur. Vous devrez peut-être modifier cette vérification pour l'adapter à votre cas d'utilisation.
- La fonction Cloud Firebase génère un lien de réinitialisation de mot de passe et l'envoie à l'utilisateur nouvellement créé. 