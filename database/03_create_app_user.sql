-- Optional: create or rotate a restricted PostgreSQL login for the application.
-- Usage:
--   psql -U postgres -d sanad_db -v APP_DB_PASSWORD='a-long-random-password' -f 03_create_app_user.sql

\if :{?APP_DB_PASSWORD}
\else
  \echo 'APP_DB_PASSWORD is required. Pass it with psql -v APP_DB_PASSWORD=...'
  \quit
\endif

SELECT format(
  'CREATE ROLE sanad_app LOGIN PASSWORD %L',
  :'APP_DB_PASSWORD'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sanad_app')
\gexec

SELECT format(
  'ALTER ROLE sanad_app WITH LOGIN PASSWORD %L',
  :'APP_DB_PASSWORD'
)
\gexec

GRANT CONNECT ON DATABASE sanad_db TO sanad_app;
GRANT USAGE ON SCHEMA public TO sanad_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sanad_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sanad_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sanad_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO sanad_app;

\echo 'Role sanad_app is configured. Put its URL in backend/.env as DATABASE_URL.'
