"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PipelineColumn } from "./PipelineColumn";
import { CandidateCard } from "./CandidateCard";
import { useMoveApplicationStage } from "@/lib/hooks";
import type { CandidateInPipeline, KanbanStage, CandidateListPage } from "@/types";
import { KANBAN_STAGES, KANBAN_STAGE_LABELS } from "@/types";

interface Props {
  jobId: string;
  candidates: CandidateInPipeline[];
  stageCounts: Record<KanbanStage, number>;
}

export function PipelineBoard({ jobId, candidates, stageCounts }: Props) {
  const qc = useQueryClient();
  const { mutateAsync: moveStage } = useMoveApplicationStage(jobId);
  const [activeCandidate, setActiveCandidate] = useState<CandidateInPipeline | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byStage = useCallback(
    (stage: KanbanStage) => candidates.filter((c) => c.pipelineStage === stage),
    [candidates],
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const found = candidates.find((c) => c.applicationId === active.id);
    setActiveCandidate(found ?? null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveCandidate(null);
    if (!over) return;

    const appId = active.id as string;
    const targetStage = over.id as KanbanStage;

    const cand = candidates.find((c) => c.applicationId === appId);
    if (!cand || cand.pipelineStage === targetStage) return;

    // Optimistic update: patch cache immediately
    const queryKey = ["jobCandidates", jobId, {}];
    const snapshot = qc.getQueryData<CandidateListPage>(queryKey);

    qc.setQueryData<CandidateListPage>(queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((item) =>
          item.applicationId === appId
            ? { ...item, pipelineStage: targetStage }
            : item,
        ),
      };
    });

    try {
      await moveStage({ appId, stage: targetStage });
    } catch {
      // Revert on failure
      qc.setQueryData(queryKey, snapshot);
      toast.error("Failed to move candidate. Please try again.");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
        {KANBAN_STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stageKey={stage}
            label={KANBAN_STAGE_LABELS[stage]}
            count={stageCounts[stage] ?? 0}
            candidates={byStage(stage)}
            jobId={jobId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCandidate && (
          <div className="rotate-1 opacity-90">
            <CandidateCard candidate={activeCandidate} jobId={jobId} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
