import { Container, Skeleton, Stack } from "@chakra-ui/react";

export function PageSkeleton() {
  return (
    <Container as="main" id="page-skeleton" maxW="5xl" p="4" aria-busy="true">
      <Stack gap="3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} h="28" w="full" rounded="l3" />
        ))}
      </Stack>
    </Container>
  );
}
