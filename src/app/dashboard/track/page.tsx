import { prisma } from "@/lib/prisma";
import TrackClient from "./TrackClient";

export const dynamic = 'force-dynamic';

export default async function TrackPage() {
  const batches = await prisma.batch.findMany({
    orderBy: { receivedAt: 'desc' },
    include: { operator: true }
  });

  return <TrackClient initialBatches={batches} />;
}
