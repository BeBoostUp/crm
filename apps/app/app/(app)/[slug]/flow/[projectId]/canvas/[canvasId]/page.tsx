import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShellFallback } from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { FlowCanvasEditor } from "./flow-canvas-editor";

export const metadata: Metadata = {
	title: "Lienzo",
};

export default function FlowCanvasPage({
	params,
}: PageProps<"/[slug]/flow/[projectId]/canvas/[canvasId]">) {
	return (
		<Suspense fallback={<PageShellFallback />}>
			<Canvas params={params} />
		</Suspense>
	);
}

async function Canvas({
	params,
}: Pick<PageProps<"/[slug]/flow/[projectId]/canvas/[canvasId]">, "params">) {
	const [, { canvasId }] = await Promise.all([requireSession(), params]);

	const trpc = getServerTrpc();
	const queryClient = getServerQueryClient();

	await queryClient.prefetchQuery(
		trpc.flow.getCanvas.queryOptions({ id: canvasId }),
	);

	return (
		<HydrateClient>
			<FlowCanvasEditor canvasId={canvasId} />
		</HydrateClient>
	);
}
