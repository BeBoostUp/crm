import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShellFallback } from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { FlowProjectView } from "./flow-project-view";

export const metadata: Metadata = {
	title: "Flow project",
};

export default function FlowProjectPage({
	params,
}: PageProps<"/[slug]/flow/[projectId]">) {
	return (
		<Suspense fallback={<PageShellFallback />}>
			<Project params={params} />
		</Suspense>
	);
}

async function Project({
	params,
}: Pick<PageProps<"/[slug]/flow/[projectId]">, "params">) {
	const [, { projectId }] = await Promise.all([requireSession(), params]);

	const trpc = getServerTrpc();
	const queryClient = getServerQueryClient();

	await Promise.all([
		queryClient.prefetchQuery(
			trpc.flow.getProject.queryOptions({ id: projectId }),
		),
		queryClient.prefetchQuery(trpc.users.list.queryOptions()),
	]);

	return (
		<HydrateClient>
			<FlowProjectView projectId={projectId} />
		</HydrateClient>
	);
}
