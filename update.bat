@echo off
rem Dungeon of Rhune: pull the latest version from GitHub into this folder.
rem Double-click it, then switch to the Godot editor (it reloads changed files).
rem Edits you made locally are kept: they are stashed for the update and re-applied.

rem The update may rewrite this file, and cmd reads a running .bat from disk,
rem so run from a temp copy (starting it without CALL never returns here).
if /i not "%~1"=="--run" (
  copy /y "%~f0" "%TEMP%\rhune-update.bat" >nul
  "%TEMP%\rhune-update.bat" --run "%~dp0."
)

setlocal EnableDelayedExpansion
set "BRANCH=claude/trusting-cray-6gvlg9"
set "REPO=https://github.com/rhuneark/Dungeon-of-Rhune.git"
cd /d "%~2"

where git >nul 2>nul || goto :nogit
if not exist ".git\" goto :noclone

echo Fetching %BRANCH% from GitHub...
git fetch origin "+%BRANCH%:refs/remotes/origin/%BRANCH%" || goto :fail

set "CURRENT="
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "CURRENT=%%b"
if /i "!CURRENT!"=="%BRANCH%" goto :pull

echo Switching this folder from !CURRENT! to %BRANCH%...
git diff --quiet HEAD
if errorlevel 1 (
  echo Saving your local changes on !CURRENT! with "git stash" ^(see "git stash list"^).
  git stash push -m "local changes on !CURRENT! before switching to %BRANCH%" || goto :fail
)
git rev-parse --verify --quiet "refs/heads/%BRANCH%" >nul
if errorlevel 1 (
  git checkout -b "%BRANCH%" --track "origin/%BRANCH%" || goto :fail
) else (
  git checkout "%BRANCH%" || goto :fail
)

:pull
git merge --ff-only --autostash "origin/%BRANCH%" || goto :diverged

rem Folders left over from the old web version would make Godot import junk.
for %%d in (node_modules dist release) do if exist "%%d\" type nul > "%%d\.gdignore"

echo.
echo Up to date:
git log -1 --format="  %%h  %%s  (%%cr)"
echo Open project.godot in Godot 4.7, or switch back to the editor if it is already open.
goto :end

:nogit
echo Git is not installed. Get it from https://git-scm.com/download/win and run this again.
goto :end_fail

:noclone
echo This folder is not a Git clone. Make one (anywhere) with:
echo   git clone -b %BRANCH% %REPO%
echo then copy update.bat from the new folder and use it there.
goto :end_fail

:diverged
echo.
echo This folder has commits that are not on GitHub, so it can't simply move forward.
echo Push them first (GitHub Desktop: Push origin, or "git push"), then run this again.
goto :end_fail

:fail
echo.
echo The update failed (see the message above). Nothing was deleted.
goto :end_fail

:end_fail
pause
exit /b 1

:end
pause
exit /b 0
