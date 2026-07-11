import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/clinical/")({
  beforeLoad: () => {
    throw redirect({ to: "/clinical/dashboard" });
  },
});
