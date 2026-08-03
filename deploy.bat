@echo off
chcp 65001 >nul
echo ==========================================
echo   时空剧场 - 打包部署脚本
echo ==========================================
echo.

REM 设置项目路径
set PROJECT_PATH=C:\Users\10919\Desktop\AWKN-Lab\时空剧场
set OUTPUT_NAME=skkt-theater-deploy.tar.gz

REM 进入项目目录
cd /d "%PROJECT_PATH%"

echo [1/3] 正在打包项目文件...
tar -czf "%OUTPUT_NAME%" . ^
  --exclude='%OUTPUT_NAME%' ^
  --exclude='node_modules' ^
  --exclude='.git' ^
  --exclude='*.map' ^
  --exclude='src-tauri/target' ^
  --exclude='.DS_Store'

if %ERRORLEVEL% neq 0 (
    echo [错误] 打包失败！
    pause
    exit /b 1
)

echo [2/3] 正在上传到服务器...
scp -i "C:\Users\10919\.ssh\aliyun_awkn" ^
    "%PROJECT_PATH%\%OUTPUT_NAME%" ^
    root@8.148.245.29:/tmp/

if %ERRORLEVEL% neq 0 (
    echo [错误] 上传失败！
    pause
    exit /b 1
)

echo [3/3] 部署完成！
echo.
echo 请 SSH 到服务器执行以下命令完成部署：
echo   ssh -i "~/.ssh/aliyun_awkn" root@8.148.245.29
echo.
echo   # 解压到网站目录
echo   rm -rf /var/www/skkt-theater
echo   mkdir -p /var/www/skkt-theater
echo   tar -xzf /tmp/%OUTPUT_NAME% -C /var/www/skkt-theater
echo.
echo   # 重启 Nginx
echo   nginx -t ^&^& systemctl restart nginx
echo.
echo 访问地址: http://awkn.cn/game
echo.

pause
