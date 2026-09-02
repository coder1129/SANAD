@echo off
setlocal

pushd "%~dp0..\backend"
if errorlevel 1 exit /b 1

if not exist ".env" (
  echo Missing backend\.env. Copy backend\.env.example to backend\.env and set secure values first.
  popd
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required.
  popd
  exit /b 1
)

call npm.cmd install
if errorlevel 1 goto :failed

call npm.cmd run db:migrate
if errorlevel 1 goto :failed

call npx.cmd prisma generate
if errorlevel 1 goto :failed

echo Database migrations completed successfully.
echo To create the first administrator, set ADMIN_EMAIL and ADMIN_PASSWORD in backend\.env, then run:
echo   npm.cmd run db:seed-admin
popd
exit /b 0

:failed
echo Database setup failed. Review the error above.
popd
exit /b 1
