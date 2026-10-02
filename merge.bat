@echo off
setlocal
REM ============================================================
REM  tawfir factory UI - one-command merge into tawfir-front
REM  Usage (from the extracted package folder):
REM      merge.bat "E:\tawfir-full-system\tawfir-front"
REM ============================================================
if "%~1"=="" (
  echo Usage: merge.bat "C:\path\to\tawfir-front"
  exit /b 1
)
set "T=%~1"
REM work from the package folder itself (independent of caller's cwd)
cd /d "%~dp0"
if not exist "%T%\package.json" (
  echo [ERROR] package.json not found in "%T%"
  echo         Point me to the ROOT folder of tawfir-front.
  exit /b 1
)
echo === Merging tawfir factory UI into "%T%" ===

xcopy /E /I /Y "src\lib\factory" "%T%\src\lib\factory\" >nul || goto :err
copy  /Y "src\store\session.ts" "%T%\src\store\session.ts" >nul || goto :err
xcopy /E /I /Y "src\components\factory" "%T%\src\components\factory\" >nul || goto :err
copy  /Y "src\components\ui\sonner.tsx" "%T%\src\components\ui\sonner.tsx" >nul || goto :err
xcopy /E /I /Y "src\app\(factory)" "%T%\src\app\(factory)\" >nul || goto :err
xcopy /E /I /Y "src\app\(factory-console)" "%T%\src\app\(factory-console)\" >nul || goto :err
if not exist "%T%\scripts" mkdir "%T%\scripts"
copy  /Y "scripts\apply-factory-manifest.mjs" "%T%\scripts\apply-factory-manifest.mjs" >nul || goto :err
xcopy /E /I /Y "public\factory" "%T%\public\factory\" >nul || goto :err
if exist "factory-evidence" xcopy /E /I /Y "factory-evidence" "%T%\factory-evidence\" >nul

echo.
echo [OK] Merge complete - nothing in your existing files was touched.
echo.
echo Next steps:
echo   1) cd /d "%T%"
echo   2) git checkout -b factory-ui        (recommended safety branch)
echo   3) bun install
echo   4) bun run dev
echo   5) open http://localhost:3000/factory   (factory hub)
echo      open http://localhost:3000/console   (isolated console)
exit /b 0

:err
echo [ERROR] A copy step failed - check permissions on "%T%".
exit /b 1
