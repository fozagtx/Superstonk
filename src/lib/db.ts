import postgres, { type Sql } from "postgres";

// postgres.js works with both Neon connection strings and a plain local
// Postgres for development. Lazily created so builds without DATABASE_URL
// don't blow up at import time.
let _sql: Sql | null = null;

function client(): Sql {
  _sql ??= postgres(process.env.DATABASE_URL!, { prepare: false });
  return _sql;
}

// Wrap in the same tagged-template signature postgres exposes; `values` are
// ParameterOrFragment<T>[] internally, so bind loosely and cast once.
export const sql = ((...args: never[]) =>
  (client() as (...a: never[]) => ReturnType<Sql>)(...args)) as Sql;
