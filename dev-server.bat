@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "BACKEND_PORT=5000"
set "FRONTEND_PORT=3601"
set "ROOT=%~dp0"

if "%~1"=="" goto :start

if /I "%~1"=="start" goto :start
if /I "%~1"=="stop" goto :stop
if /I "%~1"=="restart" goto :restart

echo Usage: %~n0 ^<start^|stop^|restart^>
echo.
echo   start   - Start both backend ^(%BACKEND_PORT%^) and frontend ^(%FRONTEND_PORT%^)
echo   stop    - Stop both services
echo   restart - Stop then start
exit /b 1

:start
call "%~f0" stop >nul
echo.
echo Starting Tech Turf full website...
echo.
echo 1. Starting Backend on port %BACKEND_PORT%...
start "Tech Turf Backend" cmd /k "cd /d ""%ROOT%backend"" && npm run dev"
timeout /t 3 /nobreak >nul

echo 2. Starting Frontend on port %FRONTEND_PORT%...
start "Tech Turf Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev"
echo.
echo ✓ Both servers started!
echo   Backend:  http://localhost:%BACKEND_PORT%
echo   Frontend: http://localhost:%FRONTEND_PORT%
exit /b 0

:stop
echo Stopping Tech Turf services...
set "FOUND="
set "SEEN=;"

REM Stop backend (port 5000)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%BACKEND_PORT% .*LISTENING"') do (
    if "!SEEN:;%%P;=!"=="!SEEN!" (
        set "SEEN=!SEEN!%%P;"
        set "FOUND=1"
        for /f "tokens=1 delims=," %%A in ('tasklist /FI "PID eq %%P" /FO CSV /NH') do (
            echo Stopping %%A ^(PID %%P^) on port %BACKEND_PORT%
        )
        taskkill /PID %%P /T /F >nul 2>&1
    )
)

REM Stop frontend (port 3000)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%FRONTEND_PORT% .*LISTENING"') do (
    if "!SEEN:;%%P;=!"=="!SEEN!" (
        set "SEEN=!SEEN!%%P;"
        set "FOUND=1"
        for /f "tokens=1 delims=," %%A in ('tasklist /FI "PID eq %%P" /FO CSV /NH') do (
            echo Stopping %%A ^(PID %%P^) on port %FRONTEND_PORT%
        )
        taskkill /PID %%P /T /F >nul 2>&1
    )
)

if not defined FOUND (
    echo No services found running.
) else (
    echo Done.
)
exit /b 0

:restart
call "%~f0" stop
timeout /t 2 /nobreak >nul
call "%~f0" start
exit /b 0
