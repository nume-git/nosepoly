# Juego de predicciones — Especificación

## Concepto

Web pública donde los jugadores habilitados como creadores plantean hasta 3 predicciones por ronda, en texto libre, sobre eventos generales (política, economía, entretenimiento, etc.). Los jugadores habilitados como jurado: estiman cuánto vale cada predicción (1, 2 o 3 puntos) según lo difícil o audaz que les parece. Más tarde se valida si se cumplió y, si se cumple, el autor suma ese valor.

## Usuarios y roles

- **Registro**: cualquiera puede registrarse, **solo con Google**. Un usuario registrado sin permisos solo puede mirar.
- **Permisos**: el admin otorga a cada usuario, por separado, dos permisos independientes:
  - **Creador**: puede plantear predicciones.
  - **Jurado**: puede estimar las predicciones ajenas y votar en las validaciones públicas.
  Un usuario puede tener uno, los dos o ninguno.
- **Admin**: es un jugador más (predice y vota como cualquiera) con permisos extra sobre **todas** las predicciones, incluidas las propias:
  - habilita y deshabilita jugadores;
  - abre, avanza y cierra rondas;
  - abre y cierra las votaciones, fija valores, valida, revierte validaciones y elimina predicciones;
  - **ve los autores** de todas las predicciones en todo momento.
- **Quitar un permiso**:
  - Sin permiso de creador: sus predicciones siguen en juego (se estiman, se validan y suman puntos), pero no puede cargar nuevas.
  - Sin permiso de jurado: deja de poder votar. Los votos que ya emitió se conservan.
- No hay solicitud para participar: el admin habilita o deshabilita a cada usuario desde su panel.
- **El rol de admin solo se asigna o quita directamente en la base de datos.** La web no tiene ninguna forma de cambiar roles.
- Perfil público: alias, puntos, cantidad de predicciones y porcentaje de aciertos.
- **Borrar cuenta**: el usuario puede borrar su cuenta en cualquier momento.
  - Se borran su email, su nombre, su alias y su vínculo con Google.
  - Sus predicciones y votos siguen en el juego, con el autor "Usuario eliminado".
  - Deja de aparecer en los rankings.
- **Avisos**: solo dentro de la web (toasts y contadores en vivo). No hay emails ni notificaciones push.

## Rondas

Cada ronda pasa por tres estados:

| Estado | Qué se puede hacer | Cómo se pasa al siguiente |
|---|---|---|
| `collecting` (carga abierta) | Los jugadores cargan predicciones (hasta 3 cada uno). Se puede estimar y validar. | El admin cierra la carga. |
| `in_play` (en juego) | No entran predicciones nuevas. Se sigue estimando y validando. | El admin cierra la ronda, **solo si todas sus predicciones están validadas**. |
| `closed` (cerrada) | Se revelan los autores y el ranking de la ronda queda fijo. | — |

- Solo puede haber **una ronda en `collecting`** a la vez, pero puede haber **varias en `in_play`** esperando validaciones.
- Hay un ranking por ronda y un ranking global acumulado.
- Por ahora no hay premio por estimar ni por validar.

## Ciclo de una predicción

1. **Carga**: un usuario con permiso de creador escribe su predicción en texto libre en la ronda que está en `collecting`.
   - Se ve públicamente desde el primer momento, pero **sin mostrar al autor** (salvo para el admin). Los autores se revelan a todos **al cerrar la ronda**.
   - **No se puede editar.** Para cambiarla, el admin la elimina y el autor escribe una nueva, que arranca de cero, sin votos y sin validación.
2. **Estimación**: el admin **habilita o deshabilita la votación del jurado** de cada predicción en cualquier momento. Toda predicción pasa por la votación: no se puede fijar el valor sin abrirla.
   - Mientras está habilitada, los usuarios con permiso de jurado (salvo el autor) votan 1, 2 o 3 y **pueden cambiar su voto**.
   - Los votos y el promedio parcial **están ocultos** para los jugadores hasta que se cierra la votación. El **admin** ve en vivo la cantidad de votos, la estimación parcial (promedio y valor redondeado) y, al cerrar, cuántos votos recibió cada opción, pero no quién votó qué.
   - **Al cerrarla, el admin elige** entre usar el resultado de la votación (**promedio de los votos, redondeado**: 1,5 → 2 y 2,5 → 3) o **decidir él el valor final** (1, 2 o 3).
   - Si no hubo votos suficientes, la primera opción no está disponible y **el admin decide el valor**.
3. **Validación**: solo se puede validar una predicción que ya **tiene valor y tiene la votación del jurado cerrada**. Se marca como **cumplida** o **fallida**:
   - por defecto lo decide el **admin**;
   - el admin puede **habilitar o deshabilitar la validación pública**. Mientras está habilitada, los usuarios con permiso de jurado (salvo el autor) votan si se cumplió. **Al cerrarla, el admin elige** entre usar el resultado de la mayoría o decidir él el resultado final.
   - Si no hubo votos suficientes o hay empate, la primera opción no está disponible y **decide el admin**.
   - Si una predicción no se puede comprobar, por ejemplo porque no tiene fecha ("algún día X se retira"), el admin la marca como fallida o la elimina.
4. **Puntuada**: si se cumplió, el autor suma el valor de la predicción; si falló, suma 0.
   - Mientras la ronda no esté cerrada, el admin puede **revertir una validación**. La predicción vuelve a `rated`.

### Estados

```
cargada ──► estimación abierta ◄──► estimación cerrada (con valor) ──► validación pública ──► cumplida / fallida
                                              ▲  └──────────────── validación del admin ──────────┘   │
                                              └──────── admin revierte (ronda no cerrada) ────────────┘
```

| Estado | Quién la mueve | Siguiente |
|---|---|---|
| `draft` (cargada) | admin abre la votación | `rating` |
| `rating` (estimación abierta) | admin cierra la votación y elige: resultado de la votación o valor propio | `rated` |
| `rated` (con valor) | admin reabre la votación, valida o abre la validación pública | `rating`, `hit`/`miss` o `validating` |
| `validating` (validación pública) | admin cierra la votación y elige: resultado de la mayoría o decisión propia | `hit` / `miss` |
| `hit` / `miss` | admin revierte, si la ronda no está cerrada | `rated` |

- En `draft`, `rating`, `rated` o `validating`, el admin puede **eliminar** la predicción. Se borra junto con sus votos y el autor recupera el cupo en la ronda.
- Las predicciones `hit` o `miss` **no se pueden eliminar**. Para eliminarlas, primero hay que revertir la validación.

## Puntaje y ranking

- Cumplida → el autor suma el valor (1, 2 o 3). Fallida → 0.
- Orden del ranking:
  1. más puntos;
  2. más predicciones cumplidas;
  3. mayor valor promedio de las predicciones cumplidas.

## Parámetros configurables

- Votos mínimos para estimar: **3**. Si hay menos, decide el admin.
- Votos mínimos para la validación pública: **3**. Si hay menos o hay empate, decide el admin.
- Predicciones por jugador y ronda: **3**.

## Requisitos legales

- El juego no involucra dinero: no se cobra inscripción, no se venden ventajas y no hay premios con valor económico.
- **Política de privacidad** y opción para que el usuario pida que se borren sus datos (Ley 25.326). Inscribir la base de datos en el registro de la AAIP.
- **Términos y condiciones**: juego sin dinero ni premios, edad mínima y reglas de contenido.
- **Botón de denuncia** en cada predicción. El admin revisa las denuncias y elimina el contenido ilícito.
- **Veda electoral**: el admin puede ocultar temporalmente predicciones sobre elecciones.

## Stack

Ver [ARQUITECTURA.md](ARQUITECTURA.md): Next.js, Chakra UI, Supabase (Postgres, login con Google y tiempo real), Drizzle y Vercel.

## Modelo de datos (borrador)

- `User`: id (el mismo de `auth.users` de Supabase), email (null si se borró), alias (3 a 20 caracteres, único sin distinguir mayúsculas; null si se borró), rol (`player` | `admin`), puedeCrear (bool), esJurado (bool), aceptóTérminosEn, eliminadoEn (null o fecha), creadoEn
- `Round`: id, nombre, estado (`collecting` | `in_play` | `closed`), abiertaEn, cargaCerradaEn, cerradaEn
- `Prediction`: id, roundId, userId, texto (máx. 280 caracteres), oculta (bool, veda electoral), estado (`draft` | `rating` | `rated` | `validating` | `hit` | `miss`), valor (1–3 | null), valorFijadoPorAdmin (bool), resultadoDecididoPorAdmin (bool), creadaEn, validadaEn
- `DifficultyVote`: predictionId, userId, valor (1–3), actualizadoEn — uno por usuario y predicción
- `ValidationVote`: predictionId, userId, cumplida (bool), actualizadoEn — uno por usuario y predicción
- `Report`: id, predictionId, userId, motivo, estado (`pending` | `resolved` | `dismissed`), creadoEn — una por usuario y predicción

## Preguntas abiertas

Ninguna sobre el ciclo de vida del juego.
