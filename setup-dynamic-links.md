# Guide de configuration des liens dynamiques Firebase

## Étape 1 : Déployer la configuration Firebase

Exécutez la commande suivante pour déployer la configuration Firebase :

```bash
firebase deploy --only hosting
```

## Étape 2 : Configurer les liens dynamiques dans la console Firebase

1. Accédez à la [console Firebase](https://console.firebase.google.com/project/application-inovie-scan/overview)
2. Dans le menu de gauche, cliquez sur "Engagement" puis sur "Dynamic Links"
3. Cliquez sur "Commencer" ou "Ajouter un préfixe d'URL" selon ce qui est affiché
4. Choisissez un domaine pour vos liens dynamiques :
   - Sélectionnez "Créer un domaine page.link" et entrez "application-inovie-scan" comme préfixe
   - Ou sélectionnez "Utiliser un domaine personnalisé" et entrez "application-inovie-scan-links.web.app"
5. Cliquez sur "Suivant" et suivez les instructions pour terminer la configuration

## Étape 3 : Tester les liens dynamiques

Après avoir configuré les liens dynamiques, vous pouvez les tester en utilisant le bouton "Tester la redirection" dans l'application.

## Remarque importante

Firebase Dynamic Links est déprécié et sera arrêté le 25 août 2025. Il est recommandé de prévoir une migration vers une autre solution à long terme. 