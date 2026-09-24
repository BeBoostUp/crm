"use client";

import ChevronDown from "@carbon/icons-react/es/ChevronDown";
import { Button } from "@crm/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@crm/ui/components/dropdown-menu";
import { Icon } from "@crm/ui/components/icon";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useTRPC } from "@/lib/trpc/client";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import { currentFlowProjectId, isFlowSection } from "./flow-sections";

export function ProjectSwitcher({ fallback }: { fallback: string }) {
	const trpc = useTRPC();
	const router = useRouter();
	const pathname = usePathname();
	const url = useWorkspaceUrl();
	const { data: projects = [] } = useQuery(
		trpc.flow.listProjects.queryOptions(),
	);
	const currentId = currentFlowProjectId(pathname);
	const current = projects.find((project) => project.id === currentId);
	const section = pathname.split("/portal/")[1]?.split("/")[0] ?? "";

	const go = (projectId: string): void => {
		router.push(
			url(
				isFlowSection(section)
					? `/flow/${projectId}/portal/${section}`
					: `/flow/${projectId}`,
			),
		);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="min-w-0 font-medium">
					<span className="truncate">{current?.name ?? "Elegir cliente"}</span>
					<Icon icon={ChevronDown} data-icon="inline-end" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-72">
				<DropdownMenuLabel>{fallback} · clientes</DropdownMenuLabel>
				{projects.map((project) => (
					<DropdownMenuItem key={project.id} onSelect={() => go(project.id)}>
						{project.logoUrl ? (
							<img
								src={project.logoUrl}
								alt=""
								className="size-5 rounded-sm object-cover"
							/>
						) : (
							<span
								className="size-2 rounded-full bg-primary"
								style={{ backgroundColor: project.color ?? undefined }}
							/>
						)}
						<span className="truncate">{project.name}</span>
						<span className="ml-auto text-muted-foreground text-xs">
							{project.completeness}%
						</span>
					</DropdownMenuItem>
				))}
				{projects.length === 0 ? (
					<DropdownMenuItem disabled>Todavía no hay clientes</DropdownMenuItem>
				) : null}
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => router.push(url("/flow"))}>
					Todos los proyectos
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
