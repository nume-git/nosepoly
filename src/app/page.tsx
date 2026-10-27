import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Flex,
  Heading,
  Progress,
  Stack,
  Strong,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react";
import Link from "next/link";
import { Suspense } from "react";
import { NewPredictionDialog } from "@/components/new-prediction-dialog";
import { PageSkeleton } from "@/components/page-skeleton";
import { PredictionCard } from "@/components/prediction-card";
import { createPredictionAction } from "@/server/actions";
import { getRoundPage, type RoundCard, type RoundPage } from "@/server/queries";
import type { RoundRecord } from "@/server/repository";
import { getViewer, type Viewer } from "@/server/session";

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RoundScreen searchParams={searchParams} />
    </Suspense>
  );
}

function permissionsAlert(viewer: Viewer) {
  const { canCreate, isJury } = viewer.actor;
  if (canCreate && isJury) return null;
  if (isJury) {
    return {
      title: "Participás como jurado.",
      text: "Podés estimar y validar las predicciones de los demás. Para crear las tuyas, un admin tiene que habilitarte.",
    };
  }
  if (canCreate) {
    return {
      title: "Todavía no sos jurado.",
      text: "Podés crear predicciones. Para estimar y validar las de los demás, un admin tiene que habilitarte como jurado.",
    };
  }
  return {
    title: "Todavía no podés participar.",
    text: "Podés seguir las rondas en vivo. Para jugar, un admin tiene que habilitarte como creador o como jurado.",
  };
}

async function RoundScreen({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const viewer = await getViewer();
  const page = await getRoundPage(viewer);
  const { tab, anteriores } = await searchParams;
  const showPast = anteriores === "1";

  if (!page) {
    return (
      <Center as="main" id="no-rounds" flex="1" p="4">
        <Text color="fg.muted">No hay rondas abiertas por ahora. Volvé pronto.</Text>
      </Center>
    );
  }

  const current = page.tabs.find((t) => t.id === tab) ?? page.tabs[0];
  const alert = permissionsAlert(viewer);
  const isMine = current.id === "mias";
  const cardsOf = (roundId: string) => current.cards.filter((c) => c.roundId === roundId);

  // En "Predicciones" (las propias), la ronda con la carga abierta va dentro del resumen.
  const allGroups = page.rounds
    .filter((round) => !(isMine && round.id === page.collecting?.id))
    .map((round) => ({ round, cards: cardsOf(round.id) }))
    .filter((group) => group.cards.length > 0);
  // Por defecto solo se ve la ronda actual; las anteriores, a pedido.
  const pastGroups = allGroups.filter((g) => g.round.id !== page.currentRoundId);
  const groups = showPast ? allGroups : allGroups.filter((g) => g.round.id === page.currentRoundId);
  const pastPending = pastGroups.flatMap((g) => g.cards).filter((c) => c.pendingForMe).length;

  return (
    <Container
      as="main"
      id={`round-tab-${current.id}`}
      maxW="5xl"
      p="4"
      display="flex"
      flexDirection="column"
      gap="6"
    >
      <VisuallyHidden asChild>
        <Heading as="h1">{current.label}</Heading>
      </VisuallyHidden>

      {alert && (
        <Alert.Root id="permissions-alert" role="note" status="info">
          <Alert.Indicator />
          <Alert.Description>
            <Strong>{alert.title}</Strong> {alert.text}
          </Alert.Description>
        </Alert.Root>
      )}

      {isMine && (
        <MyPredictionsSummary page={page} cards={page.collecting ? cardsOf(page.collecting.id) : []} />
      )}

      {groups.map(({ round, cards }) => (
        <Card.Root as="section" key={round.id} id={`round-group-${round.id}`} variant="outline" bg="bg.panel">
          <Card.Body gap="4" p="5">
            <RoundHeading round={round} />
            <Stack gap="3">
              {cards.map((card) => (
                <PredictionCard key={card.id} card={card} nested />
              ))}
            </Stack>
          </Card.Body>
        </Card.Root>
      ))}

      {!isMine && groups.length === 0 && (
        <Text
          id="empty-state"
          rounded="l3"
          borderWidth="1px"
          borderStyle="dashed"
          bg="bg.panel"
          p="10"
          textAlign="center"
          color="fg.muted"
        >
          {!showPast && pastGroups.length > 0
            ? `No hay nada para mostrar en ${page.rounds.find((r) => r.id === page.currentRoundId)?.name}. Las rondas anteriores están ocultas.`
            : current.emptyMessage}
        </Text>
      )}

      {pastGroups.length > 0 && (
        <Button asChild variant="ghost" alignSelf="center">
          <Link
            id="toggle-past-rounds"
            href={`/?tab=${current.id}${showPast ? "" : "&anteriores=1"}`}
            scroll={false}
          >
            {showPast ? "Ocultar rondas anteriores" : `Mostrar rondas anteriores (${pastGroups.length})`}
            {!showPast && pastPending > 0 && (
              <Badge id="toggle-past-rounds-pending" size="sm" colorPalette="blue" variant="solid">
                {pastPending} por votar
              </Badge>
            )}
          </Link>
        </Button>
      )}
    </Container>
  );
}

const ROUND_STATE: Record<RoundRecord["state"], { label: string; palette: string }> = {
  collecting: { label: "Carga abierta", palette: "green" },
  in_play: { label: "En juego", palette: "orange" },
  closed: { label: "Cerrada", palette: "gray" },
};

function RoundHeading({ round }: { round: RoundRecord }) {
  return (
    <Heading as="h2" id={`round-heading-${round.id}`} size="md" display="flex" alignItems="center" gap="2">
      {round.name}
      <Badge size="sm" colorPalette={ROUND_STATE[round.state].palette}>
        {ROUND_STATE[round.state].label}
      </Badge>
    </Heading>
  );
}

function MyPredictionsSummary({ page, cards }: { page: RoundPage; cards: RoundCard[] }) {
  return (
    <Card.Root as="section" id="my-predictions-summary" variant="outline" bg="bg.panel">
      <Card.Body gap="4" p="5">
        {page.collecting ? (
          <>
            <Flex wrap="wrap" align="center" justify="space-between" gap="4">
              <Stack gap="2" minW="52">
                <RoundHeading round={page.collecting} />
                <Text color="fg.muted">
                  Cargaste{" "}
                  <Strong color="fg">
                    {page.mineCount} de {page.maxPerRound}
                  </Strong>{" "}
                  predicciones
                </Text>
                <Progress.Root
                  id="my-predictions-progress"
                  value={page.mineCount}
                  max={page.maxPerRound}
                  colorPalette="blue"
                  size="sm"
                >
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Stack>
              <NewPredictionDialog
                roundId={page.collecting.id}
                remainingAfter={Math.max(0, page.maxPerRound - page.mineCount - 1)}
                disabled={!page.canCreateNow}
                action={createPredictionAction}
              />
            </Flex>
            {cards.length === 0 ? (
              <Text id="my-predictions-empty" color="fg.muted">
                Todavía no cargaste predicciones en esta ronda.
              </Text>
            ) : (
              <Stack id="my-predictions-current" gap="3">
                {cards.map((card) => (
                  <PredictionCard key={card.id} card={card} nested />
                ))}
              </Stack>
            )}
          </>
        ) : (
          <Text color="fg.muted">
            No hay ninguna ronda con la carga abierta. Cuando el admin abra una, vas a poder cargar
            predicciones.
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  );
}
