import { Box, Button, Container, Popover, Portal, Text } from "@chakra-ui/react";
import { switchDevUserAction } from "@/server/actions";
import { getRoundPage } from "@/server/queries";
import { repo, usingMockData } from "@/server/repo";
import { getViewer } from "@/server/session";
import { DevUserSwitcher } from "./dev-user-switcher";
import { LiveRefresh } from "./live-refresh";
import { NavTabs, type NavTab } from "./nav-tabs";
import { ThemeToggle } from "./theme-toggle";

function permissionsLabel(u: { role: string; canCreate: boolean; isJury: boolean }) {
  const parts = [u.canCreate && "creador", u.isJury && "jurado"].filter(Boolean);
  const perms = parts.length ? parts.join(" y ") : "sin permisos";
  return u.role === "admin" ? `admin, ${perms}` : perms;
}

function Shell({ id, children }: { id: string; children?: React.ReactNode }) {
  return (
    <Box as="header" id={id} bg="bg.panel" borderBottomWidth="1px">
      <Container
        as="nav"
        aria-label="Principal"
        maxW="6xl"
        px="4"
        minH="16"
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        columnGap="4"
        rowGap="1"
      >
        {children}
      </Container>
    </Box>
  );
}

export function NavbarSkeleton() {
  return <Shell id="navbar-skeleton" />;
}

/** Encabezado común a todas las páginas. */
export async function Navbar() {
  const viewer = await getViewer();
  const [page, users] = await Promise.all([
    getRoundPage(viewer),
    usingMockData ? repo.listUsers() : Promise.resolve([]),
  ]);
  const alias = viewer.user.alias ?? "?";

  const tabs: NavTab[] = [
    ...(page?.tabs ?? []).map((t) => ({ tab: t.id, href: `/?tab=${t.id}`, label: t.label, count: t.count })),
    { tab: null, href: "/ranking", label: "Ranking" },
    ...(viewer.actor.role === "admin" ? [{ tab: null, href: "/admin", label: "Moderar" }] : []),
  ];

  return (
    <Shell id="navbar">
      <NavTabs tabs={tabs} />
      <LiveRefresh />
      <ThemeToggle />
      <Box id="user-menu">
        <Popover.Root
          positioning={{ placement: "bottom-end" }}
          ids={{ trigger: "user-menu-button", content: "user-menu-content" }}
        >
          <Popover.Trigger asChild>
            <Button aria-label="Menú de usuario" rounded="full" w="10" px="0" textTransform="uppercase">
              {alias.slice(0, 1)}
            </Button>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content w="64">
                <Popover.Body p="4">
                  <Text id="user-menu-alias" fontWeight="bold">
                    {alias}
                  </Text>
                  <Text id="user-menu-permissions" textStyle="sm" color="fg.muted">
                    {permissionsLabel(viewer.user)}
                  </Text>
                  {usingMockData && (
                    <Box mt="3">
                      <DevUserSwitcher
                        current={viewer.user.id}
                        action={switchDevUserAction}
                        options={users.map((u) => ({
                          id: u.id,
                          label: `${u.alias} (${permissionsLabel(u)})`,
                        }))}
                      />
                    </Box>
                  )}
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
      </Box>
    </Shell>
  );
}
