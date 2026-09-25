import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

let _sql: Sql | null = null;

function client(): Sql {
  _sql ??= neon(process.env.DATABASE_URL!);
  return _sql;
}

export const sql: Sql = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => client()(strings, ...values)) as Sql;
