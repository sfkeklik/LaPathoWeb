# PowerShell script to rebuild Docker containers with fresh database
Write-Host "Stopping and removing existing containers..." -ForegroundColor Yellow
docker-compose down -v

Write-Host "Removing old images..." -ForegroundColor Yellow
docker-compose rm -f

Write-Host "Rebuilding containers..." -ForegroundColor Green
docker-compose build --no-cache

Write-Host "Starting containers..." -ForegroundColor Green
docker-compose up -d

Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "Checking container status..." -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "Done! Services should be available at:" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost" -ForegroundColor White
Write-Host "  - Backend API: http://localhost:8080" -ForegroundColor White
Write-Host "  - PgAdmin: http://localhost:5050" -ForegroundColor White
Write-Host ""
Write-Host "Default login credentials:" -ForegroundColor Yellow
Write-Host "  Admin: username=admin, password=password" -ForegroundColor White
Write-Host "  Doctor: username=doctor, password=password" -ForegroundColor White

