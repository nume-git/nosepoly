import { summarizeRating, summarizeValidation } from "./scoring";
import type { Actor, PredictionState, PredictionValue, RoundState } from "./types";

export interface PredictionFacts {
  id: string;
  authorId: string;
  authorAlias: string | null;
  text: string;
  state: PredictionState;
  value: PredictionValue | null;
  valueSetByAdmin: boolean;
  resultSetByAdmin: boolean;
  hidden: boolean;
  ratingVotes: ReadonlyMap<string, PredictionValue>;
  validationVotes: ReadonlyMap<string, boolean>;
}

export type Dot = "neutral" | "primary" | "warning" | "success" | "error";

export interface PredictionCard {
  id: string;
  text: string;
  state: PredictionState;
  isMine: boolean;
  /** Solo se completa si el viewer puede ver al autor (admin o ronda cerrada). */
  authorAlias: string | null;
  helper: string;
  dot: Dot;
  canVoteRating: boolean;
  canVoteValidation: boolean;
  myRatingVote: PredictionValue | null;
  myValidationVote: boolean | null;
  pendingForMe: boolean;
}

const DOTS: Record<PredictionState, Dot> = {
  draft: "neutral",
  rating: "primary",
  rated: "neutral",
  validating: "warning",
  hit: "success",
  miss: "error",
};

function points(value: PredictionValue | null) {
  return value === 1 ? "1 punto" : `${value} puntos`;
}

export function buildCard(facts: PredictionFacts, viewer: Actor, roundState: RoundState): PredictionCard {
  const isMine = facts.authorId === viewer.id;
  const isAdmin = viewer.role === "admin";
  const judge = viewer.isJury && !isMine && !viewer.deleted;
  const myRatingVote = facts.ratingVotes.get(viewer.id) ?? null;
  const myValidationVote = facts.validationVotes.get(viewer.id) ?? null;
  const canVoteRating = judge && facts.state === "rating";
  const canVoteValidation = judge && facts.state === "validating";

  const adminNote = facts.valueSetByAdmin
    ? " · valor fijado por el admin"
    : facts.resultSetByAdmin && (facts.state === "hit" || facts.state === "miss")
      ? " · resultado decidido por el admin"
      : "";

  let helper: string;
  switch (facts.state) {
    case "draft":
      helper = "Cargada · esperando que el admin abra la votación";
      break;
    case "rating":
      helper = !canVoteRating
        ? "Votación abierta · el jurado está estimando cuánto vale"
        : myRatingVote
          ? `Votación abierta · votaste ${myRatingVote}, podés cambiarlo`
          : "Votación abierta · todavía no votaste";
      break;
    case "rated":
      helper = `Vale ${points(facts.value)} · esperando validación${adminNote}`;
      break;
    case "validating":
      helper =
        `Vale ${points(facts.value)} · validación pública abierta` +
        (canVoteValidation ? (myValidationVote === null ? " · todavía no votaste" : " · ya votaste") : "");
      break;
    case "hit":
      helper = `Cumplida · sumó ${points(facts.value)}${adminNote}`;
      break;
    case "miss":
      helper = `Fallida · no sumó (valía ${points(facts.value)})${adminNote}`;
      break;
  }

  const hiddenForViewer = facts.hidden && !isAdmin && !isMine;

  return {
    id: facts.id,
    text: hiddenForViewer ? "Predicción oculta temporalmente." : facts.text,
    state: facts.state,
    isMine,
    authorAlias: isAdmin || roundState === "closed" ? facts.authorAlias : null,
    helper,
    dot: DOTS[facts.state],
    canVoteRating: canVoteRating && !hiddenForViewer,
    canVoteValidation: canVoteValidation && !hiddenForViewer,
    myRatingVote,
    myValidationVote,
    pendingForMe:
      !hiddenForViewer &&
      ((canVoteRating && myRatingVote === null) || (canVoteValidation && myValidationVote === null)),
  };
}

export type TabId = "mias" | "otras" | "validaciones";

export interface RoundTab<C extends PredictionCard = PredictionCard> {
  id: TabId;
  label: string;
  count: string;
  cards: C[];
  emptyMessage: string;
}

const ESTIMATION_STATES: PredictionState[] = ["draft", "rating", "rated"];
const VALIDATION_STATES: PredictionState[] = ["validating", "hit", "miss"];

function openFirst<C extends PredictionCard>(cards: C[]) {
  const open = (c: PredictionCard) => c.canVoteRating || c.canVoteValidation;
  return [...cards].sort((a, b) => Number(open(b)) - Number(open(a)));
}

/**
 * Pestañas de la pantalla principal. `mineInCollecting` es cuántas predicciones
 * cargó el viewer en la ronda con la carga abierta (lo que limita el máximo).
 */
export function buildRoundTabs<C extends PredictionCard>(
  cards: C[],
  viewer: Actor,
  maxPerRound: number,
  mineInCollecting = cards.filter((c) => c.isMine).length,
): RoundTab<C>[] {
  const mine = cards.filter((c) => c.isMine);
  const others = cards.filter((c) => !c.isMine);
  const estimation = others.filter((c) => ESTIMATION_STATES.includes(c.state));
  const validation = others.filter((c) => VALIDATION_STATES.includes(c.state));
  const pendingEstimation = estimation.filter((c) => c.pendingForMe).length;
  const pendingValidation = validation.filter((c) => c.pendingForMe).length;
  const tabs: RoundTab<C>[] = [];

  if (viewer.canCreate) {
    tabs.push({
      id: "mias",
      label: "Predicciones",
      count: `${mineInCollecting}/${maxPerRound}`,
      cards: mine,
      emptyMessage: "Todavía no cargaste predicciones en esta ronda.",
    });
  }

  const juryWithoutCreate = viewer.isJury && !viewer.canCreate;

  tabs.push({
    id: "otras",
    // Sin permiso de jurado no se puede puntuar: el nombre no tiene que sugerirlo.
    label: viewer.isJury ? "Puntuar" : viewer.canCreate ? "Otras predicciones" : "Predicciones",
    count: String(viewer.isJury ? pendingEstimation : estimation.length),
    cards: juryWithoutCreate ? estimation.filter((c) => c.canVoteRating) : openFirst(estimation),
    emptyMessage: juryWithoutCreate
      ? "No hay predicciones para puntuar. Cuando se abra una votación, va a aparecer acá."
      : "Todavía no hay predicciones de otros jugadores.",
  });

  tabs.push({
    id: "validaciones",
    label: viewer.isJury ? "Verificar" : "Resultados",
    count: String(viewer.isJury ? pendingValidation : validation.length),
    cards: juryWithoutCreate ? validation.filter((c) => c.canVoteValidation) : openFirst(validation),
    emptyMessage: juryWithoutCreate
      ? "No hay predicciones para verificar. Cuando se abra una validación pública, va a aparecer acá."
      : "Todavía no hay predicciones en verificación ni resultados.",
  });

  return tabs;
}

export interface CloseSummary {
  kind: "rating" | "validation";
  count: number;
  /** Resumen en una línea para el diálogo de cierre. */
  description: string;
  suggested: PredictionValue | "hit" | "miss" | null;
  options: { value: string; label: string; votes: number }[];
}

export function buildCloseSummary(
  facts: Pick<PredictionFacts, "state" | "ratingVotes" | "validationVotes">,
  minVotes: number,
): CloseSummary | null {
  const votesLabel = (n: number) => (n === 1 ? "Hay 1 voto" : `Hay ${n} votos`);
  const noQuorum = (n: number) => `${votesLabel(n)} y se necesitan al menos ${minVotes}.`;
  const jurors = (n: number) => (n === 1 ? "1 jurado" : `${n} jurados`);
  if (facts.state === "rating") {
    const s = summarizeRating([...facts.ratingVotes.values()], minVotes);
    return {
      kind: "rating",
      count: s.count,
      description:
        s.suggested !== null && s.average !== null
          ? `Votaron ${jurors(s.count)}. El promedio es ${s.average.toFixed(1).replace(".", ",")}, así que vale ${s.suggested}. Podés confirmarlo o elegir otro valor.`
          : `${noQuorum(s.count)} Elegí vos cuánto vale.`,
      suggested: s.suggested,
      options: ([1, 2, 3] as const).map((v) => ({
        value: String(v),
        label: String(v),
        votes: s.distribution[v - 1],
      })),
    };
  }
  if (facts.state === "validating") {
    const s = summarizeValidation([...facts.validationVotes.values()], minVotes);
    const reason = s.count < minVotes ? noQuorum(s.count) : `Empate ${s.yes} a ${s.no}.`;
    return {
      kind: "validation",
      count: s.count,
      description: s.suggested
        ? `Votaron ${jurors(s.count)}: ${s.yes} que se cumplió y ${s.no} que no. Podés confirmar el resultado de la mayoría o elegir el otro.`
        : `${reason} Elegí vos si se cumplió.`,
      suggested: s.suggested,
      options: [
        { value: "hit", label: "Cumplida", votes: s.yes },
        { value: "miss", label: "Fallida", votes: s.no },
      ],
    };
  }
  return null;
}
