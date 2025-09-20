# Electron Cache Permission Fix Script
# 修复 Electron 应用的缓存权限问题

Write-Host "正在修复 Electron 缓存权限问题..." -ForegroundColor Green

# 关闭所有可能运行的应用实例
Write-Host "关闭应用进程..." -ForegroundColor Yellow
try {
    Get-Process -Name "era" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "应用进程已关闭" -ForegroundColor Green
} catch {
    Write-Host "没有发现运行中的应用进程" -ForegroundColor Gray
}

# 定义路径
$appdataDir = "$env:APPDATA\era"
$tempPattern = "$env:TEMP\era-*"

# 清理缓存目录
Write-Host "清理缓存目录..." -ForegroundColor Yellow

$cacheDirs = @(
    "$appdataDir\cache",
    "$appdataDir\GPUCache",
    "$appdataDir\Code Cache",
    "$appdataDir\DawnCache",
    "$appdataDir\ShaderCache"
)

foreach ($dir in $cacheDirs) {
    if (Test-Path $dir) {
        try {
            Remove-Item $dir -Recurse -Force -ErrorAction Stop
            Write-Host "已删除: $dir" -ForegroundColor Green
        } catch {
            Write-Host "无法删除 $dir : $($_.Exception.Message)" -ForegroundColor Red
            # 尝试强制删除
            try {
                cmd /c "rmdir /s /q `"$dir`""
                Write-Host "强制删除成功: $dir" -ForegroundColor Green
            } catch {
                Write-Host "强制删除失败: $dir" -ForegroundColor Red
            }
        }
    }
}

# 清理临时目录
Write-Host "清理临时文件..." -ForegroundColor Yellow
try {
    Get-ChildItem -Path $env:TEMP -Directory -Name "era-*" | ForEach-Object {
        $tempDir = Join-Path $env:TEMP $_
        try {
            Remove-Item $tempDir -Recurse -Force
            Write-Host "已删除临时目录: $tempDir" -ForegroundColor Green
        } catch {
            Write-Host "无法删除临时目录: $tempDir" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "清理临时文件时出错: $($_.Exception.Message)" -ForegroundColor Red
}

# 重新创建目录结构
Write-Host "重新创建缓存目录..." -ForegroundColor Yellow
try {
    if (-not (Test-Path $appdataDir)) {
        New-Item -Path $appdataDir -ItemType Directory -Force | Out-Null
    }

    foreach ($dir in $cacheDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            Write-Host "已创建: $dir" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "创建目录时出错: $($_.Exception.Message)" -ForegroundColor Red
}

# 设置权限
Write-Host "设置目录权限..." -ForegroundColor Yellow
try {
    # 获取当前用户
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

    # 设置完全控制权限
    $acl = Get-Acl $appdataDir
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $currentUser,
        "FullControl",
        "ContainerInherit,ObjectInherit",
        "None",
        "Allow"
    )
    $acl.SetAccessRule($accessRule)
    Set-Acl -Path $appdataDir -AclObject $acl

    Write-Host "权限设置完成，用户 $currentUser 现在拥有完全控制权" -ForegroundColor Green
} catch {
    Write-Host "设置权限时出错: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "尝试使用 icacls 命令..." -ForegroundColor Yellow

    try {
        $result = & icacls $appdataDir /grant "${env:USERNAME}:(OI)(CI)F" /T
        if ($LASTEXITCODE -eq 0) {
            Write-Host "使用 icacls 设置权限成功" -ForegroundColor Green
        } else {
            Write-Host "icacls 设置权限失败" -ForegroundColor Red
        }
    } catch {
        Write-Host "icacls 命令执行失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 显示诊断信息
Write-Host "`n诊断信息:" -ForegroundColor Cyan
Write-Host "应用数据目录: $appdataDir" -ForegroundColor Gray
Write-Host "目录是否存在: $(Test-Path $appdataDir)" -ForegroundColor Gray
if (Test-Path $appdataDir) {
    Write-Host "目录权限:" -ForegroundColor Gray
    try {
        $acl = Get-Acl $appdataDir
        $acl.Access | Where-Object { $_.IdentityReference -like "*$env:USERNAME*" } | ForEach-Object {
            Write-Host "  $($_.IdentityReference): $($_.FileSystemRights)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  无法读取权限信息" -ForegroundColor Red
    }
}

Write-Host "`n缓存权限问题修复完成！" -ForegroundColor Green
Write-Host "现在可以重新启动应用。" -ForegroundColor Green

# 询问是否立即启动应用
$response = Read-Host "`n是否现在启动应用？(Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host "启动应用..." -ForegroundColor Green
    try {
        # 尝试启动开发模式
        Set-Location (Split-Path $PSScriptRoot -Parent)
        Start-Process "npm" -ArgumentList "run", "dev" -NoNewWindow
    } catch {
        Write-Host "无法自动启动应用，请手动运行 npm run dev" -ForegroundColor Yellow
    }
}