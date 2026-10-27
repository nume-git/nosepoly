import "server-only";
import { cache } from "react";
import { MAX_PREDICTIONS_PER_ROUND } from "@/domain/rules";
import {
  MIN_RATING_VOTES,
  MIN_VALIDATION_VOTES,
  rankPlayers,
  roundValue,
  summarizeRating,
} from "@/domain/scoring";
import type { RoundState } from "@/domain/types";
import {
  buildCard,
  buildCloseSummary,
  buildRoundTabs,
  type CloseSummary,
  type PredictionCard,
  type PredictionFacts,
  type RoundTab,
} from "@/domain/views";
import { repo } from "./repo";
import type { PredictionRecord, RoundRecord, UserRecord } from "./repository";
import type { Viewer } from "./session";

async function loadFacts(predictions: PredictionRecord[]): Promise<(PredictionRecord & PredictionFacts)[]> {
  const ids = predictions.map((p) => p.id);
  const [ratings, validations, users] = await Promise.all([
    repo.ratingVotes(ids),
    repo.validationVotes(ids),
    repo.listUsers(),
  ]);
  const aliases = new Map(users.map((u) => [u.id, u.alias ?? "Usuario eliminado"]));
  return predictions.map((p) => ({
    ...p,
    authorAlias: aliases.get(p.authorId) ?? null,
    ratingVotes: ratings.get(p.id) ?? new Map(),
    validationVotes: validations.get(p.id) ?? new Map(),
  }));
}

export async function getActiveRound(): Promise<RoundRecord | null> {
  const rounds = await repo.listRounds();
  return (
    rounds.find((r) => r.state === "collecting") ??
    rounds.find((r) => r.state === "in_play") ??
    rounds[0] ??
    null
  );
}

export type RoundCard = PredictionCard & { roundId: string };

export interface RoundPage {
  /** Todas las rondas: primero la que tiene la carga abierta, después el resto de la más nueva a la más vieja. */
  rounds: RoundRecord[];
  /** Ronda que se muestra por defecto: la que tiene la carga abierta o, si no hay, la más reciente. */
  currentRoundId: string;
  /** Ronda con la carga abierta, si hay una. */
  collecting: RoundRecord | null;
  tabs: RoundTab<RoundCard>[];
  mineCount: number;
  maxPerRound: number;
  canCreateNow: boolean;
  pendingTotal: number;
}

/**
 * Pantalla principal. Incluye todas las rondas: la página muestra por defecto
 * solo la actual y las anteriores a pedido. Los contadores de las pestañas
 * cuentan solo las rondas no cerradas, que son las que pueden tener votaciones.
 */
export const getRoundPage = cache(async (viewer: Viewer): Promise<RoundPage | null> => {
  const rounds = (await repo.listRounds()).sort(
    (a, b) => Number(b.state === "collecting") - Number(a.state === "collecting"),
  );
  if (rounds.length === 0) return null;
  const byId = new Map(rounds.map((r) => [r.id, r]));
  const collecting = rounds.find((r) => r.state === "collecting") ?? null;
  const facts = await loadFacts(await repo.listPredictions());

  const cards: RoundCard[] = facts.map((f) => ({
    ...buildCard(f, viewer.actor, byId.get(f.roundId)!.state),
    roundId: f.roundId,
  }));
  const mineCount = collecting
    ? facts.filter((f) => f.roundId === collecting.id && f.authorId === viewer.actor.id).length
    : 0;

  const openCards = cards.filter((c) => byId.get(c.roundId)!.state !== "closed");
  const counts = buildRoundTabs(openCards, viewer.actor, MAX_PREDICTIONS_PER_ROUND, mineCount);
  const tabs = buildRoundTabs(cards, viewer.actor, MAX_PREDICTIONS_PER_ROUND, mineCount).map((tab, i) => ({
    ...tab,
    count: counts[i].count,
  }));

  return {
    rounds,
    currentRoundId: (collecting ?? rounds[0]).id,
    collecting,
    tabs,
    mineCount,
    maxPerRound: MAX_PREDICTIONS_PER_ROUND,
    canCreateNow: viewer.actor.canCreate && collecting !== null && mineCount < MAX_PREDICTIONS_PER_ROUND,
    pendingTotal: cards.filter((c) => c.pendingForMe).length,
  };
});

export async function getRanking(viewerId: string) {
  const [users, predictions] = await Promise.all([repo.listUsers(), repo.listPredictions()]);
  const byAuthor = new Map<string, { points: number; hits: number }>();
  for (const p of predictions) {
    const entry = byAuthor.get(p.authorId) ?? { points: 0, hits: 0 };
    if (p.state === "hit" && p.value) {
      entry.points += p.value;
      entry.hits += 1;
    }
    byAuthor.set(p.authorId, entry);
  }
  return rankPlayers(
    users
      .filter((u) => u.deletedAt === null && u.alias && byAuthor.has(u.id))
      .map((u) => ({ userId: u.id, alias: u.alias!, ...byAuthor.get(u.id)! })),
  ).map((r) => ({ ...r, isMe: r.userId === viewerId }));
}

export interface AdminItem {
  id: string;
  text: string;
  author: string;
  roundName: string;
  state: PredictionRecord["state"];
  value: PredictionRecord["value"];
  votes: number;
  estimate: string | null;
  close: CloseSummary | null;
}

export interface AdminRound {
  id: string;
  name: string;
  state: RoundState;
  total: number;
  pending: number;
}

export async function getAdminPage() {
  const [rounds, users] = await Promise.all([repo.listRounds(), repo.listUsers()]);
  const openRounds = new Map(rounds.filter((r) => r.state !== "closed").map((r) => [r.id, r]));
  const all = await repo.listPredictions();
  const facts = await loadFacts(all.filter((p) => openRounds.has(p.roundId)));

  const items: AdminItem[] = facts.map((f) => {
    const votes = f.state === "validating" ? f.validationVotes.size : f.ratingVotes.size;
    const rating = summarizeRating([...f.ratingVotes.values()], MIN_RATING_VOTES);
    return {
      id: f.id,
      text: f.text,
      author: f.authorAlias ?? "Usuario eliminado",
      roundName: openRounds.get(f.roundId)?.name ?? "",
      state: f.state,
      value: f.value,
      votes,
      estimate:
        f.state !== "rating"
          ? null
          : rating.average === null
            ? "Sin votos todavía"
            : `Estimación: ${rating.average.toFixed(1).replace(".", ",")} → vale ${roundValue(rating.average)}`,
      close: buildCloseSummary(f, f.state === "rating" ? MIN_RATING_VOTES : MIN_VALIDATION_VOTES),
    };
  });

  const adminRounds: AdminRound[] = rounds.map((r) => {
    const inRound = all.filter((p) => p.roundId === r.id);
    return {
      id: r.id,
      name: r.name,
      state: r.state,
      total: inRound.length,
      pending: inRound.filter((p) => p.state !== "hit" && p.state !== "miss").length,
    };
  });

  return {
    items,
    rounds: adminRounds,
    users: users.sort((a, b) => (a.alias ?? "").localeCompare(b.alias ?? "")),
    minRatingVotes: MIN_RATING_VOTES,
  };
}

export type AdminPage = Awaited<ReturnType<typeof getAdminPage>>;
export type { UserRecord };
