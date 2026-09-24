import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isFlowSection } from "@/components/flow/flow-sections";
import { PageShellFallback } from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { FlowPortalPage } from "../flow-portal-page";

export const metadata: Metadata = {
	title: "Portal del cliente",
};

export default function PortalSectionPage({
	params,
}: PageProps<"/[slug]/flow/[projectId]/portal/[section]">) {
	return (
		<Suspense fallback={<PageShellFallback />}>
			<Section params={params} />
		</Suspense>
	);
}

async function Section({
	params,
}: Pick<PageProps<"/[slug]/flow/[projectId]/portal/[section]">, "params">) {
	const [, { projectId, section }] = await Promise.all([
		requireSession(),
		params,
	]);
	if (!isFlowSection(section)) notFound();
	const trpc = getServerTrpc();
	const queryClient = getServerQueryClient();
	await queryClient.prefetchQuery(
		trpc.flow.getProject.queryOptions({ id: projectId }),
	);

	return (
		<HydrateClient>
			<FlowPortalPage projectId={projectId} section={section} />
		</HydrateClient>
	);
}
