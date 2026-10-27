/**
 * <script> que corre solo con el HTML del servidor. En el cliente queda como
 * `text/plain` para que React no avise de un script que nunca ejecutaría.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
