@echo off
:: Wealth Manager - Startup Script
title Wealth Manager - Inicializador

echo ===================================================
echo   Wealth Manager - Sistema Financeiro Pessoal
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Verificar se a pasta node_modules existe
if not exist "node_modules\" (
    echo [INFO] Pasta node_modules nao encontrada.
    echo [INFO] Instalando as dependencias do projeto. Por favor, aguarde...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar as dependencias. Verifique se o Node.js esta instalado.
        pause
        exit /b %errorlevel%
    )
    echo [SUCESSO] Dependencias instaladas com sucesso!
    echo.
)

:: 2. Iniciar o servidor de desenvolvimento do Vite (Frontend + Servidor local)
echo [INFO] Iniciando o servidor de desenvolvimento (Vite)...
echo [INFO] A aplicacao abrira no navegador automaticamente.
echo.

:: Abre o navegador local (geralmente localhost:5173 eh o padrão do Vite, mas se o Vite abrir em outra porta ele informará no terminal)
start http://localhost:5173

:: Inicia o dev server
call npm run dev

pause
