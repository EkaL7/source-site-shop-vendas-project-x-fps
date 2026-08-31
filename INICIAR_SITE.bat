@echo off
setlocal EnableExtensions
title KittyFPS - Iniciar Site

rem Evita problemas de acentuacao em alguns PCs
chcp 65001 >nul

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo ============================
echo   KittyFPS - DEV SERVER
echo ============================
echo.

where node >nul 2>nul
if errorlevel 1 goto :NO_NODE

where npm >nul 2>nul
if errorlevel 1 goto :NO_NPM

if not exist "node_modules\\nul" goto :INSTALL
goto :START

:INSTALL
echo Instalando dependencias (primeira vez)...
call npm.cmd install
if errorlevel 1 goto :NPM_INSTALL_FAIL

:START
echo.
echo Iniciando o site...
echo (Para parar: volte aqui e aperte CTRL + C)
echo.
echo Abrindo no navegador: http://localhost:5173/
echo Se a porta 5173 estiver ocupada, veja a porta correta no terminal.
start "" "http://localhost:5173/"
echo.
call npm.cmd run dev -- --host
echo.
pause
exit /b 0

:NO_NODE
echo [ERRO] Node.js nao encontrado.
echo Instale o Node.js e tente novamente.
echo.
pause
exit /b 1

:NO_NPM
echo [ERRO] npm nao encontrado.
echo Reinstale o Node.js (com npm) e tente novamente.
echo.
pause
exit /b 1

:NPM_INSTALL_FAIL
echo.
echo [ERRO] Falha ao instalar dependencias.
pause
exit /b 1

