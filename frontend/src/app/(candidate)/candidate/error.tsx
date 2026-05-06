"use client";

import { ErrorState } from "@/components/states/error-state";

export default function CandidateError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Candidate page failed" message={error.message} onRetry={reset} />;
}
