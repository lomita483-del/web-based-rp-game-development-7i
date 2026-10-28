import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

function normalizeConnectionString(connectionString: string | undefined) {
  if (!connectionString) return undefined

  const url = new URL(connectionString)
  if (['prefer', 'require', 'verify-ca'].includes(url.searchParams.get('sslmode') ?? '')) {
    url.searchParams.set('sslmode', 'verify-full')
  }
  return url.toString()
}

export const pool = new Pool({
  connectionString: normalizeConnectionString(process.env.DATABASE_URL),
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

attachDatabasePool(pool)

export const db = drizzle(pool, { schema })
