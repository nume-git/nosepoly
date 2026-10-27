"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { DomainError } from "@/domain/errors";
import * as rules from "@/domain/rules";
import {
  summarizeRating,
  summarizeValidation,
  MIN_RATING_VOTES,
  MIN_VALIDATION_VOTES,
} from "@/domain/scoring";
import type { PredictionSnapshot, Result } from "@/domain/types";
import { setFlash } from "./flash";
import { repo, usingMockData } from "./repo";
import type { PredictionRecord } from "./repository";
import { DEV_USER_COOKIE, getViewer } from "./session";

export interface ActionState {
  error: string | null;
  ok: boolean;
}

function snapshot(p: PredictionRecord): PredictionSnapshot {
  return { id: p.id, roundId: p.roundId, authorId: p.authorId, state: p.state, value: p.value };
}

async function requirePrediction(id: unknown) {
  const prediction = typeof id === "string" ? await repo.getPrediction(id) : null;
  if (!prediction)
    throw new DomainError("invalid_state", "La predicción ya no existe: puede que la hayan eliminado.");
  return prediction;
}

async function requireRound(id: unknown) {
  const round = typeof id === "string" ? await repo.getRound(id) : null;
  if (!round) throw new DomainError("invalid_state", "La ronda ya no existe.");
  return round;
}

/**
 * Corre una acción del juego: si las reglas la rechazan muestra el motivo como
 * toast; si sale bien muestra el mensaje de éxito. Siempre refresca la página.
 * Con la base real, cada acción va a correr dentro de una transacción con la
 * fila bloqueada (SELECT ... FOR UPDATE).
 */
async function run(fn: () => Promise<string | null>) {
  try {
    const message = await fn();
    if (message) await setFlash(message, "success");
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    await setFlash(error.message, "error");
  }
  refresh();
}

// Jugadores

export async function createPredictionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { actor } = await getViewer();
  try {
    const round = await requireRound(formData.get("roundId"));
    const mine = (await repo.listPredictions({ roundId: round.id })).filter(
      (p) => p.authorId === actor.id,
    ).length;
    const { text } = rules.createPrediction(actor, round, mine, String(formData.get("text") ?? ""));
    await repo.insertPrediction({ roundId: round.id, authorId: actor.id, text });
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message, ok: false };
    throw error;
  }
  await setFlash("Publicaste tu predicción.");
  refresh();
  return { error: null, ok: true };
}

export async function castRatingVoteAction(formData: FormData) {
  await run(async () => {
    const { actor } = await getViewer();
    const prediction = await requirePrediction(formData.get("predictionId"));
    const { value } = rules.castRatingVote(actor, snapshot(prediction), Number(formData.get("value")));
    await repo.setRatingVote(prediction.id, actor.id, value);
    return null;
  });
}

export async function castValidationVoteAction(formData: FormData) {
  await run(async () => {
    const { actor } = await getViewer();
    const prediction = await requirePrediction(formData.get("predictionId"));
    rules.castValidationVote(actor, snapshot(prediction));
    await repo.setValidationVote(prediction.id, actor.id, formData.get("fulfilled") === "true");
    return null;
  });
}

// Admin: predicciones

async function adminPredictionAction(
  formData: FormData,
  apply: (
    ctx: Awaited<ReturnType<typeof getViewer>>,
    prediction: PredictionRecord,
  ) => Promise<{ patch?: Partial<PredictionRecord>; message: string; action: string } | null>,
) {
  await run(async () => {
    const viewer = await getViewer();
    const prediction = await requirePrediction(formData.get("predictionId"));
    const result = await apply(viewer, prediction);
    if (!result) return null;
    if (result.patch) await repo.updatePrediction(prediction.id, result.patch);
    await repo.addAudit({
      actorId: viewer.actor.id,
      action: result.action,
      entity: "prediction",
      entityId: prediction.id,
      before: { state: prediction.state, value: prediction.value },
      after: result.patch ?? null,
    });
    return result.message;
  });
}

export async function openRatingAction(formData: FormData) {
  await adminPredictionAction(formData, async ({ actor }, p) => {
    const next = rules.openRating(actor, snapshot(p));
    return { patch: next, message: "Votación del jurado abierta.", action: "open_rating" };
  });
}

export async function closeRatingAction(formData: FormData) {
  await adminPredictionAction(formData, async ({ actor }, p) => {
    const votes = (await repo.ratingVotes([p.id])).get(p.id) ?? new Map();
    const { suggested } = summarizeRating([...votes.values()], MIN_RATING_VOTES);
    const next = rules.closeRating(actor, snapshot(p), Number(formData.get("value")), suggested);
    return {
      patch: next,
      message: `Votación cerrada: vale ${next.value} ${next.value === 1 ? "punto" : "puntos"}.`,
      action: "close_rating",
    };
  });
}

export async function validateAction(formData: FormData) {
  await adminPredictionAction(formData, async ({ actor }, p) => {
    const result = formData.get("result") as Result;
    const next = rules.validate(actor, snapshot(p), result);
    return {
      patch: { ...next, validatedAt: new Date() },
      message: result === "hit" ? "Marcada como cumplida." : "Marcada como fallida.",
      action: "validate",
    };
  });
}

export async function openValidationAction(formData: FormData) {
  await adminPredictionAction(formData, async ({ actor }, p) => {
    const next = rules.openValidation(actor, snapshot(p));
    await repo.clearValidationVotes(p.id);
    return { patch: next, message: "Validación pública abierta.", action: "open_validation" };
  });
}

export async function closeValidationAction(formData: FormData) {
  await adminPredictionAction(formData, async ({ actor }, p) => {
    const votes = (await repo.validationVotes([p.id])).get(p.id) ?? new Map();
    const { suggested } = summarizeValidation([...votes.values()], MIN_VALIDATION_VOTES);
    const result = formData.get("result") as Result;
    const next = rules.closeValidation(actor, snapshot(p), result, suggested);
    return {
      patch: { ...next, validatedAt: new Date() },
      message: `Validación cerrada: ${result === "hit" ? "cumplida" : "fallida"}.`,
      action: "close_validation",
    };
  });
}

export async function revertValidationAction(formData: FormData) {
  await adminPredictionAction(formData, async ({ actor }, p) => {
    const round = await requireRound(p.roundId);
    const next = rules.revertValidation(actor, snapshot(p), round);
    return {
      patch: { ...next, resultSetByAdmin: false, validatedAt: null },
      message: "Validación revertida: la predicción vuelve a esperar validación.",
      action: "revert_validation",
    };
  });
}

export async function deletePredictionAction(formData: FormData) {
  await adminPredictionAction(formData, async ({ actor }, p) => {
    rules.deletePrediction(actor, snapshot(p));
    await repo.deletePrediction(p.id);
    return { message: "Predicción eliminada. El autor recupera su lugar en la ronda.", action: "delete" };
  });
}

// Admin: rondas

export async function openRoundAction(formData: FormData) {
  await run(async () => {
    const { actor } = await getViewer();
    rules.openRound(actor, await repo.listRounds());
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new DomainError("invalid_text", "Poné un nombre para la ronda.");
    const round = await repo.createRound(name);
    await repo.addAudit({
      actorId: actor.id,
      action: "open_round",
      entity: "round",
      entityId: round.id,
      before: null,
      after: round,
    });
    return `Se abrió ${round.name}: ya se pueden cargar predicciones.`;
  });
}

export async function closeCollectingAction(formData: FormData) {
  await run(async () => {
    const { actor } = await getViewer();
    const round = await requireRound(formData.get("roundId"));
    const next = rules.closeCollecting(actor, round);
    await repo.updateRound(round.id, { ...next, collectingClosedAt: new Date() });
    await repo.addAudit({
      actorId: actor.id,
      action: "close_collecting",
      entity: "round",
      entityId: round.id,
      before: { state: round.state },
      after: next,
    });
    return `Se cerró la carga de ${round.name}: ya no se aceptan predicciones nuevas.`;
  });
}

export async function closeRoundAction(formData: FormData) {
  await run(async () => {
    const { actor } = await getViewer();
    const round = await requireRound(formData.get("roundId"));
    const predictions = await repo.listPredictions({ roundId: round.id });
    const next = rules.closeRound(actor, round, predictions.map(snapshot));
    await repo.updateRound(round.id, { ...next, closedAt: new Date() });
    await repo.addAudit({
      actorId: actor.id,
      action: "close_round",
      entity: "round",
      entityId: round.id,
      before: { state: round.state },
      after: next,
    });
    return `Se cerró ${round.name}: ya se ven los autores y el ranking quedó fijo.`;
  });
}

// Admin: jugadores

export async function setPermissionAction(formData: FormData) {
  await run(async () => {
    const { actor } = await getViewer();
    if (actor.role !== "admin") throw new DomainError("not_admin", "Solo un admin puede hacer esto.");
    const userId = String(formData.get("userId"));
    const permission = formData.get("permission");
    if (permission !== "canCreate" && permission !== "isJury") return null;
    const target = await repo.getUser(userId);
    if (!target) return null;
    const value = !target[permission];
    await repo.updateUser(userId, { [permission]: value });
    await repo.addAudit({
      actorId: actor.id,
      action: "set_permission",
      entity: "user",
      entityId: userId,
      before: { [permission]: !value },
      after: { [permission]: value },
    });
    return null;
  });
}

// Desarrollo

export async function switchDevUserAction(formData: FormData) {
  if (!usingMockData) return;
  (await cookies()).set(DEV_USER_COOKIE, String(formData.get("userId")), { path: "/" });
  refresh();
}
