import { Flex } from "@chakra-ui/react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { InlineScript } from "@/components/inline-script";
import { Navbar, NavbarSkeleton } from "@/components/navbar";
import { Provider } from "@/components/provider";
import { themeScript } from "@/components/theme";
import { Toaster } from "@/components/toaster";
import { readFlash } from "@/server/flash";

export const metadata: Metadata = {
  title: "Predicciones",
  description:
    "Juego de predicciones: planteá las tuyas, que el jurado estime cuánto valen y sumá puntos si se cumplen.",
};

async function FlashToaster() {
  return <Toaster flash={await readFlash()} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body>
        <Provider>
          <Flex direction="column" minH="100dvh" bg="bg.subtle">
            <Suspense fallback={<NavbarSkeleton />}>
              <Navbar />
            </Suspense>
            {children}
            <Suspense>
              <FlashToaster />
            </Suspense>
          </Flex>
        </Provider>
      </body>
    </html>
  );
}
