# Start Appointment development servers in split panes (2x2 grid)
# to start fresh, run: .\start-appointment.ps1
# to kill all node processes first, run: taskkill /F /IM node.exe

$base = 'C:\_kaye\adc-phase2'

Write-Host '🚀 Starting Maintenance development servers in split panes...' -ForegroundColor Cyan

# Build a single-line wt command (no leading newline)
$wtCommand = 'new-tab --title "UI Maintenance" cmd /k "cd /d ' + $base + '\adc-maintenance && npm run dev" ; ' +
             'new-tab -V --title "API Maintenance" cmd /k "cd /d ' + $base + '\api-maintenance && npm run dev' 

# Launch Windows Terminal with the composed single argument
Start-Process -FilePath 'wt' -ArgumentList $wtCommand

Write-Host '✅ All Maintenance development servers started in split panes!' -ForegroundColor Green
Write-Host '📐 Layout: 2x2 grid (UI Maintenance + API Maintenance)' -ForegroundColor Cyan
