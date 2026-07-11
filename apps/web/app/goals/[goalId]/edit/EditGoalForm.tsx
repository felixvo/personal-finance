"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/react";
import { GoalForm, type GoalFormValues } from "../../GoalForm";

export function EditGoalForm({
  goalId,
  baseCurrency,
  initial,
}: {
  goalId: string;
  baseCurrency: string;
  initial: Partial<GoalFormValues>;
}) {
  const router = useRouter();
  const update = trpc.goal.update.useMutation();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(values: GoalFormValues) {
    setError(null);
    try {
      await update.mutateAsync({
        goalId,
        type: values.type,
        name: values.name,
        targetAmount: values.targetAmount,
        targetDate: values.targetDate || undefined,
        trackingMode: values.trackingMode,
        holdingIds: values.trackingMode === "HOLDING_SUBSET" ? values.holdingIds : undefined,
      });
      router.push(`/goals/${goalId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the goal.");
    }
  }

  return (
    <GoalForm
      baseCurrency={baseCurrency}
      initial={initial}
      submitLabel="Save changes"
      pendingLabel="Saving…"
      pending={update.isPending}
      error={error}
      onSubmit={onSubmit}
    />
  );
}
