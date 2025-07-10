@echo off
echo ===================================================
echo    Khoi dong server game Caro Online
echo ===================================================
echo.

REM Kiem tra xem Node.js da duoc cai dat chua
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Khong tim thay Node.js. Vui long cai dat Node.js truoc.
    echo Ban co the tai Node.js tai https://nodejs.org/
    pause
    exit /b
)

echo Dang cai dat cac goi phu thuoc...
call npm install

echo.
echo Khoi dong server Caro Game...
echo Tuy chon:
echo 1. Khoi dong server
echo 2. Thoat
echo.
set /p option="Nhap lua chon (1-2): "

if "%option%"=="1" (
    echo.
    echo Dang khoi dong server...
    echo Server se chay tai http://localhost:3000
    echo De dung server, nhan Ctrl+C
    echo.
    call npm run server
) else (
    echo Thoat chuong trinh
    exit /b
)

pause 