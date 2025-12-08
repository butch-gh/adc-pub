# # Start all development servers using Start-Process (most reliable)

# Write-Host "🚀 Starting all development servers..." -ForegroundColor Cyan

# # Frontend
# Start-Process wt -ArgumentList "-w 0 new-tab --title `"Frontend`" cmd /k `"cd /d c:\_kaye\adc-phase2\adc-admin && npm run dev`""
# Start-Sleep -Seconds 1

# # Portal
# Start-Process wt -ArgumentList "-w 0 new-tab --title `"Portal`" cmd /k `"cd /d c:\_kaye\adc-phase2\packages\portal && npm run dev`""
# Start-Sleep -Seconds 1

# # Gateway
# Start-Process wt -ArgumentList "-w 0 new-tab --title `"Gateway`" cmd /k `"cd /d c:\_kaye\adc-phase2\api-gateway && npm run dev`""
# Start-Sleep -Seconds 1

# # Admin API
# Start-Process wt -ArgumentList "-w 0 new-tab --title `"Admin API`" cmd /k `"cd /d c:\_kaye\adc-phase2\api-admin && npm run dev`""

# Write-Host "✅ All development servers started in separate tabs!" -ForegroundColor Green



# Start all development servers in split panes (2x2 grid)
# to start fresh, run: .\start-all-dev-admin.ps1
# to kill all node processes first, run: taskkill /F /IM node.exe

$base = 'C:\_kaye\adc-phase2'

Write-Host '🚀 Starting all development servers in split panes...' -ForegroundColor Cyan

# Build a single-line wt command (no leading newline)
$wtCommand = 'new-tab --title "Frontend" cmd /k "cd /d ' + $base + '\adc-admin && npm run dev" ; ' +
             'split-pane -V --title "Portal" cmd /k "cd /d ' + $base + '\packages\portal && npm run dev" ; ' +
             'move-focus left ; ' +
             'split-pane -H --title "Gateway" cmd /k "cd /d ' + $base + '\api-gateway && npm run dev" ; ' +
             'move-focus right ; ' +
             'split-pane -H --title "Admin API" cmd /k "cd /d ' + $base + '\api-appointment && npm run dev"'

# Launch Windows Terminal with the composed single argument
Start-Process -FilePath 'wt' -ArgumentList $wtCommand

Write-Host '✅ All development servers started in split panes!' -ForegroundColor Green
Write-Host '📐 Layout: 2x2 grid (Frontend + Portal) / (Gateway + Admin)' -ForegroundColor Cyan




# $base = 'C:\_kaye\adc-phase2'

# Write-Host '🚀 Starting all development servers in split panes...' -ForegroundColor Cyan

# # Build a single-line wt command (no leading newline)
# $wtCommand = 'new-tab --title "Frontend" cmd /k "cd /d ' + $base + '\adc-admin && npm run dev" ; ' +             
#              'split-pane -H --title "Admin API" cmd /k "cd /d ' + $base + '\api-admin && npm run dev"'

# # Launch Windows Terminal with the composed single argument
# Start-Process -FilePath 'wt' -ArgumentList $wtCommand

# Write-Host '✅ All development servers started in split panes!' -ForegroundColor Green
# Write-Host '📐 Layout: 2x2 grid (Frontend + Portal) / (Gateway + Admin)' -ForegroundColor Cyan