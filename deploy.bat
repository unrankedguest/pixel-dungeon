@echo off
echo ==========================================
echo  Deploying to GitHub
echo ==========================================

REM 1. Find the latest prototype HTML (Sorted by name descending to get the highest version)
set LATEST_HTML=
for /f "delims=" %%i in ('dir /b /o-n pixel_dungeon_prototype_v*.html 2^>nul') do (
    set LATEST_HTML=%%i
    goto :found
)

:found
if "%LATEST_HTML%"=="" (
    echo [ERROR] No prototype file found matching pixel_dungeon_prototype_v*.html
    pause
    exit /b 1
)

echo Latest file detected: %LATEST_HTML%
echo Copying %LATEST_HTML% to index.html...
copy /y "%LATEST_HTML%" "index.html" > nul

REM 2. Run check_build.js
echo.
echo Running code verification...
node check_build.js
if errorlevel 1 (
    echo.
    echo [ERROR] Verification failed. Deployment aborted.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Verification passed. Committing to GitHub...
echo.

REM 3. Check git repository
git status >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Current folder is not a Git repository.
    pause
    exit /b 1
)

git add .
git commit -m "Auto deploy: %LATEST_HTML% (%date% %time%)"
git push origin main

if errorlevel 1 (
    echo.
    echo [ERROR] Git push failed. Please check credentials or remote config.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  Deployment complete! GitHub Pages and Render will update shortly.
echo ==========================================
pause
