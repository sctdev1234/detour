$ErrorActionPreference = "Stop"

$source = "C:\platform-tools"
$destBase = "C:\AndroidSDK"
$dest = "$destBase\platform-tools"

Write-Host "Checking for adb in $source..."

if (Test-Path $source) {
    if (-not (Test-Path $destBase)) {
        New-Item -ItemType Directory -Path $destBase | Out-Null
        Write-Host "Created $destBase"
    }
    
    # Check if dest already exists
    if (Test-Path $dest) {
        Write-Host "Destination $dest already exists. Merging/Skipping move."
    } else {
        Move-Item -Path $source -Destination $dest
        Write-Host "Moved platform-tools to $dest"
    }
    
    $adbPath = $dest
} else {
    # If source doesn't exist, maybe it's already in dest?
    if (Test-Path $dest) {
        Write-Host "Found platform-tools in $dest"
        $adbPath = $dest
    } else {
        Write-Warning "Could not find platform-tools in $source or $dest"
        # Try to find where adb is if not in strict paths, but here we assume the previous find_by_name was correct.
        exit 1
    }
}

# Set ANDROID_HOME
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $destBase, "User")
Write-Host "Set ANDROID_HOME to $destBase"

# Update Path
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$pathToAdd = "$destBase\platform-tools"

if ($currentPath -notlike "*$pathToAdd*") {
    $newPath = "$currentPath;$pathToAdd"
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added $pathToAdd to User Path environment variable."
} else {
    Write-Host "Path already contains $pathToAdd"
}

Write-Host "Environment variables updated. You MUST restart your terminal (and VS Code) for changes to apply."
