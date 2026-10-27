"use client";

import { Input, Switch } from "@chakra-ui/react";
import { useRef } from "react";
import { Form } from "../form";

/** Interruptor de permiso que envía el formulario al cambiar. */
export function PermissionSwitch({
  id,
  userId,
  permission,
  checked,
  label,
  action,
}: {
  id: string;
  userId: string;
  permission: "canCreate" | "isJury";
  checked: boolean;
  label: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <Form ref={formRef} action={action}>
      <Input type="hidden" name="userId" value={userId} />
      <Input type="hidden" name="permission" value={permission} />
      {/* `key` remonta el switch cuando llega el valor nuevo del servidor; mientras, se ve el cambio al instante. */}
      <Switch.Root
        key={String(checked)}
        defaultChecked={checked}
        colorPalette="blue"
        ids={{ hiddenInput: id }}
        onCheckedChange={() => formRef.current?.requestSubmit()}
      >
        <Switch.HiddenInput aria-label={label} />
        <Switch.Control />
      </Switch.Root>
    </Form>
  );
}
