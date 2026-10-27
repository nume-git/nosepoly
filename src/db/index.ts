import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta la variable de entorno DATABASE_URL.");

// prepare: false es necesario con el pooler de Supabase en modo transacción.
const client = postgres(url, { prepare: false });

export const db = drizzle(client, { schema });
export type Db = typeof db;
