"use client";

import { ErrorState } from "@/components/states/error-state";

export default function OrgError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Organization page failed" message={error.message} onRetry={reset} />;
}
