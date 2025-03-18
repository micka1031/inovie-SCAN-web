# Résolution de l'erreur CORS

## Problème

Vous rencontrez une erreur CORS lors de la création d'un nouvel utilisateur :

```
Access to fetch at 'https://us-central1-application-inovie-scan.cloudfunctions.net/createUserWithoutSignOut' from origin 'http://localhost:3005' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Cette erreur se produit car l'application essaie toujours d'appeler la fonction Cloud Firebase `createUserWithoutSignOut`, mais nous avons mis en place une solution alternative qui n'utilise pas les fonctions Cloud.

## Cause

Il y a plusieurs raisons possibles à ce problème :

1. **Cache du navigateur** : Le navigateur a mis en cache l'ancienne version du code qui fait référence à la fonction Cloud.
2. **Reconstruction incomplète** : L'application n'a pas été correctement reconstruite après les modifications.
3. **Référence persistante** : Il reste une référence à la fonction Cloud quelque part dans le code.

## Solution

Voici les étapes à suivre pour résoudre ce problème :

### 1. Vider le cache du navigateur

1. Ouvrez les outils de développement (F12 ou Ctrl+Shift+I)
2. Cliquez sur l'onglet "Application" (ou "Storage" dans certains navigateurs)
3. Dans la section "Storage", cochez "Clear site data" ou "Clear storage"
4. Cliquez sur le bouton "Clear site data" ou "Clear storage"
5. Rechargez la page

### 2. Reconstruire l'application

1. Arrêtez le serveur de développement (Ctrl+C dans le terminal)
2. Supprimez le dossier `node_modules/.vite` s'il existe
3. Exécutez la commande suivante pour reconstruire l'application :

```bash
npm run build
```

4. Redémarrez le serveur de développement :

```bash
npm run dev
```

### 3. Vérifier les imports

Assurez-vous que tous les fichiers importent la fonction `createUserWithoutSignOut` depuis le service et non depuis Firebase :

```typescript
// Correct
import { createUserWithoutSignOut } from '../services/userService';

// Incorrect
import { createUserWithoutSignOut } from '../firebase';
```

### 4. Vérifier le fichier firebase.ts

Assurez-vous que le fichier `firebase.ts` ne contient plus de références aux fonctions Cloud :

```typescript
// Ces lignes doivent être supprimées
import { getFunctions, httpsCallable } from 'firebase/functions';
const functions = getFunctions(app);
const createUserWithoutSignOut = httpsCallable(functions, 'createUserWithoutSignOut');
```

Et que la fonction n'est pas exportée :

```typescript
export { 
    // createUserWithoutSignOut doit être supprimé de cette liste
    app, 
    auth, 
    db,
    // ...
};
```

## Vérification

Pour vérifier que la solution fonctionne correctement :

1. Ouvrez la console du navigateur (F12 > Console)
2. Essayez de créer un nouvel utilisateur
3. Vous ne devriez plus voir d'erreur CORS
4. Vous devriez voir un modal vous demandant vos identifiants administrateur
5. Après avoir saisi vos identifiants, l'utilisateur devrait être créé sans vous déconnecter

Si vous rencontrez toujours des problèmes, essayez de redémarrer complètement votre navigateur ou d'utiliser un autre navigateur pour tester. 