@echo off
echo ===================================
echo Nettoyage et reconstruction de l'application
echo ===================================

echo.
echo 1. Nettoyage du cache...
if exist "node_modules\.vite" (
    echo Suppression du dossier node_modules\.vite
    rmdir /s /q "node_modules\.vite"
) else (
    echo Le dossier node_modules\.vite n'existe pas, aucune action nécessaire
)

if exist "dist" (
    echo Suppression du dossier dist
    rmdir /s /q "dist"
) else (
    echo Le dossier dist n'existe pas, aucune action nécessaire
)

echo.
echo 2. Installation des dépendances...
call npm install

echo.
echo 3. Reconstruction de l'application...
call npm run build

echo.
echo 4. Démarrage du serveur de développement...
echo Pour démarrer le serveur, exécutez la commande suivante :
echo npm run dev
echo.

echo ===================================
echo Nettoyage et reconstruction terminés
echo ===================================

pause 