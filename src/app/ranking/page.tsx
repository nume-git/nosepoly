import { Container, Heading, Table, Text, VisuallyHidden } from "@chakra-ui/react";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { getRanking } from "@/server/queries";
import { getViewer } from "@/server/session";

export default function RankingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RankingScreen />
    </Suspense>
  );
}

async function RankingScreen() {
  const viewer = await getViewer();
  const ranking = await getRanking(viewer.actor.id);

  return (
    <Container as="main" id="ranking" maxW="5xl" p="4" display="flex" flexDirection="column" gap="3">
      <VisuallyHidden asChild>
        <Heading as="h1">Ranking</Heading>
      </VisuallyHidden>
      <Table.ScrollArea borderWidth="1px" rounded="l3" bg="bg.panel">
        <Table.Root id="ranking-table">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader w="16">#</Table.ColumnHeader>
              <Table.ColumnHeader>Jugador</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Puntos</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {ranking.map((row) => (
              <Table.Row
                key={row.userId}
                id={`ranking-row-${row.userId}`}
                bg={row.isMe ? "blue.subtle" : undefined}
                fontWeight={row.isMe ? "bold" : undefined}
              >
                <Table.Cell fontWeight="bold" color="fg.muted" fontVariantNumeric="tabular-nums">
                  {row.position}
                </Table.Cell>
                <Table.Cell>{row.isMe ? `${row.alias} (vos)` : row.alias}</Table.Cell>
                <Table.Cell textAlign="end" fontWeight="extrabold" fontVariantNumeric="tabular-nums">
                  {row.points}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      <Text id="ranking-note" textStyle="sm" color="fg.muted">
        Ranking global acumulado. A igual puntaje, queda arriba quien tiene más predicciones cumplidas.
      </Text>
    </Container>
  );
}
