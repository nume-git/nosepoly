"use client";

import { Select, createListCollection } from "@chakra-ui/react";
import { useMemo, useTransition } from "react";

interface Option {
  id: string;
  label: string;
}

export function DevUserSwitcher({
  current,
  options,
  action,
}: {
  current: string;
  options: Option[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const collection = useMemo(
    () => createListCollection({ items: options, itemToString: (o) => o.label, itemToValue: (o) => o.id }),
    [options],
  );

  const switchTo = (userId: string) => {
    const formData = new FormData();
    formData.set("userId", userId);
    startTransition(() => action(formData));
  };

  return (
    <Select.Root
      key={current}
      id="dev-user-switcher"
      collection={collection}
      defaultValue={[current]}
      size="sm"
      disabled={pending}
      positioning={{ sameWidth: true }}
      ids={{ trigger: "dev-user-select" }}
      onValueChange={(e) => e.value[0] && switchTo(e.value[0])}
    >
      <Select.Label textStyle="xs">Ver como (solo desarrollo)</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      {/* Sin Portal: la lista queda dentro del menú de usuario y elegir no lo cierra. */}
      <Select.Positioner>
        <Select.Content>
          {collection.items.map((o) => (
            <Select.Item key={o.id} item={o}>
              {o.label}
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}
