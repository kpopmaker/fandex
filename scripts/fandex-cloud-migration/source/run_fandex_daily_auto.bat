@echo off
setlocal EnableExtensions EnableDelayedExpansion

chcp 65001 > nul
cd /d "%USERPROFILE%\Desktop\naver_data_collector"

REM Python PATH 보강
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%LOCALAPPDATA%\Programs\Python\Launcher;%LOCALAPPDATA%\Programs\Python\Python313;%LOCALAPPDATA%\Programs\Python\Python313\Scripts;%PATH%"

REM 자동 실행 로그 폴더
if not exist "auto_logs" mkdir "auto_logs"

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%I"

set "LOG=auto_logs\fandex_auto_!TS!.log"

echo ============================================================ > "!LOG!"
echo FANDEX AUTO RUN >> "!LOG!"
echo started: %DATE% %TIME% >> "!LOG!"
echo ============================================================ >> "!LOG!"
echo. >> "!LOG!"

REM 기존 Runner의 마지막 pause를 자동으로 통과
echo.|call run_fandex_daily_python_only.bat >> "!LOG!" 2>&1

set "RC=!ERRORLEVEL!"

echo. >> "!LOG!"
echo ============================================================ >> "!LOG!"
echo finished: %DATE% %TIME% >> "!LOG!"
echo exitCode: !RC! >> "!LOG!"
echo ============================================================ >> "!LOG!"

copy /y "!LOG!" "fandex_auto_latest.log" > nul

exit /b !RC!