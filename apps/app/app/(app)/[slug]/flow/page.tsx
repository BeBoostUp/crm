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
import { SampleDataButton } from "./sample-data-button";

export const metadata: Metadata = {
	title: "Proyectos",
};

export default function FlowPage() {
	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>FlowAds</PageShellTitle>
					<PageShellDescription>
						Planificá, revisá y presentá la campaña antes de tocar el Ads
						Manager. Un proyecto por cliente, con los lienzos que necesite.
					</PageShellDescription>
				</PageShellHeading>

				<PageShellActions>
					<SampleDataButton />
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
