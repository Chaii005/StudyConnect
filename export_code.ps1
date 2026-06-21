# Get the absolute path of the workspace root
$workDir = (Get-Item -Path ".").FullName

# 1. Export Frontend files
$frontendFile = Join-Path $workDir "frontend_code.txt"
$frontendSrc = Join-Path $workDir "frontend\src"
if (Test-Path $frontendSrc) {
    $writer = New-Object System.IO.StreamWriter($frontendFile, $false, [System.Text.Encoding]::UTF8)

    $frontendItems = Get-ChildItem -Path $frontendSrc -Recurse -File | Where-Object {
        $_.Extension -in ".js", ".jsx", ".css"
    } | Where-Object {
        $_.FullName -notmatch "node_modules|\.git|\.vercel|dist|build|android|ios"
    } | Sort-Object FullName

    foreach ($item in $frontendItems) {
        $filePath = $item.FullName
        $writer.WriteLine("===== $filePath =====")
        $writer.WriteLine()
        $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
        $writer.WriteLine($content)
        $writer.WriteLine()
    }
    $writer.Close()
} else {
    Write-Host "KHONG TIM THAY frontend/src - bo qua xuat frontend_code.txt" -ForegroundColor Red
}

# 2. Export Backend files
$backendFile = Join-Path $workDir "backend_code.txt"
$backendSrc = Join-Path $workDir "backend\src"
if (Test-Path $backendSrc) {
    $writer = New-Object System.IO.StreamWriter($backendFile, $false, [System.Text.Encoding]::UTF8)
    $backendItems = Get-ChildItem -Path $backendSrc -Recurse -File | Where-Object {
        $_.Extension -eq ".js"
    } | Where-Object {
        $_.FullName -notmatch "node_modules|\.git|\.vercel|dist|build|android|ios"
    } | Sort-Object FullName

    foreach ($item in $backendItems) {
        $filePath = $item.FullName
        $writer.WriteLine("===== $filePath =====")
        $writer.WriteLine()
        $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
        $writer.WriteLine($content)
        $writer.WriteLine()
    }
    $writer.Close()
}
