import { describe, expect, it } from "vitest";
import { DomainError, type DomainErrorCode } from "./errors";
import * as rules from "./rules";
import type { Actor, PredictionSnapshot, PredictionState, RoundSnapshot } from "./types";

const admin: Actor = { id: "admin", role: "admin", canCreate: true, isJury: true, deleted: false };
const player: Actor = { id: "p1", role: "player", canCreate: true, isJury: true, deleted: false };
const juryOnly: Actor = { ...player, id: "p2", canCreate: false };
const creatorOnly: Actor = { ...player, id: "p3", isJury: false };

const collecting: RoundSnapshot = { id: "r1", state: "collecting" };
const inPlay: RoundSnapshot = { id: "r1", state: "in_play" };
const closed: RoundSnapshot = { id: "r1", state: "closed" };

function prediction(state: PredictionState, authorId = "author"): PredictionSnapshot {
  return {
    id: "x",
    roundId: "r1",
    authorId,
    state,
    value: state === "draft" || state === "rating" ? null : 2,
  };
}

function expectCode(fn: () => unknown, code: DomainErrorCode) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`Se esperaba el error "${code}"`);
}

describe("createPrediction", () => {
  it("crea una predicción en borrador con el texto recortado", () => {
    expect(rules.createPrediction(player, collecting, 0, "  Va a llover  ")).toEqual({
      text: "Va a llover",
      state: "draft",
    });
  });

  it("exige permiso de creador", () => {
    expectCode(() => rules.createPrediction(juryOnly, collecting, 0, "x"), "not_creator");
  });

  it("exige que la carga esté abierta", () => {
    expectCode(() => rules.createPrediction(player, inPlay, 0, "x"), "round_not_collecting");
  });

  it("limita a 3 predicciones por ronda", () => {
    expectCode(() => rules.createPrediction(player, collecting, 3, "x"), "prediction_limit");
  });

  it("valida el largo del texto", () => {
    expectCode(() => rules.createPrediction(player, collecting, 0, "   "), "invalid_text");
    expectCode(() => rules.createPrediction(player, collecting, 0, "a".repeat(281)), "invalid_text");
  });

  it("rechaza cuentas eliminadas", () => {
    expectCode(
      () => rules.createPrediction({ ...player, deleted: true }, collecting, 0, "x"),
      "account_deleted",
    );
  });
});

describe("votos del jurado", () => {
  it("acepta un voto de estimación válido", () => {
    expect(rules.castRatingVote(juryOnly, prediction("rating"), 3)).toEqual({ value: 3 });
  });

  it("exige permiso de jurado", () => {
    expectCode(() => rules.castRatingVote(creatorOnly, prediction("rating"), 2), "not_jury");
    expectCode(() => rules.castValidationVote(creatorOnly, prediction("validating")), "not_jury");
  });

  it("no deja votar la propia predicción", () => {
    expectCode(() => rules.castRatingVote(player, prediction("rating", "p1"), 2), "own_prediction");
    expectCode(() => rules.castValidationVote(player, prediction("validating", "p1")), "own_prediction");
  });

  it("solo acepta votos con la votación abierta", () => {
    expectCode(() => rules.castRatingVote(player, prediction("rated"), 2), "invalid_state");
    expectCode(() => rules.castValidationVote(player, prediction("rated")), "invalid_state");
  });

  it("solo acepta valores 1, 2 o 3", () => {
    expectCode(() => rules.castRatingVote(player, prediction("rating"), 4), "invalid_value");
  });
});

describe("acciones del admin", () => {
  it("rechaza a quien no es admin", () => {
    expectCode(() => rules.openRating(player, prediction("draft")), "not_admin");
  });

  it("abre la votación desde draft o la reabre desde rated", () => {
    expect(rules.openRating(admin, prediction("draft")).state).toBe("rating");
    expect(rules.openRating(admin, prediction("rated")).state).toBe("rating");
    expectCode(() => rules.openRating(admin, prediction("hit")), "invalid_state");
  });

  it("al cerrar la estimación marca si el admin cambió el valor sugerido", () => {
    expect(rules.closeRating(admin, prediction("rating"), 2, 2)).toEqual({
      state: "rated",
      value: 2,
      valueSetByAdmin: false,
    });
    expect(rules.closeRating(admin, prediction("rating"), 3, 2).valueSetByAdmin).toBe(true);
    expect(rules.closeRating(admin, prediction("rating"), 1, null).valueSetByAdmin).toBe(true);
  });

  it("solo valida predicciones con valor y la estimación cerrada", () => {
    expect(rules.validate(admin, prediction("rated"), "hit").state).toBe("hit");
    expectCode(() => rules.validate(admin, prediction("rating"), "hit"), "invalid_state");
    expectCode(() => rules.openValidation(admin, prediction("draft")), "invalid_state");
  });

  it("al cerrar la validación pública marca si el admin cambió el resultado sugerido", () => {
    expect(rules.closeValidation(admin, prediction("validating"), "miss", "miss")).toEqual({
      state: "miss",
      resultSetByAdmin: false,
    });
    expect(rules.closeValidation(admin, prediction("validating"), "hit", null).resultSetByAdmin).toBe(true);
  });

  it("revierte una validación solo si la ronda no está cerrada", () => {
    expect(rules.revertValidation(admin, prediction("hit"), inPlay).state).toBe("rated");
    expectCode(() => rules.revertValidation(admin, prediction("miss"), closed), "round_closed");
  });

  it("elimina solo predicciones sin validar", () => {
    expect(() => rules.deletePrediction(admin, prediction("validating"))).not.toThrow();
    expectCode(() => rules.deletePrediction(admin, prediction("hit")), "invalid_state");
  });
});

describe("rondas", () => {
  it("permite una sola ronda con la carga abierta", () => {
    expectCode(() => rules.openRound(admin, [collecting]), "round_already_collecting");
    expect(rules.openRound(admin, [inPlay, closed]).state).toBe("collecting");
  });

  it("cierra la carga y después la ronda", () => {
    expect(rules.closeCollecting(admin, collecting).state).toBe("in_play");
    expectCode(() => rules.closeRound(admin, collecting, []), "invalid_state");
  });

  it("no cierra la ronda con predicciones sin validar", () => {
    expectCode(
      () => rules.closeRound(admin, inPlay, [prediction("hit"), prediction("rated")]),
      "round_has_pending",
    );
    expect(rules.closeRound(admin, inPlay, [prediction("hit"), prediction("miss")]).state).toBe("closed");
  });
});
