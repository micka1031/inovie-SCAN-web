@echo off
echo Démarrage de l'application Inovie SCAN en mode développement...
cd /d %~dp0
call npx vite --port 3005
pause 