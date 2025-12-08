# Start Appointment development servers in split panes (2x2 grid)
# to start fresh, run: .\start-appointment.ps1
# to kill all node processes first, run: taskkill /F /IM node.exe

$base = 'C:\_kaye\adc-phase2'

Write-Host '🚀 Starting appointment development servers in split panes...' -ForegroundColor Cyan

# Build a single-line wt command (no leading newline)
$wtCommand = 'new-tab --title "UI Appointment" cmd /k "cd /d ' + $base + '\adc-admin && npm run dev" ; ' +
             'new-tab -V --title "API Appointment" cmd /k "cd /d ' + $base + '\api-appointment && npm run dev' 

# Launch Windows Terminal with the composed single argument
Start-Process -FilePath 'wt' -ArgumentList $wtCommand

Write-Host '✅ All Appointment development servers started in split panes!' -ForegroundColor Green
Write-Host '📐 Layout: 2x2 grid (UI Appointment + API Appointment)' -ForegroundColor Cyan
