param([switch]$Quiet)

$pidsFile = Join-Path $PSScriptRoot 'backend\logs\pids.txt'
if (-not (Test-Path $pidsFile)) {
    if (-not $Quiet) { Write-Host 'Запущенных сервисов не найдено.' }
    return
}
foreach ($processId in Get-Content $pidsFile) {
    if ($processId -and (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
        # /T — вместе с дочерними процессами (npm запускает node)
        taskkill /PID $processId /T /F | Out-Null
    }
}
Remove-Item $pidsFile
if (-not $Quiet) { Write-Host 'Все сервисы остановлены.' }
