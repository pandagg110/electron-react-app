@echo off
echo 正在修复 Electron 缓存权限问题...

REM 关闭所有可能运行的应用实例
echo 关闭应用进程...
taskkill /f /im "era.exe" 2>nul
taskkill /f /im "electron.exe" 2>nul

REM 等待进程完全关闭
timeout /t 2 /nobreak >nul

REM 清理用户数据目录中的缓存
echo 清理缓存目录...
set APPDATA_DIR=%APPDATA%\era
if exist "%APPDATA_DIR%\cache" (
    echo 删除缓存目录: %APPDATA_DIR%\cache
    rmdir /s /q "%APPDATA_DIR%\cache" 2>nul
)

if exist "%APPDATA_DIR%\GPUCache" (
    echo 删除 GPU 缓存目录: %APPDATA_DIR%\GPUCache
    rmdir /s /q "%APPDATA_DIR%\GPUCache" 2>nul
)

if exist "%APPDATA_DIR%\Code Cache" (
    echo 删除 Code 缓存目录: %APPDATA_DIR%\Code Cache
    rmdir /s /q "%APPDATA_DIR%\Code Cache" 2>nul
)

REM 清理临时目录中的相关文件
echo 清理临时文件...
set TEMP_DIR=%TEMP%
if exist "%TEMP_DIR%\era-*" (
    for /d %%i in ("%TEMP_DIR%\era-*") do (
        echo 删除临时目录: %%i
        rmdir /s /q "%%i" 2>nul
    )
)

REM 重新创建缓存目录并设置权限
echo 重新创建缓存目录...
if not exist "%APPDATA_DIR%" mkdir "%APPDATA_DIR%"
if not exist "%APPDATA_DIR%\cache" mkdir "%APPDATA_DIR%\cache"

REM 设置目录权限（给当前用户完全控制权）
echo 设置目录权限...
icacls "%APPDATA_DIR%" /grant "%USERNAME%:(OI)(CI)F" /T >nul 2>&1

echo.
echo 缓存权限问题修复完成！
echo 现在可以重新启动应用。
echo.
pause