"use client";

import {
  Alert,
  Blockquote,
  Button,
  Dialog,
  Field,
  Flex,
  Input,
  Portal,
  Span,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useActionState, useState } from "react";
import type { ActionState } from "@/server/actions";
import { Form } from "./form";

const MAX = 280;

export function NewPredictionDialog({
  roundId,
  remainingAfter,
  disabled,
  action,
}: {
  roundId: string;
  remainingAfter: number;
  disabled: boolean;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        setOpen(false);
        setText("");
        setStep(1);
      }
      return result;
    },
    { error: null, ok: false },
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        setOpen(e.open);
        if (e.open) setStep(1);
      }}
      ids={{
        trigger: "new-prediction-button",
        content: "new-prediction-dialog",
        title: "nueva-prediccion-titulo",
      }}
    >
      <Dialog.Trigger asChild>
        <Button colorPalette="blue" disabled={disabled}>
          {disabled ? "Ya cargaste todas tus predicciones" : "Nueva predicción"}
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title textStyle="xl" fontWeight="extrabold">
                {step === 1 ? "Nueva predicción" : "Confirmá tu predicción"}
              </Dialog.Title>
            </Dialog.Header>

            {step === 1 ? (
              <>
                <Dialog.Body display="flex" flexDirection="column" gap="4">
                  <Field.Root>
                    <Field.Label>Tu predicción</Field.Label>
                    <Textarea
                      id="new-prediction-text"
                      rows={4}
                      maxLength={MAX}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Ej.: El dólar oficial cierra diciembre por encima de $1.600."
                      textStyle="md"
                    />
                    <Flex as="span" w="full" justify="space-between" textStyle="sm" color="fg.muted">
                      <Span>
                        {remainingAfter === 0
                          ? "Es tu última predicción de esta ronda"
                          : `Después de esta te ${remainingAfter === 1 ? "queda 1" : `quedan ${remainingAfter}`} en esta ronda`}
                      </Span>
                      <Span id="new-prediction-count">
                        {text.length}/{MAX}
                      </Span>
                    </Flex>
                  </Field.Root>
                  <Alert.Root id="new-prediction-warning" role="note" status="warning" textStyle="sm">
                    <Alert.Indicator />
                    <Alert.Description>
                      Una vez publicada no se puede editar. Escribila de forma que se pueda comprobar,
                      idealmente con una fecha.
                    </Alert.Description>
                  </Alert.Root>
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button id="new-prediction-cancel" variant="ghost">
                      Cancelar
                    </Button>
                  </Dialog.ActionTrigger>
                  <Button
                    id="new-prediction-continue"
                    colorPalette="blue"
                    disabled={text.trim().length === 0}
                    onClick={() => setStep(2)}
                  >
                    Continuar
                  </Button>
                </Dialog.Footer>
              </>
            ) : (
              <Form id="new-prediction-form" action={formAction}>
                <Dialog.Body display="flex" flexDirection="column" gap="4">
                  <Input type="hidden" name="roundId" value={roundId} />
                  <Input type="hidden" name="text" value={text} />
                  <Text color="fg.muted">
                    Revisá el texto antes de publicar. Después no vas a poder cambiarlo: solo un admin puede
                    eliminarla.
                  </Text>
                  <Blockquote.Root id="new-prediction-preview" bg="bg.muted" p="4" rounded="l2">
                    <Blockquote.Content textStyle="lg" fontWeight="semibold">
                      {text}
                    </Blockquote.Content>
                  </Blockquote.Root>
                  {state.error && (
                    <Alert.Root id="new-prediction-error" role="alert" status="error">
                      <Alert.Indicator />
                      <Alert.Description>{state.error}</Alert.Description>
                    </Alert.Root>
                  )}
                </Dialog.Body>
                <Dialog.Footer>
                  <Button id="new-prediction-back" variant="ghost" onClick={() => setStep(1)}>
                    Volver
                  </Button>
                  <Button
                    id="new-prediction-publish"
                    type="submit"
                    colorPalette="blue"
                    loading={pending}
                    loadingText="Publicando…"
                  >
                    Publicar
                  </Button>
                </Dialog.Footer>
              </Form>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
