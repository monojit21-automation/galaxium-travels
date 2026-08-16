@echo off
:: Galaxium Travels - Windows Start Script
:: Starts both backend and frontend servers in separate windows

echo.
echo  ====================================================
echo   Galaxium Travels - Starting...
echo  ====================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo         Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: ── Backend ──────────────────────────────────────────────
echo [1/2] Starting Backend Server...

:: Create virtual environment if it doesn't exist
if not exist "booking_system_backend\.venv" (
    echo       Creating Python virtual environment...
    python -m venv booking_system_backend\.venv
)

:: Install backend dependencies
echo       Installing backend dependencies...
call booking_system_backend\.venv\Scripts\activate.bat
pip install -q -r booking_system_backend\requirements.txt
call deactivate

:: Launch backend in a new window
start "Galaxium Backend - http://localhost:8081" cmd /k "cd booking_system_backend && .venv\Scripts\activate && python server.py"

echo       Backend starting on http://localhost:8081
echo.

:: ── Frontend ─────────────────────────────────────────────
echo [2/2] Starting Frontend Server...

:: Install frontend dependencies if node_modules doesn't exist
if not exist "booking_system_frontend\node_modules" (
    echo       Installing frontend dependencies...
    cd booking_system_frontend
    npm install
    cd ..
)

:: Copy .env if it doesn't exist
if not exist "booking_system_frontend\.env" (
    copy "booking_system_frontend\.env.example" "booking_system_frontend\.env" >nul
    echo       Created .env from .env.example
)

:: Launch frontend in a new window
start "Galaxium Frontend - http://localhost:5173" cmd /k "cd booking_system_frontend && npm run dev"

echo       Frontend starting on http://localhost:5173
echo.
echo  ====================================================
echo   Galaxium Travels is running!
echo.
echo    Frontend:  http://localhost:5173
echo    Backend:   http://localhost:8081
echo    API Docs:  http://localhost:8081/docs
echo    MCP:       http://localhost:8081/mcp
echo.
echo   Close the opened terminal windows to stop servers.
echo  ====================================================
echo.
pause
