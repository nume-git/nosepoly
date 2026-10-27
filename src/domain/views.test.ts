import { describe, expect, it } from "vitest";
import type { Actor, PredictionState } from "./types";
import { buildCard, buildCloseSummary, buildRoundTabs, type PredictionFacts } from "./views";

const base: Actor = { id: "me", role: "player", canCreate: true, isJury: true, deleted: false };
const admin: Actor = { ...base, id: "adm", role: "admin" };

function facts(state: PredictionState, extra: Partial<PredictionFacts> = {}): PredictionFacts {
  return {
    id: `p-${state}`,
    authorId: "other",
    authorAlias: "ana",
    text: "Llueve mañana",
    state,
    value: state === "draft" || state === "rating" ? null : 2,
    valueSetByAdmin: false,
    resultSetByAdmin: false,
    hidden: false,
    ratingVotes: new Map(),
    validationVotes: new Map(),
    ...extra,
  };
}

describe("buildCard", () => {
  it("oculta el autor a los jugadores mientras la ronda no está cerrada", () => {
    expect(buildCard(facts("rating"), base, "collecting").authorAlias).toBeNull();
    expect(buildCard(facts("hit"), base, "closed").authorAlias).toBe("ana");
    expect(buildCard(facts("rating"), admin, "collecting").authorAlias).toBe("ana");
  });

  it("muestra el voto propio y permite cambiarlo", () => {
    const card = buildCard(facts("rating", { ratingVotes: new Map([["me", 2]]) }), base, "collecting");
    expect(card.canVoteRating).toBe(true);
    expect(card.myRatingVote).toBe(2);
    expect(card.pendingForMe).toBe(false);
    expect(card.helper).toBe("Votación abierta · votaste 2, podés cambiarlo");
  });

  it("no deja votar sin permiso de jurado ni en la propia predicción", () => {
    expect(buildCard(facts("rating"), { ...base, isJury: false }, "collecting").canVoteRating).toBe(false);
    const mine = buildCard(facts("rating", { authorId: "me" }), base, "collecting");
    expect(mine.isMine).toBe(true);
    expect(mine.canVoteRating).toBe(false);
    expect(mine.helper).toBe("Votación abierta · el jurado está estimando cuánto vale");
  });

  it("describe resultados y decisiones del admin", () => {
    expect(buildCard(facts("hit"), base, "in_play").helper).toBe("Cumplida · sumó 2 puntos");
    expect(buildCard(facts("miss", { value: 1, resultSetByAdmin: true }), base, "in_play").helper).toBe(
      "Fallida · no sumó (valía 1 punto) · resultado decidido por el admin",
    );
  });

  it("oculta el texto de predicciones ocultas por veda, salvo al admin y al autor", () => {
    const hidden = facts("validating", { hidden: true });
    const card = buildCard(hidden, base, "in_play");
    expect(card.text).not.toContain("Llueve");
    expect(card.canVoteValidation).toBe(false);
    expect(buildCard(hidden, admin, "in_play").text).toBe("Llueve mañana");
  });
});

describe("buildRoundTabs", () => {
  const cards = [
    buildCard(facts("rating"), base, "collecting"),
    buildCard(facts("draft"), base, "collecting"),
    buildCard(facts("validating"), base, "collecting"),
    buildCard(facts("hit"), base, "collecting"),
    buildCard(facts("rating", { id: "mine", authorId: "me" }), base, "collecting"),
  ];

  it("creador y jurado: tres pestañas con contadores de pendientes", () => {
    const tabs = buildRoundTabs(cards, base, 3);
    expect(tabs.map((t) => [t.id, t.label, t.count])).toEqual([
      ["mias", "Predicciones", "1/3"],
      ["otras", "Puntuar", "1"],
      ["validaciones", "Verificar", "1"],
    ]);
    expect(tabs[1].cards[0].state).toBe("rating");
  });

  it("solo jurado: sin pestaña propia y solo votaciones abiertas", () => {
    const viewer = { ...base, canCreate: false };
    const tabs = buildRoundTabs(cards, viewer, 3);
    expect(tabs.map((t) => t.label)).toEqual(["Puntuar", "Verificar"]);
    expect(tabs[0].cards.every((c) => c.canVoteRating)).toBe(true);
    expect(tabs[1].cards.map((c) => c.state)).toEqual(["validating"]);
  });

  it("sin permisos: todo en modo lectura", () => {
    const viewer = { ...base, canCreate: false, isJury: false };
    const tabs = buildRoundTabs(cards, viewer, 3);
    expect(tabs.map((t) => [t.label, t.count])).toEqual([
      ["Predicciones", "2"],
      ["Resultados", "2"],
    ]);
  });
});

describe("buildCloseSummary", () => {
  it("resume la estimación con distribución y sugerencia", () => {
    const summary = buildCloseSummary(
      facts("rating", {
        ratingVotes: new Map([
          ["a", 1],
          ["b", 2],
          ["c", 3],
          ["d", 3],
          ["e", 3],
        ]),
      }),
      3,
    );
    expect(summary?.suggested).toBe(2);
    expect(summary?.options.map((o) => o.votes)).toEqual([1, 1, 3]);
    expect(summary?.description).toBe(
      "Votaron 5 jurados. El promedio es 2,4, así que vale 2. Podés confirmarlo o elegir otro valor.",
    );
  });

  it("explica el empate en la validación pública", () => {
    const summary = buildCloseSummary(
      facts("validating", {
        validationVotes: new Map([
          ["a", true],
          ["b", true],
          ["c", false],
          ["d", false],
        ]),
      }),
      3,
    );
    expect(summary?.suggested).toBeNull();
    expect(summary?.description).toBe("Empate 2 a 2. Elegí vos si se cumplió.");
  });
});
