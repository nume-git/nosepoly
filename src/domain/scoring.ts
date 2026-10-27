import type { PredictionValue, Result } from "./types";

export const MIN_RATING_VOTES = 3;
export const MIN_VALIDATION_VOTES = 3;

export function roundValue(average: number): PredictionValue {
  const rounded = Math.floor(average + 0.5);
  return Math.min(3, Math.max(1, rounded)) as PredictionValue;
}

export interface RatingSummary {
  count: number;
  average: number | null;
  distribution: [number, number, number];
  suggested: PredictionValue | null;
}

export function summarizeRating(
  votes: readonly PredictionValue[],
  minVotes = MIN_RATING_VOTES,
): RatingSummary {
  const distribution: [number, number, number] = [0, 0, 0];
  for (const vote of votes) distribution[vote - 1] += 1;
  const count = votes.length;
  const average = count ? votes.reduce<number>((sum, vote) => sum + vote, 0) / count : null;
  return {
    count,
    average,
    distribution,
    suggested: average !== null && count >= minVotes ? roundValue(average) : null,
  };
}

export interface ValidationSummary {
  count: number;
  yes: number;
  no: number;
  suggested: Result | null;
}

export function summarizeValidation(
  votes: readonly boolean[],
  minVotes = MIN_VALIDATION_VOTES,
): ValidationSummary {
  const yes = votes.filter(Boolean).length;
  const no = votes.length - yes;
  const decided = votes.length >= minVotes && yes !== no;
  return {
    count: votes.length,
    yes,
    no,
    suggested: decided ? (yes > no ? "hit" : "miss") : null,
  };
}

export interface RankingEntry {
  userId: string;
  alias: string;
  points: number;
  hits: number;
}

export interface RankedEntry extends RankingEntry {
  position: number;
}

function averageHitValue(entry: RankingEntry): number {
  return entry.hits ? entry.points / entry.hits : 0;
}

export function rankPlayers(entries: readonly RankingEntry[]): RankedEntry[] {
  const sorted = [...entries].sort(
    (a, b) => b.points - a.points || b.hits - a.hits || averageHitValue(b) - averageHitValue(a),
  );
  let position = 0;
  return sorted.map((entry, index) => {
    const previous = sorted[index - 1];
    const tied = previous !== undefined && previous.points === entry.points && previous.hits === entry.hits;
    if (!tied) position = index + 1;
    return { ...entry, position };
  });
}
