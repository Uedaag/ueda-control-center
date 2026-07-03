import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/preview")({
  beforeLoad: () => {
    throw redirect({ to: "/configuracoes", replace: true });
  },
  component: () => null,
  head: () => ({ meta: [{ title: "Preview — UEDA EX 5.0" }] }),
});
