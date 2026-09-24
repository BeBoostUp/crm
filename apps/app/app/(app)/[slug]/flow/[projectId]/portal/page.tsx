import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShellFallback } from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { FlowPortalPage } from "./flow-portal-page";

export const metadata: Metadata = {
	title: "Portal del cliente",
};

export default function PortalPage({
	params,
}: PageProps<"/[slug]/flow/[projectId]/portal">) {
	return (
		<Suspense fallback={<PageShellFallback />}>
			<Portal params={params} />
		</Suspense>
	);
}

async function Portal({
	params,
}: Pick<PageProps<"/[slug]/flow/[projectId]/portal">, "params">) {
	const [, { projectId }] = await Promise.all([requireSession(), params]);
	const trpc = getServerTrpc();
	const queryClient = getServerQueryClient();
	await queryClient.prefetchQuery(
		trpc.flow.getProject.queryOptions({ id: projectId }),
	);

	return (
		<HydrateClient>
			<FlowPortalPage projectId={projectId} />
		</HydrateClient>
	);
}
