@echo off
echo Construction de l'application Inovie SCAN...
cd /d %~dp0
call npm run build
echo Construction terminée.
pause 