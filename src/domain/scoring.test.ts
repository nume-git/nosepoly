import { describe, expect, it } from "vitest";
import { rankPlayers, roundValue, summarizeRating, summarizeValidation } from "./scoring";

describe("roundValue", () => {
  it.each([
    [1, 1],
    [1.49, 1],
    [1.5, 2],
    [2.4, 2],
    [2.5, 3],
    [3, 3],
  ])("redondea %d a %d", (average, expected) => {
    expect(roundValue(average)).toBe(expected);
  });
});

describe("summarizeRating", () => {
  it("calcula promedio, distribución y valor sugerido con quórum", () => {
    expect(summarizeRating([1, 2, 3, 3, 3])).toEqual({
      count: 5,
      average: 2.4,
      distribution: [1, 1, 3],
      suggested: 2,
    });
  });

  it("no sugiere valor sin quórum", () => {
    const summary = summarizeRating([3, 3]);
    expect(summary.average).toBe(3);
    expect(summary.suggested).toBeNull();
  });

  it("maneja una votación sin votos", () => {
    expect(summarizeRating([])).toEqual({
      count: 0,
      average: null,
      distribution: [0, 0, 0],
      suggested: null,
    });
  });
});

describe("summarizeValidation", () => {
  it("sugiere el resultado de la mayoría", () => {
    expect(summarizeValidation([true, true, false]).suggested).toBe("hit");
    expect(summarizeValidation([false, false, true]).suggested).toBe("miss");
  });

  it("no sugiere resultado con empate", () => {
    expect(summarizeValidation([true, true, false, false]).suggested).toBeNull();
  });

  it("no sugiere resultado sin quórum", () => {
    expect(summarizeValidation([true, true]).suggested).toBeNull();
  });
});

describe("rankPlayers", () => {
  it("ordena por puntos, después cumplidas, y comparte posición en empate total", () => {
    const ranked = rankPlayers([
      { userId: "a", alias: "ana", points: 6, hits: 3 },
      { userId: "b", alias: "vos", points: 6, hits: 2 },
      { userId: "c", alias: "lucho", points: 4, hits: 2 },
      { userId: "d", alias: "juanpi", points: 4, hits: 2 },
      { userId: "e", alias: "meli", points: 3, hits: 2 },
    ]);
    expect(ranked.map((r) => [r.alias, r.position])).toEqual([
      ["ana", 1],
      ["vos", 2],
      ["lucho", 3],
      ["juanpi", 3],
      ["meli", 5],
    ]);
  });
});
