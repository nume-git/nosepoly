import type { PredictionValue } from "@/domain/types";
import type { PredictionRecord, RoundRecord, UserRecord } from "../repository";

const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 3_600_000);

function user(
  id: string,
  alias: string,
  perms: { canCreate: boolean; isJury: boolean },
  role: UserRecord["role"] = "player",
): UserRecord {
  return {
    id,
    alias,
    email: `${alias}@example.com`,
    role,
    ...perms,
    deletedAt: null,
    createdAt: ago(24 * 30),
  };
}

export const seedUsers: UserRecord[] = [
  user("u-admin", "fran", { canCreate: true, isJury: true }, "admin"),
  user("u-ana", "ana", { canCreate: true, isJury: true }),
  user("u-lucho", "lucho", { canCreate: true, isJury: true }),
  user("u-juanpi", "juanpi", { canCreate: true, isJury: true }),
  user("u-meli", "meli", { canCreate: false, isJury: true }),
  user("u-nico", "nico", { canCreate: true, isJury: false }),
  user("u-sofi", "sofi", { canCreate: false, isJury: false }),
];

export const seedRounds: RoundRecord[] = [
  {
    id: "r3",
    name: "Ronda 3",
    state: "closed",
    openedAt: ago(24 * 40),
    collectingClosedAt: ago(24 * 33),
    closedAt: ago(24 * 10),
  },
  {
    id: "r4",
    name: "Ronda 4",
    state: "in_play",
    openedAt: ago(24 * 20),
    collectingClosedAt: ago(24 * 14),
    closedAt: null,
  },
  {
    id: "r5",
    name: "Ronda 5",
    state: "collecting",
    openedAt: ago(24 * 3),
    collectingClosedAt: null,
    closedAt: null,
  },
];

let counter = 0;
function prediction(
  roundId: string,
  authorId: string,
  text: string,
  state: PredictionRecord["state"],
  value: PredictionValue | null = null,
  extra: Partial<PredictionRecord> = {},
): PredictionRecord {
  counter += 1;
  return {
    id: `p${counter}`,
    roundId,
    authorId,
    text,
    state,
    value,
    valueSetByAdmin: false,
    resultSetByAdmin: false,
    hidden: false,
    createdAt: ago(100 - counter),
    validatedAt: state === "hit" || state === "miss" ? ago(10) : null,
    ...extra,
  };
}

export const seedPredictions: PredictionRecord[] = [
  // Ronda 3 (cerrada)
  prediction("r3", "u-ana", "La final de la Copa Argentina se juega con estadio lleno.", "hit", 2),
  prediction("r3", "u-admin", "Llueve en la Ciudad de Buenos Aires el 18 de octubre.", "miss", 1, {
    resultSetByAdmin: true,
  }),
  prediction("r3", "u-lucho", "El riesgo país baja de 600 puntos antes de fin de septiembre.", "hit", 3),
  // Ronda 4 (en juego)
  prediction(
    "r4",
    "u-juanpi",
    "Diputados aprueba el Presupuesto 2027 antes del 15 de diciembre.",
    "rated",
    3,
    { valueSetByAdmin: true },
  ),
  prediction("r4", "u-ana", "River sale campeón del Torneo Clausura 2026.", "validating", 2),
  prediction(
    "r4",
    "u-nico",
    "La nafta súper supera los $1.500 por litro en CABA antes de noviembre.",
    "validating",
    1,
  ),
  prediction("r4", "u-lucho", "El INDEC informa desempleo menor al 7% en el próximo informe.", "hit", 2),
  // Ronda 5 (carga abierta)
  prediction("r5", "u-lucho", "El dólar oficial mayorista cierra 2026 por encima de $1.600.", "rating"),
  prediction("r5", "u-ana", "La inflación de noviembre que publica el INDEC da menos de 2%.", "rating"),
  prediction("r5", "u-admin", "El Merval supera los 3.000.000 de puntos antes de fin de año.", "rating"),
  prediction(
    "r5",
    "u-admin",
    "Se confirma un recital internacional en River para marzo de 2027 antes del 30/11.",
    "draft",
  ),
  prediction("r5", "u-juanpi", "Se anuncia un nuevo feriado puente para diciembre antes del 30/11.", "draft"),
];

export const seedRatingVotes: [string, string, PredictionValue][] = [
  ["p8", "u-ana", 3],
  ["p8", "u-juanpi", 2],
  ["p8", "u-meli", 3],
  ["p8", "u-admin", 1],
  ["p9", "u-lucho", 2],
  ["p9", "u-meli", 1],
  ["p10", "u-ana", 3],
];

export const seedValidationVotes: [string, string, boolean][] = [
  ["p5", "u-lucho", true],
  ["p5", "u-juanpi", true],
  ["p5", "u-meli", true],
  ["p5", "u-admin", false],
  ["p6", "u-ana", true],
  ["p6", "u-lucho", false],
];
