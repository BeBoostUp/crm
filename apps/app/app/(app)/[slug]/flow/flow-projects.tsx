"use client";

import FlowConnection from "@carbon/icons-react/es/FlowConnection";
import { Badge } from "@crm/ui/components/badge";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@crm/ui/components/empty";
import { Icon } from "@crm/ui/components/icon";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

const ROLE_LABELS = {
	ADMIN: "admin",
	EDITOR: "editor",
	VIEWER: "solo lectura",
} as const;

export function FlowProjects() {
	const trpc = useTRPC();
	const url = useWorkspaceUrl();
	const { data: projects = [] } = useQuery(
		trpc.flow.listProjects.queryOptions(),
	);

	if (projects.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Icon icon={FlowConnection} />
					</EmptyMedia>
					<EmptyTitle>Todavía no hay proyectos</EmptyTitle>
					<EmptyDescription>
						Creá un proyecto para un cliente y dibujá el embudo: campaña,
						adsets, anuncios y landings, todo en un lienzo.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{projects.map((project) => (
				<li key={project.id}>
					<Link
						href={url(`/flow/${project.id}`)}
						className="block rounded-md border bg-card p-4 transition-colors hover:bg-muted/50"
					>
						<div className="flex items-start justify-between gap-2">
							<p className="truncate font-medium">{project.name}</p>
							<Badge
								variant={project.completeness === 100 ? "default" : "outline"}
							>
								{project.completeness}%
							</Badge>
						</div>
						<p className="mt-1 text-muted-foreground text-sm">
							{project.company?.name ?? "Sin empresa cliente"}
						</p>
						<p className="mt-3 text-muted-foreground text-xs">
							{project.canvasCount}{" "}
							{project.canvasCount === 1 ? "lienzo" : "lienzos"} ·{" "}
							{ROLE_LABELS[project.role]}
						</p>
					</Link>
				</li>
			))}
		</ul>
	);
}
