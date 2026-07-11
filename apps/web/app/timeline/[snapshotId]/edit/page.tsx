import { notFound } from "next/navigation";
import { requireHousehold } from "@/lib/session";
import { SnapshotEditForm } from "./SnapshotEditForm";

export default async function EditSnapshotPage({
  params,
}: {
  params: Promise<{ snapshotId: string }>;
}) {
  const { snapshotId } = await params;
  const { caller, member } = await requireHousehold();

  const snap = await caller.snapshot.getById({ snapshotId }).catch(() => null);
  if (!snap) notFound();

  return <SnapshotEditForm snapshot={snap} baseCurrency={member.household.baseCurrency} />;
}
