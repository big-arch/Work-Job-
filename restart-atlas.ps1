$ErrorActionPreference = 'Stop'
$listener = Get-NetTCPConnection -LocalPort 8788 -State Listen -ErrorAction SilentlyContinue
if (!$listener) { exit 0 }
if (@($listener).Count -ne 1 -or $listener.LocalAddress -ne '127.0.0.1') { throw 'Порт 8788 занят другим сервисом.' }
$health = Invoke-RestMethod 'http://127.0.0.1:8788/api/health' -TimeoutSec 3
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($PSScriptRoot.ToLowerInvariant())
    $instance = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
} finally { $sha.Dispose() }
$worker = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $listener.OwningProcess)
if ($health.service -ne 'atlas-career-api' -or $health.instance -ne $instance -or $worker.Name -ne 'node.exe' -or $worker.CommandLine -notmatch '--import tsx server/index\.ts') {
    throw 'Локальный процесс не соответствует этой папке Атласа. Перезапуск остановлен.'
}
Stop-Process -Id $worker.ProcessId -ErrorAction Stop
