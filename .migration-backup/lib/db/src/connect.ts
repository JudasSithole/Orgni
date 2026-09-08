/**
 * Lazy database connection factory.
 *
 * Unlike the eager `db` export in `index.ts` (used by drizzle-kit), this creates
 * a connection only when called — so services can import the repository without
 * forcing a Postgres connection when persistence is not configured.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";
import { createRepository, type Database, type Repository } from "./repository";

const { Pool } = pg;

export interface DbHandle {
  db: Database;
  pool: pg.Pool;
  repository: Repository;
  close: () => Promise<void>;
}

export function createDb(databaseUrl: string): DbHandle {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return {
    db,
    pool,
    repository: createRepository(db),
    close: () => pool.end(),
  };
}
