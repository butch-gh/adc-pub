# Start development servers in split panes (2x2 grid)
# to start fresh, run: .\start-portal-gateway.ps1
# to kill all node processes first, run: taskkill /F /IM node.exe

$base = 'C:\_kaye\adc-phase2'

Write-Host '🚀 Starting portal & gateway development servers in split panes...' -ForegroundColor Cyan

# Build a single-line wt command (no leading newline)
$wtCommand = 'new-tab --title "Frontend" cmd /k "cd /d ' + $base + '\packages\portal && npm run dev" ; ' +
             'split-pane -V --title "Portal" cmd /k "cd /d ' + $base + '\api-gateway && npm run dev' 

# Launch Windows Terminal with the composed single argument
Start-Process -FilePath 'wt' -ArgumentList $wtCommand

Write-Host '✅ All development servers started in split panes!' -ForegroundColor Green
Write-Host '📐 Layout: 2x2 grid (Frontend + Portal) / (Gateway + Billing)' -ForegroundColor Cyan


