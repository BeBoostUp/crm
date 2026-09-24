"use client";

import ArrowLeft from "@carbon/icons-react/es/ArrowLeft";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FlowPortal } from "@/components/flow/portal/flow-portal";
import {
	PageShell,
	PageShellActions,
	PageShellContent,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellTitle,
} from "@/components/page-shell";
import { useTRPC } from "@/lib/trpc/client";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

export function FlowPortalPage({ projectId }: { projectId: string }) {
	const trpc = useTRPC();
	const url = useWorkspaceUrl();
	const [mode, setMode] = useState<"team" | "client">("team");
	const { data: project } = useQuery(
		trpc.flow.getProject.queryOptions({ id: projectId }),
	);

	if (!project) return null;

	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Portal · {project.name}</PageShellTitle>
					<PageShellDescription>
						Cómo quedaría el seguimiento del proyecto: hitos, resultados,
						facturación, atribución, contenido y documentación.
					</PageShellDescription>
				</PageShellHeading>
				<PageShellActions>
					<Tabs
						value={mode}
						onValueChange={(value) =>
							setMode(value === "client" ? "client" : "team")
						}
					>
						<TabsList>
							<TabsTrigger value="team">Vista equipo</TabsTrigger>
							<TabsTrigger value="client">Vista cliente</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button asChild variant="ghost" size="sm">
						<Link href={url(`/flow/${project.id}`)}>
							<Icon icon={ArrowLeft} data-icon="inline-start" />
							Proyecto
						</Link>
					</Button>
				</PageShellActions>
			</PageShellHeader>
			<PageShellContent className="min-h-0 overflow-y-auto">
				<FlowPortal mode={mode} />
			</PageShellContent>
		</PageShell>
	);
}
