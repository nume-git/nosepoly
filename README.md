# Predicciones

Juego de predicciones en tiempo real. Las reglas están en [docs/SPEC.md](docs/SPEC.md), la arquitectura en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) y las pantallas en [docs/PANTALLAS.md](docs/PANTALLAS.md).

## Stack

Next.js 16 (App Router), Chakra UI 3, Supabase (Postgres, login con Google y Realtime), Drizzle ORM y Vitest.

## Puesta en marcha

1. Instalar dependencias: `npm install`
2. Copiar `.env.example` a `.env.local` y completar los datos del proyecto de Supabase.
3. Aplicar las migraciones a la base: `npx drizzle-kit migrate`
4. Levantar el servidor de desarrollo: `npm run dev`

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Tests de las reglas del juego |
| `npm run lint` | ESLint |
| `npx drizzle-kit generate --name <nombre>` | Nueva migración a partir de `src/db/schema.ts` |
| `npx drizzle-kit generate --custom --name <nombre>` | Migración SQL escrita a mano (triggers, permisos) |

## Estructura

```
src/
  app/        rutas de Next.js
  domain/     reglas del juego (sin dependencias de Next ni de la base) y sus tests
  db/         esquema de Drizzle y conexión
supabase/
  migrations/ migraciones SQL (generadas por Drizzle, con nombres compatibles con Supabase)
docs/         especificación, arquitectura y pantallas
```

## Nombrar al primer admin

El rol de admin solo se asigna desde la base de datos. Después de ingresar con Google en la web, ejecutar en el editor SQL de Supabase:

```sql
update users set role = 'admin', can_create = true, is_jury = true where email = 'tu-email@gmail.com';
```
