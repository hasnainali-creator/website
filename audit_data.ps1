$contentBase = "src/content"

function Audit-File {
    param($type, $filePath)
    Write-Output "Checking ${type}: ${filePath}"
    if (-not (Test-Path $filePath)) {
        Write-Output "  [FAIL] File missing: ${filePath}"
        return
    }

    $txt = Get-Content $filePath -Raw
    
    if ($type -eq "Article") {
        $fields = @("title:", "description:", "cover:", "category:", "authors:", "publishedTime:")
        foreach ($f in $fields) {
            if ($txt -notmatch $f) {
                Write-Output "  [FAIL] Missing field: ${f}"
            }
        }
    }
}

Write-Output "--- DEEP AUDIT START ---"

# Categories
$cats = Get-ChildItem (Join-Path $contentBase "categories") -Directory
foreach ($c in $cats) {
    Audit-File "Category" (Join-Path $c.FullName "index.json")
}

# Authors
$auts = Get-ChildItem (Join-Path $contentBase "authors") -Directory
foreach ($a in $auts) {
    Audit-File "Author" (Join-Path $a.FullName "index.mdx")
}

# Articles
$arts = Get-ChildItem (Join-Path $contentBase "articles") -Directory
foreach ($art in $arts) {
    Audit-File "Article" (Join-Path $art.FullName "index.mdx")
}

Write-Output "--- DEEP AUDIT END ---"
