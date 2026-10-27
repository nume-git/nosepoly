"use client";

import { Badge, Flex, Link as ChakraLink } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export interface NavTab {
  /** Id de la pestaña de la pantalla principal (`?tab=`), o null para otras páginas. */
  tab: string | null;
  href: string;
  label: string;
  count?: string;
}

export function NavTabs({ tabs }: { tabs: NavTab[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("tab");
  // Al cambiar de pestaña se conserva si el usuario pidió ver las rondas anteriores.
  const pastSuffix = params.get("anteriores") === "1" ? "&anteriores=1" : "";
  const roundTabs = tabs.filter((t) => t.tab !== null);
  const activeRoundTab =
    pathname === "/" ? (roundTabs.find((t) => t.tab === current) ?? roundTabs[0])?.tab : null;

  return (
    <Flex id="nav-tabs" role="tablist" flex="1" alignSelf="stretch" overflowX="auto">
      {tabs.map((t) => {
        const active = t.tab !== null ? t.tab === activeRoundTab : pathname.startsWith(t.href);
        return (
          <ChakraLink
            key={t.href}
            asChild
            h="16"
            px="3"
            gap="2"
            fontWeight="bold"
            whiteSpace="nowrap"
            borderBottomWidth="2px"
            borderColor={active ? "colorPalette.solid" : "transparent"}
            color={active ? "fg" : "fg.muted"}
            colorPalette="blue"
            textDecoration="none"
            _hover={{ color: "fg", textDecoration: "none" }}
          >
            <Link
              id={`nav-tab-${t.tab ?? t.href.slice(1)}`}
              href={t.tab !== null ? `${t.href}${pastSuffix}` : t.href}
              role="tab"
              aria-selected={active}
            >
              {t.label}
              {t.count !== undefined && (
                <Badge
                  id={`nav-tab-${t.tab ?? t.href.slice(1)}-count`}
                  size="sm"
                  colorPalette={active ? "blue" : "gray"}
                  variant={active ? "solid" : "subtle"}
                >
                  {t.count}
                </Badge>
              )}
            </Link>
          </ChakraLink>
        );
      })}
    </Flex>
  );
}
