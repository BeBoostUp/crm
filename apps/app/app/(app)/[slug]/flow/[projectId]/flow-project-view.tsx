"use client";

import ArrowLeft from "@carbon/icons-react/es/ArrowLeft";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Field, FieldLabel } from "@crm/ui/components/field";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { Spinner } from "@crm/ui/components/spinner";
import {
	FLOW_CANVAS_LABELS,
	FLOW_CANVAS_TYPES,
	type FlowCanvasType,
} from "@crm/validation/flow-canvas";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/flow/confirm-delete";
import {
	PageShell,
	PageShellActions,
	PageShellContent,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellTitle,
} from "@/components/page-shell";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";
import { FlowProjectLibrary } from "./flow-project-library";
import { FlowGuestLink, FlowProjectPeople } from "./flow-project-people";

export function FlowProjectView({ projectId }: { projectId: string }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const url = useWorkspaceUrl();
	const router = useRouter();
	const nameId = useId();
	const typeId = useId();
	const channelId = useId();

	const { data: project } = useQuery(
		trpc.flow.getProject.queryOptions({ id: projectId }),
	);
	const [name, setName] = useState("");
	const [type, setType] = useState<FlowCanvasType>("JOURNEY");
	const [channel, setChannel] = useState("");

	const createCanvas = useMutation(
		trpc.flow.createCanvas.mutationOptions({
			onSuccess: async (canvas) => {
				await cache.flow();
				setName("");
				setChannel("");
				toast.success(`Canvas "${canvas.name}" created.`);
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const removeCanvas = useMutation(
		trpc.flow.removeCanvas.mutationOptions({
			onSuccess: () => cache.flow(),
			onError: (error) => toast.error(error.message),
		}),
	);

	const removeProject = useMutation(
		trpc.flow.removeProject.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				router.push(url("/flow"));
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (!project) return null;
	const canEdit = project.role !== "VIEWER";

	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>{project.name}</PageShellTitle>
					<PageShellDescription>
						{[project.company?.name ?? "No client company", project.description]
							.filter(Boolean)
							.join(" · ")}
					</PageShellDescription>
				</PageShellHeading>

				<PageShellActions>
					<Button asChild variant="ghost" size="sm">
						<Link href={url("/flow")}>
							<Icon icon={ArrowLeft} data-icon="inline-start" />
							All projects
						</Link>
					</Button>
					<FlowGuestLink project={project} />
					{project.role === "ADMIN" ? (
						<ConfirmDelete
							label="Delete project"
							description={`"${project.name}" with all its canvases, references and checklists will be gone.`}
							onConfirm={() => removeProject.mutate({ id: project.id })}
						/>
					) : null}
				</PageShellActions>
			</PageShellHeader>

			<PageShellContent className="min-h-0 overflow-y-auto">
				<div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
					<section className="space-y-3">
						<h2 className="font-medium text-sm">Canvases</h2>
						{project.canvases.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No canvases yet. Start with a customer journey.
							</p>
						) : (
							<ul className="grid gap-3 sm:grid-cols-2">
								{project.canvases.map((canvas) => (
									<li
										key={canvas.id}
										className="flex items-start gap-2 rounded-md border bg-card p-3"
									>
										<Link
											href={url(`/flow/${project.id}/canvas/${canvas.id}`)}
											className="min-w-0 flex-1"
										>
											<p className="truncate font-medium text-sm">
												{canvas.name}
											</p>
											<p className="text-muted-foreground text-xs">
												{FLOW_CANVAS_LABELS[canvas.type]}
												{canvas.channel ? ` · ${canvas.channel}` : ""} ·{" "}
												{canvas.nodeCount} nodes
											</p>
										</Link>
										<Badge
											variant={
												canvas.completeness === 100 ? "default" : "outline"
											}
										>
											{canvas.completeness}%
										</Badge>
										{canEdit ? (
											<ConfirmDelete
												label="Delete canvas"
												description={`"${canvas.name}" and every node in it will be gone.`}
												onConfirm={() => removeCanvas.mutate({ id: canvas.id })}
											/>
										) : null}
									</li>
								))}
							</ul>
						)}

						{canEdit ? (
							<form
								className="flex flex-wrap items-end gap-2"
								onSubmit={(event) => {
									event.preventDefault();
									createCanvas.mutate({
										projectId: project.id,
										type,
										name: name.trim(),
										channel: channel.trim(),
									});
								}}
							>
								<Field>
									<FieldLabel htmlFor={nameId}>New canvas</FieldLabel>
									<Input
										id={nameId}
										value={name}
										onChange={(event) => setName(event.target.value)}
										placeholder="Meta · launch funnel"
										maxLength={120}
										className="w-56"
										required
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor={typeId}>Type</FieldLabel>
									<Select
										value={type}
										onValueChange={(value) => setType(value as FlowCanvasType)}
									>
										<SelectTrigger id={typeId} className="w-44">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{FLOW_CANVAS_TYPES.map((option) => (
												<SelectItem key={option} value={option}>
													{FLOW_CANVAS_LABELS[option]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor={channelId}>Channel</FieldLabel>
									<Input
										id={channelId}
										value={channel}
										onChange={(event) => setChannel(event.target.value)}
										placeholder="Meta, Google…"
										maxLength={60}
										className="w-36"
									/>
								</Field>
								<Button
									type="submit"
									disabled={!name.trim() || createCanvas.isPending}
								>
									{createCanvas.isPending ? <Spinner /> : null}
									Add canvas
								</Button>
							</form>
						) : null}
					</section>

					<FlowProjectPeople project={project} />
				</div>

				<FlowProjectLibrary project={project} />
			</PageShellContent>
		</PageShell>
	);
}
