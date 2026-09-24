import type { Metadata } from "next";
import { Suspense } from "react";
import {
	PageShell,
	PageShellActions,
	PageShellContent,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellLoading,
	PageShellTitle,
} from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { CreateFlowProjectSheet } from "./create-flow-project-sheet";
import { FlowProjects } from "./flow-projects";

export const metadata: Metadata = {
	title: "Flow",
};

export default function FlowPage() {
	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Flow</PageShellTitle>
					<PageShellDescription>
						Plan, review and present a campaign before touching the Ads Manager.
						One project per client, as many canvases as it needs.
					</PageShellDescription>
				</PageShellHeading>

				<PageShellActions>
					<CreateFlowProjectSheet />
				</PageShellActions>
			</PageShellHeader>

			<PageShellContent className="min-h-0 overflow-y-auto">
				<Suspense fallback={<PageShellLoading />}>
					<Projects />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

async function Projects() {
	await requireSession();

	const trpc = getServerTrpc();
	const queryClient = getServerQueryClient();

	await queryClient.prefetchQuery(trpc.flow.listProjects.queryOptions());

	return (
		<HydrateClient>
			<FlowProjects />
		</HydrateClient>
	);
}
