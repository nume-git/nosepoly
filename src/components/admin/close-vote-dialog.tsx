"use client";

import { Alert, Button, Dialog, Input, Portal, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { CloseSummary } from "@/domain/views";
import { Form } from "../form";

export function CloseVoteDialog({
  predictionId,
  text,
  summary,
  action,
}: {
  predictionId: string;
  text: string;
  summary: CloseSummary;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const isRating = summary.kind === "rating";
  const field = isRating ? "value" : "result";
  const title = isRating ? "Cerrar votación del jurado" : "Cerrar validación pública";
  const votes = (n: number) => (n === 1 ? "1 voto" : `${n} votos`);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      ids={{ trigger: `admin-item-${predictionId}-close`, content: `close-dialog-${predictionId}` }}
    >
      <Dialog.Trigger asChild>
        <Button size="sm" variant="outline">
          {isRating ? "Cerrar votación" : "Cerrar validación"}
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title textStyle="xl" fontWeight="extrabold">
                {title}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap="4">
              <Text bg="bg.muted" p="3" rounded="l2" fontWeight="semibold">
                {text}
              </Text>
              <Alert.Root
                id={`close-dialog-${predictionId}-summary`}
                role="note"
                status={summary.suggested !== null ? "info" : "warning"}
              >
                <Alert.Indicator />
                <Alert.Description>{summary.description}</Alert.Description>
              </Alert.Root>
              <Form action={action} onSubmit={() => setOpen(false)} display="flex" gap="2">
                <Input type="hidden" name="predictionId" value={predictionId} />
                {summary.options.map((option) => {
                  const palette = !isRating
                    ? option.value === "hit"
                      ? "green"
                      : "red"
                    : summary.suggested !== null && String(summary.suggested) === option.value
                      ? "blue"
                      : null;
                  return (
                    <Button
                      key={option.value}
                      type="submit"
                      id={`close-dialog-${predictionId}-option-${option.value}`}
                      name={field}
                      value={option.value}
                      h="16"
                      flex="1"
                      flexDirection="column"
                      gap="0"
                      variant={palette ? "solid" : "outline"}
                      colorPalette={palette ?? "gray"}
                    >
                      <Text as="span" textStyle="lg" fontWeight="bold">
                        {option.label}
                      </Text>
                      <Text as="span" textStyle="xs" fontWeight="normal">
                        {votes(option.votes)}
                      </Text>
                    </Button>
                  );
                })}
              </Form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button id={`close-dialog-${predictionId}-cancel`} variant="ghost">
                  Cancelar
                </Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
