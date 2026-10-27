# Pantallas

Complementa a [SPEC.md](SPEC.md) (reglas) y [ARQUITECTURA.md](ARQUITECTURA.md) (técnica). Los nombres de componentes son de Chakra UI.

## Navegación

- **Escritorio**: `navbar` arriba, igual en todas las páginas y sin logo, con **las pestañas de la ronda** (**Predicciones** / **Puntuar** / **Verificar**, con sus contadores), **Ranking**, **Moderar** (solo admins) y, a la derecha, el avatar con un `Popover` (Mi perfil, Ajustes, Tema claro/oscuro, Salir).
- **Celular**: `navbar` arriba en dos filas (logo y avatar; debajo, las pestañas de la ronda) y `dock` abajo con Rondas, Ranking y Perfil.
- **Pendientes**: los contadores de las pestañas muestran las votaciones pendientes de cada una. En celular, además, un `Badge` con `Float` sobre Rondas en el `dock` muestra cuántas votaciones tiene abiertas el jugador sin votar. Se actualiza en vivo.
- **Avisos en vivo** (son los únicos avisos del juego: no hay emails ni push): `Toast` abajo a la derecha, por ejemplo "Se abrió la votación de 2 predicciones" o "Se cerró la ronda 4".

## Visibilidad según permisos

El admin otorga dos permisos independientes: **creador** y **jurado**. A cada uno se le muestra solo lo que puede usar, sin botones deshabilitados ni secciones vacías:

| Elemento | Creador y jurado | Solo jurado | Solo creador | Sin permisos |
|---|---|---|---|---|
| Aviso arriba de la ronda | — | "Participás como jurado" | "Todavía no sos jurado" | "Todavía no tenés permisos" |
| Pestaña **Predicciones** (las propias) (avance 2/3 y **Nueva predicción**) | ✓ | — | ✓ | — |
| Pestañas de predicciones ajenas | **Puntuar** / **Verificar** (todas) | **Puntuar** / **Verificar** (solo votaciones abiertas) | **Otras predicciones** / **Resultados** (todas, sin votar) | **Predicciones** / **Resultados** (todas, sin votar) |
| Botones de voto (1-2-3, Se cumplió / No se cumplió) | ✓ | ✓ | — | — |
| Contadores de pendientes | ✓ | ✓ | — | — |
| Botón **Denunciar** | ✓ | ✓ | ✓ | ✓ |

Si pierde el permiso de creador, deja de ver la pestaña **Predicciones** (las propias), pero sigue encontrando sus predicciones en su propio perfil.

## Mapa

| Ruta | Pantalla | Quién la ve |
|---|---|---|
| `/` | Portada (sin sesión) o redirección a la ronda con carga abierta (con sesión) | todos |
| `/bienvenida` | Elegir alias y aceptar términos | primer ingreso |
| `/rondas` | Lista de rondas | registrados |
| `/rondas/[id]` | Detalle de ronda con sus predicciones | registrados |
| `/ranking` | Ranking global y por ronda | registrados |
| `/jugadores/[alias]` | Perfil público | registrados |
| `/ajustes` | Alias, tema y borrar cuenta | registrados |
| `/admin/...` | Panel del admin | admin |
| `/terminos`, `/privacidad` | Páginas legales | todos |

## 1. Portada (sin sesión)

- `EmptyState` con el nombre del juego, la explicación en una línea y el botón **Ingresar con Google**.
- "Cómo se juega" en 4 pasos: predecí, el jurado estima de 1 a 3, se valida y sumás puntos.
- Enlaces a términos y privacidad en el `footer`.

## 2. Bienvenida (primer ingreso)

- Elegir un **alias** único: es lo que ven los demás y no se usa el nombre de Google.
- `Checkbox` para aceptar términos y privacidad, y para declarar la edad mínima.
- Al terminar, el usuario queda registrado pero **no habilitado**.

## 3. Sin pantalla de inicio

No hay una pantalla de inicio. Con sesión iniciada, `/` es la pantalla principal del juego: muestra las predicciones de **todas las rondas que no están cerradas** (la que tiene la carga abierta y las que están en juego), para poder estimar en la ronda nueva y validar en las anteriores. Por defecto cada pestaña muestra **solo la ronda actual** (la que tiene la carga abierta o, si no hay, la más reciente). Al final hay un botón **Mostrar rondas anteriores (N)** que agrega todas las demás, en juego y cerradas (las cerradas ya muestran los autores). Si en las rondas anteriores hay votaciones pendientes, el botón lo indica ("1 por votar") y los contadores de las pestañas las siguen contando. La elección se guarda en la URL (`?anteriores=1`) y se mantiene al cambiar de pestaña.

En cada pestaña las predicciones se **agrupan por ronda**, cada grupo con el nombre y el estado de la ronda (primero la que tiene la carga abierta, después las en juego). En **Predicciones** (las propias), las de la ronda con la carga abierta van dentro de la tarjeta de resumen (`#my-predictions-summary`), junto al avance "2/3" y el botón **Nueva predicción**; las de rondas en juego van debajo, agrupadas.

- Si el admin habilita o deshabilita al usuario mientras está conectado, la ronda se actualiza en vivo (aparecen o desaparecen la pestaña **Predicciones** (las propias) y el botón **Nueva predicción**) y se muestra un `Toast` ("Ya podés crear predicciones").

## 4. Lista de rondas

- Una `Card` por ronda con nombre, estado (`Badge`), fechas, cantidad de predicciones y cuántas faltan validar.
- Orden: carga abierta primero, después en juego y al final las cerradas.

## 5. Detalle de ronda (pantalla principal del juego)

**Jugador habilitado**: tres pestañas.
- **Predicciones (2/3)**: avance en la ronda, botón **Nueva predicción** y la lista de sus predicciones.
- **Puntuar** (contador: estimaciones pendientes): predicciones ajenas en `draft`, `rating` o `rated`, con las que tienen votación abierta primero. Sin filtros.
- **Verificar** (contador: validaciones públicas pendientes): predicciones ajenas en `validating`, `hit` o `miss`, con las abiertas primero. Sin filtros.

Las tarjetas no tienen fila de datos (autor, fecha, insignias): muestran el texto, debajo un **texto de ayuda con el estado** (un punto de color y una frase), el botón Denunciar y, si corresponde, los botones de voto. Ejemplos del texto de ayuda:
- "Cargada · esperando que el admin abra la votación"
- "Votación abierta · todavía no votaste" / "· votaste 2, podés cambiarlo" / (propia) "· el jurado está estimando cuánto vale"
- "Vale 3 puntos · esperando validación · valor fijado por el admin"
- "Vale 2 puntos · validación pública abierta · ya votaste"
- "Cumplida · sumó 2 puntos" / "Fallida · vale 1 punto, no suma"

**Sin permiso de creador**: un aviso y dos pestañas, según la tabla de visibilidad: con permiso de jurado, **Puntuar** y **Verificar** solo con votaciones abiertas; sin ningún permiso, **Predicciones** y **Resultados** con todo, en modo lectura. Un creador sin permiso de jurado ve **Otras predicciones** y **Resultados**, sin botones de voto.

```
┌─────────────────────────────────────────────────────────┐
│ Ronda 5  [Carga abierta]    48 predicciones · 12 validadas│
│ [Predicciones 2/3] [Puntuar 3] [Verificar 1]           │
├─────────────────────────────────────────────────────────┤
│ ┌─ card ──────────────────────────────────────────────┐ │
│ │ "El dólar oficial supera los $2000 antes del 31/12" │ │
│ │ Anónimo · hace 2 h            [Votación abierta]    │ │
│ │ ¿Cuánto vale?  [ 1 ][ 2 ][ 3 ]   ← tu voto marcado  │ │
│ │                                         [⋮ Denunciar]│ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─ card ──────────────────────────────────────────────┐ │
│ │ "Argentina gana la Copa..."                         │ │
│ │ Anónimo · ayer        ★★☆ 2 pts    [✓ Cumplida]     │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─ card (tuya, borde destacado) ──────────────────────┐ │
│ │ "..."                                               │ │
│ │ Tu predicción · hace 3 h            [Cargada]       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Tarjeta de predicción**, según el estado:

| Estado | Qué muestra | Acción del jugador |
|---|---|---|
| `draft` | `Badge` "Cargada" | — |
| `rating` | `Badge` "Votación abierta" | `Group` con botones 1, 2 y 3. Su voto queda marcado y lo puede cambiar. |
| `rated` | Valor (★ 1 a 3) | — |
| `validating` | Valor y `Badge` "Validación pública" | Botones **Se cumplió** / **No se cumplió**. |
| `hit` / `miss` | Valor y `Badge` verde "Cumplida" o rojo "Fallida" | — |

- Autor: "Anónimo" hasta que cierra la ronda. Sus propias predicciones dicen "Tu predicción" y no tienen botones de voto.
- Si el valor lo fijó el admin, o el resultado lo decidió el admin, se indica con un `Tooltip`.
- Las predicciones ocultas por veda electoral muestran "Oculta temporalmente".
- **En vivo**: las predicciones nuevas aparecen arriba con una animación suave; los cambios de estado actualizan la tarjeta en su lugar.

**Nueva predicción** (`Dialog`):
- `Textarea` con contador de caracteres (máximo **280**).
- Contador "Te quedan 2 de 3".
- `Alert` de advertencia: "No se puede editar. Escribila de forma que se pueda comprobar, idealmente con una fecha."
- Paso de confirmación mostrando el texto final.

## 6. Ranking

- Solo ranking **global** acumulado: no hay vista por ronda ni etiqueta de estado (la vista por ronda queda oculta por ahora).
- `Table` con posición, alias y puntos. La fila del jugador está resaltada. Las cumplidas y el valor promedio no se muestran, pero se siguen usando para desempatar.
- En vivo: las posiciones se reordenan cuando se valida una predicción.
- Empates totales (mismos puntos, cumplidas y promedio) comparten posición. Una nota bajo la tabla explica el criterio de desempate.
- `navbar`: logo, **Ronda N** (vuelve a la ronda) y **Ranking** como pestañas y avatar.

## 7. Perfil público

- `Stat`: puntos, predicciones, porcentaje de aciertos y valor promedio.
- Historial de predicciones: solo de **rondas cerradas**, para no revelar autores antes de tiempo. En su propio perfil, el jugador ve también las de rondas abiertas.

## 8. Ajustes

- Cambiar alias.
- Tema claro/oscuro (botón `#theme-toggle` de la `navbar`).
- **Borrar mi cuenta** (pedido de la Ley 25.326), con `Dialog` de confirmación que explica que sus predicciones quedan en el juego como "Usuario eliminado" y que deja de aparecer en los rankings.

## 9. Panel del admin

Menú lateral (`Menu`) con estas secciones:

### 9.1 Pendientes (pantalla de inicio del admin)

Una cola con todo lo que necesita una acción, agrupada por tipo. Se actualiza en vivo.

```
┌─────────────────────────────────────────────────────────┐
│ Para abrir votación (6)       [Abrir todas]             │
│   "..." · ana        [Abrir votación] [Fijar valor ▾]   │
│ Votaciones abiertas (4)                                 │
│   "..." · lucho  5 votos ✓ quórum  [Cerrar]             │
│   "..." · vos    1 voto  ✗ quórum  [Cerrar y fijar ▾]   │
│ Para validar (3)                                        │
│   "..." · ana  ★★★   [✓ Cumplida] [✗ Fallida] [Pública] │
│ Validaciones públicas (1)                               │
│   "..." · juan  7 votos  [Cerrar]                       │
│ Denuncias (2)                                           │
└─────────────────────────────────────────────────────────┘
```

- Muestra el autor de cada predicción, la cantidad de votos y, en las votaciones abiertas, la estimación parcial (por ejemplo "Estimación: 2,4 → vale 2"), que se actualiza en vivo.
- No hay botones para fijar el valor antes de votar: cada predicción nueva solo tiene **Abrir votación**.
- Al tocar **Cerrar votación** o **Cerrar validación** se abre un `Dialog` con un resumen (por ejemplo "El jurado votó 5 veces. Promedio 2,4." o, sin quórum, el motivo) y los botones del resultado final (1-2-3 o Cumplida/Fallida). Cada botón muestra cuántos votos recibió esa opción ("3 votos", "Cumplida · 5 votos"). El admin siempre elige con un clic; si elige un valor distinto del que daba la votación, queda marcado como "Valor fijado por el admin".

### 9.2 Predicciones

- `Table` filtrable por ronda, estado y autor, con selección múltiple para acciones en lote.
- Acciones por fila: abrir o cerrar votación, fijar valor, validar, abrir validación pública, revertir, ocultar por veda y eliminar (con confirmación).

### 9.3 Rondas

- Crear ronda.
- **Cerrar carga** y **Cerrar ronda**. El botón de cerrar ronda está deshabilitado mientras queden predicciones sin validar, con un `Tooltip` que dice cuántas faltan.

### 9.4 Jugadores

- `Table` con alias, email, fecha de registro, permisos y predicciones.
- Dos `Switch` por usuario: **Creador** y **Jurado**. Es la única forma de dar permisos: no hay solicitud desde el lado del jugador.
- Filtro "Sin permisos" para revisar los registros nuevos.
- Los admins se muestran con un `Badge` "Admin", pero el rol no se puede cambiar desde acá: solo en la base de datos.
- Filtro "Sin habilitar" para revisar los registros nuevos. Un `Badge` en el menú muestra cuántos registros nuevos hay sin revisar.

### 9.5 Denuncias

- Predicción denunciada, motivo y cantidad de denuncias.
- Acciones: eliminar la predicción, ocultarla o descartar la denuncia.

### 9.6 Historial

- `Table` del historial de acciones del admin, con filtros por acción y fecha.

## 10. Estados vacíos y errores

- Sin rondas activas: "No hay rondas abiertas. Volvé pronto."
- Sin predicciones para votar: "Estás al día."
- Conexión en vivo caída: `Badge` discreto "Reconectando..." en la `navbar`. Al reconectar, la página vuelve a pedir los datos.
