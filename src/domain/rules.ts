import { DomainError } from "./errors";
import type {
  Actor,
  PredictionSnapshot,
  PredictionState,
  PredictionValue,
  Result,
  RoundSnapshot,
} from "./types";

export const MAX_PREDICTIONS_PER_ROUND = 3;
export const MAX_PREDICTION_LENGTH = 280;

function assertActive(actor: Actor) {
  if (actor.deleted) {
    throw new DomainError("account_deleted", "La cuenta fue eliminada.");
  }
}

function assertAdmin(actor: Actor) {
  assertActive(actor);
  if (actor.role !== "admin") {
    throw new DomainError("not_admin", "Solo un admin puede hacer esto.");
  }
}

function assertState(prediction: PredictionSnapshot, allowed: readonly PredictionState[]) {
  if (!allowed.includes(prediction.state)) {
    throw new DomainError(
      "invalid_state",
      `No se puede hacer esto con una predicción ${STATE_LABELS[prediction.state]}. Actualizá la página y probá de nuevo.`,
    );
  }
}

const STATE_LABELS: Record<PredictionState, string> = {
  draft: "que todavía no tiene la votación abierta",
  rating: "con la votación del jurado abierta",
  rated: "que espera validación",
  validating: "en validación pública",
  hit: "ya cumplida",
  miss: "ya fallida",
};

function assertValue(value: number): asserts value is PredictionValue {
  if (value !== 1 && value !== 2 && value !== 3) {
    throw new DomainError("invalid_value", "El valor tiene que ser 1, 2 o 3.");
  }
}

export function isValidated(state: PredictionState): boolean {
  return state === "hit" || state === "miss";
}

// Rondas

export function openRound(actor: Actor, rounds: readonly RoundSnapshot[]) {
  assertAdmin(actor);
  if (rounds.some((round) => round.state === "collecting")) {
    throw new DomainError("round_already_collecting", "Ya hay una ronda con la carga abierta.");
  }
  return { state: "collecting" as const };
}

export function closeCollecting(actor: Actor, round: RoundSnapshot) {
  assertAdmin(actor);
  if (round.state !== "collecting") {
    throw new DomainError("round_not_collecting", "La carga de esta ronda ya está cerrada.");
  }
  return { state: "in_play" as const };
}

export function closeRound(actor: Actor, round: RoundSnapshot, predictions: readonly PredictionSnapshot[]) {
  assertAdmin(actor);
  if (round.state !== "in_play") {
    throw new DomainError("invalid_state", "Primero hay que cerrar la carga de la ronda.");
  }
  const pending = predictions.filter((p) => !isValidated(p.state)).length;
  if (pending > 0) {
    throw new DomainError(
      "round_has_pending",
      `Falta validar ${pending} ${pending === 1 ? "predicción" : "predicciones"}.`,
    );
  }
  return { state: "closed" as const };
}

// Predicciones: jugadores

export function createPrediction(
  actor: Actor,
  round: RoundSnapshot,
  existingInRound: number,
  rawText: string,
) {
  assertActive(actor);
  if (!actor.canCreate) {
    throw new DomainError("not_creator", "No tenés permiso para crear predicciones.");
  }
  if (round.state !== "collecting") {
    throw new DomainError("round_not_collecting", "La carga de esta ronda está cerrada.");
  }
  if (existingInRound >= MAX_PREDICTIONS_PER_ROUND) {
    throw new DomainError(
      "prediction_limit",
      `Ya cargaste ${MAX_PREDICTIONS_PER_ROUND} predicciones en esta ronda.`,
    );
  }
  const text = rawText.trim();
  if (text.length === 0 || text.length > MAX_PREDICTION_LENGTH) {
    throw new DomainError(
      "invalid_text",
      `La predicción tiene que tener entre 1 y ${MAX_PREDICTION_LENGTH} caracteres.`,
    );
  }
  return { text, state: "draft" as const };
}

function assertCanJudge(actor: Actor, prediction: PredictionSnapshot) {
  assertActive(actor);
  if (!actor.isJury) {
    throw new DomainError("not_jury", "No tenés permiso para votar como jurado.");
  }
  if (prediction.authorId === actor.id) {
    throw new DomainError("own_prediction", "No podés votar tus propias predicciones.");
  }
}

export function castRatingVote(actor: Actor, prediction: PredictionSnapshot, value: number) {
  assertCanJudge(actor, prediction);
  assertState(prediction, ["rating"]);
  assertValue(value);
  return { value };
}

export function castValidationVote(actor: Actor, prediction: PredictionSnapshot) {
  assertCanJudge(actor, prediction);
  assertState(prediction, ["validating"]);
}

// Predicciones: admin

export function openRating(actor: Actor, prediction: PredictionSnapshot) {
  assertAdmin(actor);
  assertState(prediction, ["draft", "rated"]);
  return { state: "rating" as const, value: null };
}

export function closeRating(
  actor: Actor,
  prediction: PredictionSnapshot,
  value: number,
  suggested: PredictionValue | null,
) {
  assertAdmin(actor);
  assertState(prediction, ["rating"]);
  assertValue(value);
  return { state: "rated" as const, value, valueSetByAdmin: value !== suggested };
}

export function validate(actor: Actor, prediction: PredictionSnapshot, result: Result) {
  assertAdmin(actor);
  assertState(prediction, ["rated"]);
  return { state: result, resultSetByAdmin: true };
}

export function openValidation(actor: Actor, prediction: PredictionSnapshot) {
  assertAdmin(actor);
  assertState(prediction, ["rated"]);
  return { state: "validating" as const };
}

export function closeValidation(
  actor: Actor,
  prediction: PredictionSnapshot,
  result: Result,
  suggested: Result | null,
) {
  assertAdmin(actor);
  assertState(prediction, ["validating"]);
  return { state: result, resultSetByAdmin: result !== suggested };
}

export function revertValidation(actor: Actor, prediction: PredictionSnapshot, round: RoundSnapshot) {
  assertAdmin(actor);
  assertState(prediction, ["hit", "miss"]);
  if (round.state === "closed") {
    throw new DomainError("round_closed", "La ronda ya está cerrada: no se puede revertir la validación.");
  }
  return { state: "rated" as const };
}

export function deletePrediction(actor: Actor, prediction: PredictionSnapshot) {
  assertAdmin(actor);
  if (isValidated(prediction.state)) {
    throw new DomainError(
      "invalid_state",
      "Una predicción validada no se puede eliminar. Primero hay que revertir la validación.",
    );
  }
}
