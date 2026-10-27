import {
  Badge,
  Box,
  Button,
  Container,
  Field,
  Flex,
  Heading,
  Input,
  List,
  Portal,
  Span,
  Stack,
  Strong,
  Table,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CloseVoteDialog } from "@/components/admin/close-vote-dialog";
import { Form } from "@/components/form";
import { PermissionSwitch } from "@/components/admin/permission-switch";
import { PageSkeleton } from "@/components/page-skeleton";
import type { PredictionState } from "@/domain/types";
import {
  closeCollectingAction,
  closeRatingAction,
  closeRoundAction,
  closeValidationAction,
  deletePredictionAction,
  openRatingAction,
  openRoundAction,
  openValidationAction,
  revertValidationAction,
  setPermissionAction,
  validateAction,
} from "@/server/actions";
import { getAdminPage, type AdminItem, type AdminPage } from "@/server/queries";
import { getViewer } from "@/server/session";

const SECTIONS = [
  { id: "pendientes", label: "Pendientes" },
  { id: "rondas", label: "Rondas" },
  { id: "jugadores", label: "Jugadores" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Caja con borde sobre el fondo de la página (secciones, filas de rondas, tablas). */
const PANEL = { borderWidth: "1px", rounded: "l3", bg: "bg.panel" } as const;

export default function AdminPageRoute({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminScreen({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const viewer = await getViewer();
  if (viewer.actor.role !== "admin") redirect("/");
  const [data, params] = await Promise.all([getAdminPage(), searchParams]);
  const section: SectionId = SECTIONS.some((s) => s.id === params.seccion)
    ? (params.seccion as SectionId)
    : "pendientes";
  const pendingCount = data.items.filter((i) => i.state !== "hit" && i.state !== "miss").length;
  const newUsers = data.users.filter((u) => !u.canCreate && !u.isJury && u.deletedAt === null).length;

  return (
    <Container id="admin" maxW="6xl" p="4" display="flex" flexWrap="wrap" alignItems="flex-start" gap="6">
      <Box as="aside" id="admin-menu" flex="1 1 200px" maxW="full" p="2" {...PANEL}>
        <List.Root variant="plain" gap="1" aria-label="Panel del admin">
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <List.Item key={s.id}>
                <Button
                  asChild
                  variant={active ? "subtle" : "ghost"}
                  w="full"
                  justifyContent="flex-start"
                  fontWeight={active ? "bold" : "medium"}
                >
                  <Link
                    id={`admin-menu-${s.id}`}
                    href={`/admin?seccion=${s.id}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {s.label}
                    {s.id === "pendientes" && (
                      <Badge size="sm" variant="outline">
                        {pendingCount}
                      </Badge>
                    )}
                    {s.id === "jugadores" && newUsers > 0 && (
                      <Badge size="sm" colorPalette="blue" whiteSpace="nowrap">
                        {newUsers} sin permisos
                      </Badge>
                    )}
                  </Link>
                </Button>
              </List.Item>
            );
          })}
        </List.Root>
      </Box>
      <Flex as="main" id={`admin-section-${section}`} flex="999 1 560px" minW="0" direction="column" gap="5">
        {section === "pendientes" && <Pending data={data} />}
        {section === "rondas" && <Rounds data={data} />}
        {section === "jugadores" && <Players data={data} />}
      </Flex>
    </Container>
  );
}

const GROUPS: { key: string; title: string; states: PredictionState[]; empty: string }[] = [
  { key: "draft", title: "Para abrir votación", states: ["draft"], empty: "No hay predicciones nuevas." },
  {
    key: "rating",
    title: "Votaciones del jurado abiertas",
    states: ["rating"],
    empty: "No hay votaciones abiertas.",
  },
  {
    key: "rated",
    title: "Para validar",
    states: ["rated"],
    empty: "No hay predicciones esperando validación.",
  },
  {
    key: "validating",
    title: "Validaciones públicas abiertas",
    states: ["validating"],
    empty: "No hay validaciones públicas abiertas.",
  },
  {
    key: "validated",
    title: "Validadas (se pueden revertir hasta que cierre la ronda)",
    states: ["hit", "miss"],
    empty: "Todavía no hay predicciones validadas en las rondas abiertas.",
  },
];

function Pending({ data }: { data: AdminPage }) {
  return (
    <>
      <Box>
        <Heading as="h1" size="3xl" fontWeight="extrabold">
          Pendientes
        </Heading>
        <Text color="fg.muted">
          Todo lo que necesita una acción tuya en las rondas abiertas. Ves autores, cantidad de votos y la
          estimación parcial.
        </Text>
      </Box>
      {GROUPS.map((group) => {
        const items = data.items.filter((i) => group.states.includes(i.state));
        return (
          <Box as="section" key={group.key} id={`admin-group-${group.key}`} {...PANEL}>
            <Heading
              as="h2"
              size="md"
              display="flex"
              alignItems="center"
              gap="2"
              borderBottomWidth="1px"
              px="5"
              py="3"
            >
              {group.title}
              <Badge size="sm" variant="outline">
                {items.length}
              </Badge>
            </Heading>
            {items.length === 0 ? (
              <Text px="5" py="4" color="fg.muted">
                {group.empty}
              </Text>
            ) : (
              <List.Root variant="plain" divideY="1px">
                {items.map((item) => (
                  <AdminRow key={item.id} item={item} minVotes={data.minRatingVotes} />
                ))}
              </List.Root>
            )}
          </Box>
        );
      })}
    </>
  );
}

function Hidden({ id }: { id: string }) {
  return <Input type="hidden" name="predictionId" value={id} />;
}

function AdminRow({ item, minVotes }: { item: AdminItem; minVotes: number }) {
  const votesLabel =
    item.state === "rating" || item.state === "validating"
      ? `${item.votes} ${item.votes === 1 ? "voto" : "votos"}`
      : null;
  const quorum = item.votes >= minVotes;

  return (
    <List.Item
      id={`admin-item-${item.id}`}
      display="flex"
      flexWrap="wrap"
      alignItems="center"
      justifyContent="space-between"
      columnGap="5"
      rowGap="3"
      px="5"
      py="4"
    >
      <Flex minW="0" flex="1 1 320px" direction="column" gap="1">
        <Text fontWeight="semibold">{item.text}</Text>
        <Flex wrap="wrap" align="center" gap="2" textStyle="sm" color="fg.muted">
          <Span>
            por <Strong color="fg">{item.author}</Strong>
          </Span>
          <Span aria-hidden>·</Span>
          <Span>{item.roundName}</Span>
          {item.value !== null && item.state !== "rating" && (
            <Text as="span" fontWeight="semibold" color="fg">
              · Vale {item.value} {item.value === 1 ? "punto" : "puntos"}
            </Text>
          )}
          {votesLabel && <Span>· {votesLabel}</Span>}
          {votesLabel && (
            <Badge size="sm" colorPalette={quorum ? "green" : "orange"}>
              {quorum ? "Hay quórum" : `Falta quórum (${item.votes}/${minVotes})`}
            </Badge>
          )}
          {item.estimate && (
            <Badge size="sm" colorPalette="blue">
              {item.estimate}
            </Badge>
          )}
          {(item.state === "hit" || item.state === "miss") && (
            <Badge size="sm" colorPalette={item.state === "hit" ? "green" : "red"}>
              {item.state === "hit" ? "Cumplida" : "Fallida"}
            </Badge>
          )}
        </Flex>
      </Flex>
      <Flex wrap="wrap" align="center" gap="2">
        {item.state === "draft" && (
          <Form action={openRatingAction}>
            <Hidden id={item.id} />
            <Button type="submit" id={`admin-item-${item.id}-open-rating`} size="sm" colorPalette="blue">
              Abrir votación
            </Button>
          </Form>
        )}
        {item.state === "rating" && item.close && (
          <CloseVoteDialog
            predictionId={item.id}
            text={item.text}
            summary={item.close}
            action={closeRatingAction}
          />
        )}
        {item.state === "rated" && (
          <>
            <Form action={validateAction}>
              <Flex gap="2">
                <Hidden id={item.id} />
                <Button
                  type="submit"
                  id={`admin-item-${item.id}-validate-hit`}
                  name="result"
                  value="hit"
                  size="sm"
                  colorPalette="green"
                >
                  Marcar cumplida
                </Button>
                <Button
                  type="submit"
                  id={`admin-item-${item.id}-validate-miss`}
                  name="result"
                  value="miss"
                  size="sm"
                  colorPalette="red"
                >
                  Marcar fallida
                </Button>
              </Flex>
            </Form>
            <Form action={openValidationAction}>
              <Hidden id={item.id} />
              <Button type="submit" id={`admin-item-${item.id}-open-validation`} size="sm" variant="outline">
                Abrir validación pública
              </Button>
            </Form>
            <Form action={openRatingAction}>
              <Hidden id={item.id} />
              <Button type="submit" id={`admin-item-${item.id}-reopen-rating`} size="sm" variant="ghost">
                Reabrir votación
              </Button>
            </Form>
          </>
        )}
        {item.state === "validating" && item.close && (
          <CloseVoteDialog
            predictionId={item.id}
            text={item.text}
            summary={item.close}
            action={closeValidationAction}
          />
        )}
        {(item.state === "hit" || item.state === "miss") && (
          <Form action={revertValidationAction}>
            <Hidden id={item.id} />
            <Button type="submit" id={`admin-item-${item.id}-revert`} size="sm" variant="outline">
              Revertir validación
            </Button>
          </Form>
        )}
        {item.state !== "hit" && item.state !== "miss" && (
          <Form action={deletePredictionAction}>
            <Hidden id={item.id} />
            <Button
              type="submit"
              id={`admin-item-${item.id}-delete`}
              size="sm"
              variant="ghost"
              colorPalette="red"
              aria-label="Eliminar predicción"
              title="Eliminar"
            >
              Eliminar
            </Button>
          </Form>
        )}
      </Flex>
    </List.Item>
  );
}

const ROUND_STATE: Record<string, { label: string; palette: string }> = {
  collecting: { label: "Carga abierta", palette: "green" },
  in_play: { label: "En juego", palette: "orange" },
  closed: { label: "Cerrada", palette: "gray" },
};

function Rounds({ data }: { data: AdminPage }) {
  const hasCollecting = data.rounds.some((r) => r.state === "collecting");
  return (
    <>
      <Heading as="h1" size="3xl" fontWeight="extrabold">
        Rondas
      </Heading>
      {!hasCollecting && (
        <Form id="open-round-form" action={openRoundAction}>
          <Flex wrap="wrap" align="flex-end" gap="2" p="4" {...PANEL}>
            <Field.Root w="auto" required>
              <Field.Label>Nombre de la nueva ronda</Field.Label>
              <Input id="open-round-name" name="name" placeholder={`Ronda ${data.rounds.length + 1}`} />
            </Field.Root>
            <Button type="submit" id="open-round-submit" colorPalette="blue">
              Abrir ronda
            </Button>
          </Flex>
        </Form>
      )}
      <List.Root variant="plain" gap="3">
        {data.rounds.map((r) => (
          <List.Item
            key={r.id}
            id={`round-${r.id}`}
            display="flex"
            flexWrap="wrap"
            alignItems="center"
            justifyContent="space-between"
            gap="3"
            p="4"
            {...PANEL}
          >
            <Stack gap="1">
              <Flex as="span" align="center" gap="2" fontWeight="bold">
                {r.name}
                <Badge size="sm" colorPalette={ROUND_STATE[r.state].palette}>
                  {ROUND_STATE[r.state].label}
                </Badge>
              </Flex>
              <Text as="span" textStyle="sm" color="fg.muted">
                {r.total} {r.total === 1 ? "predicción" : "predicciones"} · {r.pending} sin validar
              </Text>
            </Stack>
            {r.state === "collecting" && (
              <Form action={closeCollectingAction}>
                <Input type="hidden" name="roundId" value={r.id} />
                <Button type="submit" id={`round-${r.id}-close-collecting`} size="sm" variant="outline">
                  Cerrar carga
                </Button>
              </Form>
            )}
            {r.state === "in_play" && (
              <Form action={closeRoundAction}>
                <Input type="hidden" name="roundId" value={r.id} />
                <Tooltip.Root disabled={r.pending === 0}>
                  {/* El botón deshabilitado no recibe el mouse: el tooltip va en un span que lo envuelve. */}
                  <Tooltip.Trigger asChild>
                    <Span>
                      <Button
                        type="submit"
                        id={`round-${r.id}-close`}
                        size="sm"
                        variant="outline"
                        disabled={r.pending > 0}
                      >
                        Cerrar ronda
                      </Button>
                    </Span>
                  </Tooltip.Trigger>
                  <Portal>
                    <Tooltip.Positioner>
                      <Tooltip.Content>
                        Falta validar {r.pending} {r.pending === 1 ? "predicción" : "predicciones"}
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Portal>
                </Tooltip.Root>
              </Form>
            )}
          </List.Item>
        ))}
      </List.Root>
    </>
  );
}

function Players({ data }: { data: AdminPage }) {
  return (
    <>
      <Heading as="h1" size="3xl" fontWeight="extrabold">
        Jugadores
      </Heading>
      <Table.ScrollArea {...PANEL}>
        <Table.Root id="players-table">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Alias</Table.ColumnHeader>
              <Table.ColumnHeader>Email</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center">Creador</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center">Jurado</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.users.map((u) => (
              <Table.Row key={u.id} id={`player-${u.id}`}>
                <Table.Cell fontWeight="semibold">
                  {u.alias ?? "Usuario eliminado"}{" "}
                  {u.role === "admin" && (
                    <Badge size="sm" variant="solid">
                      Admin
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell color="fg.muted">{u.email}</Table.Cell>
                {(["canCreate", "isJury"] as const).map((permission) => (
                  <Table.Cell key={permission} textAlign="center">
                    <PermissionSwitch
                      id={`player-${u.id}-${permission === "canCreate" ? "creator" : "jury"}`}
                      userId={u.id}
                      permission={permission}
                      checked={u[permission]}
                      label={`${u[permission] ? "Quitar" : "Dar"} permiso de ${permission === "canCreate" ? "creador" : "jurado"} a ${u.alias}`}
                      action={setPermissionAction}
                    />
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      <Text textStyle="sm" color="fg.muted">
        El rol de admin solo se asigna desde la base de datos.
      </Text>
    </>
  );
}
