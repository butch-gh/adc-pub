# Start Inventory development servers in split panes (2x2 grid)
# to start fresh, run: .\start-inventory.ps1
# to kill all node processes first, run: taskkill /F /IM node.exe

$base = 'C:\_kaye\adc-phase2'

Write-Host '🚀 Starting inventory development servers in split panes...' -ForegroundColor Cyan

# Build a single-line wt command (no leading newline)
$wtCommand = 'new-tab --title "UI Inventory" cmd /k "cd /d ' + $base + '\adc-inventory && npm run dev" ; ' +
             'new-tab -V --title "API Inventory" cmd /k "cd /d ' + $base + '\api-inventory && npm run dev"'

# Launch Windows Terminal with the composed single argument
Start-Process -FilePath 'wt' -ArgumentList $wtCommand

Write-Host '✅ All Inventory development servers started in split panes!' -ForegroundColor Green
Write-Host '📐 Layout: 2x2 grid (UI Inventory + API Inventory)' -ForegroundColor Cyan
