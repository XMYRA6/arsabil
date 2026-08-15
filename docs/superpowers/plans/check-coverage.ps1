param(
    [switch] $Json
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$specDir = Join-Path $root "docs\superpowers\specs"
$planDir = Join-Path $root "docs\superpowers\plans"
$manifestPath = Join-Path $planDir "coverage-manifest.json"

$specs = Get-ChildItem $specDir -Filter "*.md" | ForEach-Object {
    $_.BaseName -replace "-design$", ""
}

$plans = Get-ChildItem $planDir -Filter "*.md" | ForEach-Object {
    $_.BaseName -replace "-plan$", ""
}

$missingPlans = @(Compare-Object $specs $plans | Where-Object SideIndicator -eq "<=" | Select-Object -ExpandProperty InputObject)

$manifest = $null
$manifestProblems = New-Object System.Collections.Generic.List[string]

if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    }
    catch {
        $manifestProblems.Add("coverage-manifest.json is not valid JSON: $($_.Exception.Message)")
    }
}
else {
    $manifestProblems.Add("coverage-manifest.json is missing")
}

if ($manifest -ne $null) {
    foreach ($entry in $manifest.entries) {
        $specPath = Join-Path $specDir $entry.spec
        if (-not (Test-Path $specPath)) {
            $manifestProblems.Add("Manifest spec not found: $($entry.spec)")
        }

        if ($entry.plan) {
            $planPath = Join-Path $planDir $entry.plan
            if (-not (Test-Path $planPath)) {
                $manifestProblems.Add("Manifest plan not found: $($entry.plan)")
            }
        }

        if ($entry.canonicalPlan) {
            $canonicalPath = Join-Path $planDir $entry.canonicalPlan
            if (-not (Test-Path $canonicalPath)) {
                $manifestProblems.Add("Manifest canonicalPlan not found: $($entry.canonicalPlan)")
            }
        }

        if ($entry.statusRecord) {
            $statusPath = Join-Path $planDir $entry.statusRecord
            if (-not (Test-Path $statusPath)) {
                $manifestProblems.Add("Manifest statusRecord not found: $($entry.statusRecord)")
            }
        }

        foreach ($subPlan in @($entry.subPlans)) {
            $subPlanPath = Join-Path $planDir $subPlan
            if (-not (Test-Path $subPlanPath)) {
                $manifestProblems.Add("Manifest subPlan not found: $subPlan")
            }
        }
    }

    # The manifest intentionally tracks umbrella/closure/pointer/canonical exceptions,
    # not every one-to-one spec/plan pair. Full one-to-one coverage is checked by
    # $missingPlans above.
}

$result = [ordered] @{
    missingPlanNames = $missingPlans
    manifestProblems = @($manifestProblems)
    ok = ($missingPlans.Count -eq 0 -and $manifestProblems.Count -eq 0)
}

if ($Json) {
    $result | ConvertTo-Json -Depth 6
}
else {
    if ($result.ok) {
        Write-Host "Plan coverage OK"
    }
    else {
        Write-Host "Plan coverage problems found"
        if ($missingPlans.Count -gt 0) {
            Write-Host ""
            Write-Host "Specs without matching plan names:"
            $missingPlans | ForEach-Object { Write-Host " - $_" }
        }
        if ($manifestProblems.Count -gt 0) {
            Write-Host ""
            Write-Host "Manifest problems:"
            $manifestProblems | ForEach-Object { Write-Host " - $_" }
        }
        exit 1
    }
}
