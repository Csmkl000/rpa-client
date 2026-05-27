import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { db } from './index'

async function main() {
  const command = process.argv[2]

  if (command === 'run') {
    console.log('Running migrations...')
    migrate(db, { migrationsFolder: './src/db/migrations' })
    console.log('Migrations complete.')
  } else if (command === 'generate') {
    console.log('Run: bunx drizzle-kit generate')
  } else {
    console.log('Usage: bun run src/db/migrate.ts [generate|run]')
  }
}

main()
