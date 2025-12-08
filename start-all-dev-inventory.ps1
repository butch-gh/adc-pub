# Start all development servers in split panes (2x2 grid)
# to start fresh, run: .\start-all-dev-inventory.ps1
# to kill all node processes first, run: taskkill /F /IM node.exe
$base = 'C:\_kaye\adc-phase2'

Write-Host '🚀 Starting all development servers in split panes...' -ForegroundColor Cyan

# Build a single-line wt command (no leading newline)
$wtCommand = 'new-tab --title "Inventory Frontend" cmd /k "cd /d ' + $base + '\adc-inventory && npm run dev" ; ' +
             'split-pane -V --title "Portal" cmd /k "cd /d ' + $base + '\packages\portal && npm run dev" ; ' +
             'move-focus left ; ' +
             'split-pane -H --title "Gateway" cmd /k "cd /d ' + $base + '\api-gateway && npm run dev" ; ' +
             'move-focus right ; ' +
             'split-pane -H --title "Inventory API" cmd /k "cd /d ' + $base + '\api-inventory && npm run dev"'

# Launch Windows Terminal with the composed single argument
Start-Process -FilePath 'wt' -ArgumentList $wtCommand

Write-Host '✅ All development servers started in split panes!' -ForegroundColor Green
Write-Host '📐 Layout: 2x2 grid (Frontend + Portal) / (Gateway + Inventory)' -ForegroundColor Cyan