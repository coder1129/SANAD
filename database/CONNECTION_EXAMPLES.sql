-- Connection configuration examples (documentation only).
-- Never commit a real password. The backend reads a complete URL from DATABASE_URL:
-- DATABASE_URL=postgresql://sanad_app:<random-password>@localhost:5432/sanad_db?schema=public

-- psql
-- psql "$DATABASE_URL"

-- Node.js / Prisma
-- const databaseUrl = process.env.DATABASE_URL;

-- Python / psycopg
-- conn = psycopg.connect(os.environ['DATABASE_URL'])

-- PHP / PDO
-- Parse the DATABASE_URL environment variable through the framework configuration.
