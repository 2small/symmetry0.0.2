import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const SymmetryDashboard = lazy(() => import("@/components/SymmetryDashboard"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Symmetry — Mindful Dashboard" },
      {
        name: "description",
        content:
          "Track mood, energy and sleep, reflect, and book sessions in a calm wellness dashboard — private and stored on your device.",
      },
      { property: "og:title", content: "Symmetry — Mindful Dashboard" },
      {
        property: "og:description",
        content: "A calm wellness dashboard for mood, reflection and gentle progress.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Suspense fallback={null}>
      <SymmetryDashboard />
    </Suspense>
  );
}
