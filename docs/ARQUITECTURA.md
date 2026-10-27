# Arquitectura técnica

Complementa a [SPEC.md](SPEC.md), que define las reglas del juego.

## Stack

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js** (App Router, TypeScript) | Frontend y backend en un solo proyecto. Server Components para leer y Server Actions para modificar. |
| UI | **Chakra UI** | Componentes listos (cards, badges, tablas, diálogos, alertas) y temas claro/oscuro. |
| Base de datos | **PostgreSQL en Supabase** | Postgres administrado, con login y tiempo real incluidos. |
| ORM | **Drizzle** | Esquema y migraciones en TypeScript, consultas cercanas a SQL y buen soporte de transacciones y bloqueos. |
| Login | **Supabase Auth con Google** | Viene con Supabase y se integra con el tiempo real. Reemplaza a Auth.js. |
| Tiempo real | **Supabase Realtime (Broadcast)** | La web se actualiza sola cuando algo cambia (ver más abajo). |
| Hosting | **Vercel** + Supabase | Ambos tienen plan gratis. |
| Tests | **Vitest** (reglas del juego) y **Playwright** (flujos completos) | |

Las versiones se fijan al crear el proyecto, usando las últimas estables.

## Principio central: todo pasa por el servidor

El navegador **nunca lee las tablas directamente**. Todos los datos pasan por el servidor de Next.js, que decide qué mostrar según quién mira:

- **Autor de una predicción:** lo ven el admin y el propio autor. El resto lo ve recién cuando cierra la ronda.
- **Votos de estimación y de validación:** se ocultan hasta que se cierra cada votación. Cada jugador solo ve su propio voto.
- **Permisos:** solo quien tiene permiso de creador carga predicciones y solo quien tiene permiso de jurado vota. El servidor lo verifica en cada acción.

Así no hay forma de que el autor o los votos se filtren desde el navegador. En Supabase, las tablas no tienen permisos de lectura para los clientes, de modo que solo el servidor puede consultarlas.

## Tiempo real

Supabase Realtime funciona como un **aviso de cambio** y no como transporte de datos:

1. Cuando algo cambia en la base (una predicción nueva, un cambio de estado, una ronda que avanza), un *trigger* de Postgres publica un evento mínimo en un canal, por ejemplo `{ tipo: "prediction_updated", id: "..." }`.
2. El navegador está suscrito a ese canal y, al recibir el aviso, vuelve a pedir los datos al servidor.
3. El servidor responde con los datos ya filtrados según quién mira.

Como el evento no incluye datos sensibles, el tiempo real no puede filtrar autores ni votos.

**Canales**

| Canal | Eventos | Quién lo escucha |
|---|---|---|
| `round:{id}` | predicción nueva, eliminada o con cambio de estado | cualquiera que esté viendo esa ronda |
| `rounds` | ronda creada o con cambio de estado | la página de inicio |
| `ranking` | una validación cambió puntos | las páginas de ranking |
| `admin` | cantidad de votos recibidos, predicciones pendientes | solo el admin |
| `user:{id}` | el admin lo habilitó o deshabilitó | el propio usuario |

**Qué se ve en vivo**
- Las predicciones nuevas aparecen en la ronda sin recargar.
- Los cambios de estado de una predicción: votación abierta, valor fijado, cumplida o fallida.
- El ranking se actualiza cuando se valida una predicción.
- El admin ve en vivo cuántos votos lleva cada votación y la estimación parcial, para saber cuándo cerrarla.
- Notificaciones (toasts) del tipo "Se abrió la votación de 2 predicciones".

## Reglas del juego en el código

Todas las transiciones de estado de [SPEC.md](SPEC.md) viven en un solo módulo (`src/domain`). Cada acción:

1. abre una transacción y bloquea la predicción o la ronda (`SELECT ... FOR UPDATE`), para que dos acciones simultáneas no choquen;
2. verifica el rol, que el usuario tenga el permiso necesario (creador o jurado) y que el estado actual permita esa acción;
3. aplica el cambio y deja un registro en el historial de acciones.

Además, la base de datos impone las reglas críticas aunque haya un error en el código:
- valor de estimación entre 1 y 3;
- un voto por usuario y predicción;
- estados como tipos enumerados;
- máximo 3 predicciones por jugador y ronda, verificado dentro de la transacción.

Esto permite testear las reglas con Vitest sin pasar por la interfaz.

## Ids de elementos

Los elementos de la interfaz tienen un `id` único por página, para identificarlos en comentarios, tests y automatizaciones:

- Únicos en la página: nombre descriptivo en inglés y kebab-case, por ejemplo `navbar`, `user-menu`, `new-prediction-button`, `my-predictions-summary`.
- Repetidos: prefijo y el id del dato, por ejemplo `prediction-{id}`, `prediction-{id}-rate-2`, `round-group-{id}`, `admin-item-{id}-close`, `close-dialog-{id}-option-hit`, `player-{id}-jury`, `ranking-row-{userId}`.
- Pestañas del encabezado: `nav-tab-{mias|otras|validaciones|ranking|admin}` y su contador `nav-tab-{…}-count`.
- Los esqueletos de carga usan ids propios (`navbar-skeleton`, `page-skeleton`) para no repetir los del contenido real.

## Migraciones

- El esquema vive en `src/db/schema.ts`. `drizzle-kit generate` crea las migraciones en `supabase/migrations/` con nombres compatibles con la CLI de Supabase.
- Lo que Drizzle no modela (RLS, triggers de tiempo real) va en migraciones escritas a mano con `drizzle-kit generate --custom`.
- Todas las tablas tienen RLS activado sin políticas, así que solo el servidor puede leerlas.

## Rol de admin

- El rol de admin se asigna o quita **solo en la base de datos**, con una consulta SQL en el panel de Supabase, por ejemplo `update users set role = 'admin' where id = '...'`.
- Ninguna acción del servidor modifica la columna `role`.
- Para el primer admin: ingresar con Google en la web y después ejecutar la consulta sobre ese usuario.

## Historial de acciones

Como el admin tiene mucho poder (fija valores, valida, revierte y elimina), cada una de esas acciones queda registrada en una tabla `AuditLog` (quién, qué, cuándo, valor anterior y nuevo). Sirve para resolver disputas y detectar errores.

## Modelo de datos

El de [SPEC.md](SPEC.md), más:
- `AuditLog`: id, actorId, acción, entidad, entidadId, antes (json), después (json), creadoEn

Los usuarios se vinculan con `auth.users` de Supabase mediante el mismo id.

## Estructura del proyecto (propuesta)

```
src/
  app/                    rutas de Next.js
    (public)/             inicio, rondas, ranking, perfiles
    admin/                panel del admin
    api/                  endpoints mínimos (callback de login)
  domain/                 reglas del juego y transiciones de estado
  db/                     esquema de Drizzle, migraciones, consultas
  realtime/               hooks de suscripción a canales
  components/             componentes de UI con Chakra UI
supabase/
  migrations/             triggers de tiempo real y permisos
tests/
```

## Entornos

- **Desarrollo:** un proyecto de Supabase en la nube dedicado a desarrollo. Es lo más simple en Windows. La alternativa es Supabase local, que requiere Docker.
- **Producción:** otro proyecto de Supabase y Vercel.
- Credenciales necesarias: proyecto de Supabase (URL y claves) y un cliente OAuth de Google configurado en Supabase.

Los proyectos gratis de Supabase **se pausan después de una semana sin actividad**. Para un juego público conviene el plan pago o una tarea que lo mantenga activo.
