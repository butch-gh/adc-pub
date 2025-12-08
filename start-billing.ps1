# Start Billing development servers in split panes (2x2 grid)
# to start fresh, run: .\start-billing.ps1
# to kill all node processes first, run: taskkill /F /IM node.exe

$base = 'C:\_kaye\adc-phase2'

Write-Host '🚀 Starting billing development servers in split panes...' -ForegroundColor Cyan

# Build a single-line wt command (no leading newline)
$wtCommand = 'new-tab --title "UI Billing" cmd /k "cd /d ' + $base + '\adc-billing && npm run dev" ; ' +
             'new-tab -V --title "API Billing" cmd /k "cd /d ' + $base + '\api-billing && npm run dev' 

# Launch Windows Terminal with the composed single argument
Start-Process -FilePath 'wt' -ArgumentList $wtCommand

Write-Host '✅ All Billing development servers started in split panes!' -ForegroundColor Green
Write-Host '📐 Layout: 2x2 grid (UI Billing + API Billing)' -ForegroundColor Cyan
