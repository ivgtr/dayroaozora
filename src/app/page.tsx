import { Suspense } from "react";
import ReadingClient from "@/components/reading/ReadingClient";

export default function Home() {
  return (
    <Suspense>
      <ReadingClient />
    </Suspense>
  );
}
