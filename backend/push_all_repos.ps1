param(
    [string]$CommitMessage = "Feat: Fix Buy Now seller_id constraint, enhance Influencer Coupons and Wons screen"
)

# 1. Push temp-codemagic-repo (Flutter standalone repo used by Codemagic)
if (Test-Path "E:\Ahmed work\temp-codemagic-repo") {
    Set-Location "E:\Ahmed work\temp-codemagic-repo"
    git add -A
    git commit -m $CommitMessage
    Write-Output "Pushing to Codemagic repository (master)..."
    git push origin master
}

# 2. Push main monorepo
Set-Location "E:\Ahmed work\iraq-bid-app-master"
git add -A
git commit -m $CommitMessage
Write-Output "Pushing to Monorepo repository (main)..."
git push origin main

Write-Output "All repositories pushed successfully!"
