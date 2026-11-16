$source = "E:\Ahmed work\iraq-bid-app-master\iraq-bid-app-master"
$dest = "E:\Ahmed work\temp-codemagic-repo"

$dirs = @("lib", "assets", "fonts")
foreach ($d in $dirs) {
    $srcDir = Join-Path $source $d
    $dstDir = Join-Path $dest $d
    if (Test-Path $srcDir) {
        robocopy $srcDir $dstDir /E /XD .dart_tool build .git /NFL /NDL /NJH /NJS /nc /ns /np
    }
}

# Copy pubspec.yaml
Copy-Item (Join-Path $source "pubspec.yaml") (Join-Path $dest "pubspec.yaml") -Force

# Copy iOS specific files that might have been updated
robocopy (Join-Path $source "ios\Runner") (Join-Path $dest "ios\Runner") /E /NFL /NDL /NJH /NJS /nc /ns /np
Copy-Item (Join-Path $source "ios\Podfile") (Join-Path $dest "ios\Podfile") -Force
Copy-Item (Join-Path $source "ios\Runner.xcodeproj\project.pbxproj") (Join-Path $dest "ios\Runner.xcodeproj\project.pbxproj") -Force

Write-Output "Synchronization complete."
