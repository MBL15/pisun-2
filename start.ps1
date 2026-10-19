<#
.SYNOPSIS
  Быстрый старт платформы одной командой (Windows, без Docker, БД H2 в файле backend/data).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\start.ps1            # собрать (если нужно) и запустить всё
  powershell -ExecutionPolicy Bypass -File .\start.ps1 -Rebuild   # пересобрать бэкенд
  powershell -ExecutionPolicy Bypass -File .\start.ps1 -ResetData # начать с чистыми демо-данными
#>
param(
    [switch]$Rebuild,
    [switch]$ResetData,
    [switch]$NoFrontend
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$logs = Join-Path $backend 'logs'
$data = Join-Path $backend 'data'
$services = @(
    @{ Name = 'identity-service';      Port = 8081 },
    @{ Name = 'event-service';         Port = 8082 },
    @{ Name = 'ai-moderation-service'; Port = 8083 },
    @{ Name = 'doc-generator-service'; Port = 8084 },
    @{ Name = 'api-gateway';           Port = 8080 }
)

function Get-JavaMajor([string]$javaExe) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $javaExe -version 2>&1 | Out-String
    $ErrorActionPreference = $previous
    if ($output -match 'version "(\d+)') { return [int]$Matches[1] }
    return 0
}

function Find-Java {
    $candidates = @()
    if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME 'bin\java.exe') }
    $onPath = Get-Command java -ErrorAction SilentlyContinue
    if ($onPath) { $candidates += $onPath.Source }
    $candidates += Get-ChildItem "$root\.tools\jdk-*\bin\java.exe", "$env:USERPROFILE\.tools\jdk-*\bin\java.exe" `
        -ErrorAction SilentlyContinue | ForEach-Object FullName
    foreach ($candidate in $candidates) {
        if ((Test-Path $candidate) -and ((Get-JavaMajor $candidate) -ge 21)) { return $candidate }
    }
    return $null
}

& (Join-Path $root 'stop.ps1') -Quiet

$java = Find-Java
if (-not $java) {
    Write-Host '>> Java 21 не найдена - скачиваю портативный JDK 21 (Eclipse Temurin) в .tools ...' -ForegroundColor Yellow
    $tools = Join-Path $root '.tools'
    New-Item -ItemType Directory -Force $tools | Out-Null
    $ProgressPreference = 'SilentlyContinue'
    $zip = Join-Path $tools 'jdk21.zip'
    Invoke-WebRequest 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse' -OutFile $zip
    Expand-Archive $zip -DestinationPath $tools -Force
    Remove-Item $zip
    $java = Find-Java
    if (-not $java) { throw 'Не удалось подготовить Java 21. Установите JDK 21 и задайте JAVA_HOME.' }
}
$env:JAVA_HOME = Split-Path (Split-Path $java)
Write-Host ">> Java: $java" -ForegroundColor Cyan

$missingJar = $services | Where-Object { -not (Test-Path "$backend\$($_.Name)\target\$($_.Name).jar") }
if ($Rebuild -or $missingJar) {
    Write-Host '>> Сборка бэкенда (Maven Wrapper, первый запуск скачивает зависимости, 2-4 минуты) ...' -ForegroundColor Cyan
    Push-Location $backend
    try {
        & .\mvnw.cmd -q -B -DskipTests package
        if ($LASTEXITCODE -ne 0) { throw 'Сборка бэкенда завершилась с ошибкой' }
    } finally {
        Pop-Location
    }
}

if ($ResetData -and (Test-Path $data)) {
    Write-Host '>> Сбрасываю базу данных к демо-состоянию' -ForegroundColor Yellow
    Get-ChildItem $data -Filter 'sportdb*' | Remove-Item -Force
}
New-Item -ItemType Directory -Force $logs, $data | Out-Null
$env:SPORT_DATA_DIR = $data

$pids = @()
foreach ($service in $services) {
    $name = $service.Name
    $jar = "$backend\$name\target\$name.jar"
    Write-Host ">> Запуск $name (порт $($service.Port))"
    $process = Start-Process -FilePath $java `
        -ArgumentList @('-Xms64m', '-Xmx384m', '-Dfile.encoding=UTF-8', '-jar', "`"$jar`"") `
        -WorkingDirectory $backend `
        -RedirectStandardOutput "$logs\$name.log" -RedirectStandardError "$logs\$name.err.log" `
        -WindowStyle Hidden -PassThru
    $pids += $process.Id
    # Первый процесс становится хостом файловой H2 (AUTO_SERVER), остальные подключаются к нему
    if ($name -eq 'identity-service') { Start-Sleep -Seconds 6 }
}

if (-not $NoFrontend) {
    if (-not (Test-Path "$frontend\node_modules")) {
        Write-Host '>> Установка зависимостей фронтенда (npm install) ...' -ForegroundColor Cyan
        Push-Location $frontend
        try { npm install } finally { Pop-Location }
    }
    Write-Host '>> Запуск фронтенда (Vite, порт 5173)'
    $process = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev -- --host' `
        -WorkingDirectory $frontend `
        -RedirectStandardOutput "$logs\frontend.log" -RedirectStandardError "$logs\frontend.err.log" `
        -WindowStyle Hidden -PassThru
    $pids += $process.Id
}
$pids | Set-Content "$logs\pids.txt"

Write-Host '>> Ожидание готовности сервисов ...' -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(3)
foreach ($service in $services) {
    $ready = $false
    while (-not $ready -and (Get-Date) -lt $deadline) {
        try {
            $health = Invoke-RestMethod "http://localhost:$($service.Port)/actuator/health" -TimeoutSec 2
            $ready = $health.status -eq 'UP'
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    $state = if ($ready) { 'OK' } else { "НЕ ОТВЕЧАЕТ - см. backend\logs\$($service.Name).log" }
    Write-Host ("   {0,-24} :{1}  {2}" -f $service.Name, $service.Port, $state)
}

Write-Host ''
Write-Host 'Готово!' -ForegroundColor Green
Write-Host '  Приложение:  http://localhost:5173'
Write-Host '  API Gateway: http://localhost:8080'
Write-Host '  Логи:        backend\logs'
Write-Host '  Остановить:  powershell -ExecutionPolicy Bypass -File .\stop.ps1'
