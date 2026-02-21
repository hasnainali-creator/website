$contentBase = "src/content/articles"

Write-Output "--- IMAGE EXISTENCE AUDIT START ---"

$articles = Get-ChildItem $contentBase -Directory
foreach ($art in $articles) {
    $mdxPath = Join-Path $art.FullName "index.mdx"
    if (Test-Path $mdxPath) {
        $txt = Get-Content $mdxPath -Raw
        if ($txt -match "cover:\s*(.*)") {
            $imgRef = $Matches[1].Trim().Replace("'", "").Replace('"', "")
            $absImgPath = Resolve-Path (Join-Path $art.FullName $imgRef) -ErrorAction SilentlyContinue
            if (-not $absImgPath) {
                Write-Output "  [FAIL] Article: $($art.Name) - Image not found: $imgRef"
            } else {
                # Write-Output "  [PASS] Article: $($art.Name) - Image exists"
            }
        } else {
            Write-Output "  [FAIL] Article: $($art.Name) - 'cover' field missing"
        }
    }
}

Write-Output "--- IMAGE EXISTENCE AUDIT END ---"
