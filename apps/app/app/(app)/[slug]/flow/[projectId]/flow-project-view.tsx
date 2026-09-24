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
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/flow/confirm-delete";
import { uploadFlowFile } from "@/components/flow/flow-upload";
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
import { FlowProjectChat } from "./flow-project-chat";
import { FlowProjectComments } from "./flow-project-comments";
import { FlowProjectLibrary } from "./flow-project-library";
import { FlowGuestLink, FlowProjectPeople } from "./flow-project-people";

const TEMPLATE_LABELS = {
	NONE: "Lienzo vacío",
	LEADS: "Captación de leads",
	ECOMMERCE: "E-commerce",
	WEBINAR: "Webinar / lanzamiento",
} as const;

type FlowTemplate = keyof typeof TEMPLATE_LABELS;

export function FlowProjectView({ projectId }: { projectId: string }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const url = useWorkspaceUrl();
	const router = useRouter();
	const nameId = useId();
	const typeId = useId();
	const channelId = useId();
	const templateId = useId();
	const logoInput = useRef<HTMLInputElement>(null);

	const { data: project } = useQuery(
		trpc.flow.getProject.queryOptions({ id: projectId }),
	);
	const [name, setName] = useState("");
	const [type, setType] = useState<FlowCanvasType>("JOURNEY");
	const [channel, setChannel] = useState("");
	const [template, setTemplate] = useState<FlowTemplate>("NONE");

	const createCanvas = useMutation(
		trpc.flow.createCanvas.mutationOptions({
			onSuccess: async (canvas) => {
				await cache.flow();
				setName("");
				setChannel("");
				toast.success(`Lienzo «${canvas.name}» creado.`);
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

	const updateProject = useMutation(
		trpc.flow.updateProject.mutationOptions({
			onSuccess: () => cache.flow(),
			onError: (error) => toast.error(error.message),
		}),
	);
	const uploadLogo = async (file: File): Promise<void> => {
		try {
			const uploaded = await uploadFlowFile(file, projectId, "logo");
			updateProject.mutate({ id: projectId, logoUrl: uploaded.url });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "No se pudo subir el logo.",
			);
		}
	};
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
					<PageShellTitle>
						<span className="flex items-center gap-3">
							{project.logoUrl ? (
								<img
									src={project.logoUrl}
									alt=""
									className="size-10 rounded-md object-cover"
								/>
							) : null}
							{project.name}
						</span>
					</PageShellTitle>
					<PageShellDescription>
						{[
							project.company?.name ?? "Sin empresa cliente",
							project.description,
						]
							.filter(Boolean)
							.join(" · ")}
					</PageShellDescription>
				</PageShellHeading>

				<PageShellActions>
					<Button asChild variant="ghost" size="sm">
						<Link href={url("/flow")}>
							<Icon icon={ArrowLeft} data-icon="inline-start" />
							Todos los proyectos
						</Link>
					</Button>
					<FlowGuestLink project={project} />
					{project.role === "ADMIN" ? (
						<>
							<input
								type="color"
								value={project.color ?? "#d4ff00"}
								aria-label="Color del proyecto"
								className="size-8 cursor-pointer rounded-md border bg-transparent"
								onChange={(event) =>
									updateProject.mutate({
										id: project.id,
										color: event.target.value,
									})
								}
							/>
							<input
								ref={logoInput}
								type="file"
								accept="image/png,image/jpeg,image/webp"
								className="hidden"
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) void uploadLogo(file);
									event.target.value = "";
								}}
							/>
							<Button
								variant="outline"
								size="sm"
								onClick={() => logoInput.current?.click()}
							>
								{project.logoUrl ? "Cambiar logo" : "Logo"}
							</Button>
						</>
					) : null}
					{project.role === "ADMIN" ? (
						<ConfirmDelete
							label="Eliminar proyecto"
							description={`Se borra «${project.name}» con sus lienzos, referencias y checklists.`}
							onConfirm={() => removeProject.mutate({ id: project.id })}
						/>
					) : null}
				</PageShellActions>
			</PageShellHeader>

			<PageShellContent className="min-h-0 overflow-y-auto">
				<div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
					<section className="space-y-3">
						<h2 className="font-medium text-sm">Lienzos</h2>
						{project.canvases.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								Todavía no hay lienzos. Empezá por un customer journey.
							</p>
						) : (
							<ul className="grid gap-3 sm:grid-cols-2">
								{project.canvases.map((canvas) => (
									<li
										key={canvas.id}
										className="flex items-start gap-2 rounded-md border border-l-4 bg-card p-3"
										style={{ borderLeftColor: project.color ?? undefined }}
									>
										{canvas.thumbnailUrl ? (
											<img
												src={canvas.thumbnailUrl}
												alt=""
												className="h-14 w-24 shrink-0 rounded-sm border object-cover"
											/>
										) : null}
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
												{canvas.nodeCount} nodos
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
												label="Eliminar lienzo"
												description={`Se borra «${canvas.name}» con todos sus nodos.`}
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
										template: template === "NONE" ? null : template,
									});
								}}
							>
								<Field>
									<FieldLabel htmlFor={nameId}>Nuevo lienzo</FieldLabel>
									<Input
										id={nameId}
										value={name}
										onChange={(event) => setName(event.target.value)}
										placeholder="Meta · embudo de lanzamiento"
										maxLength={120}
										className="w-56"
										required
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor={typeId}>Tipo</FieldLabel>
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
									<FieldLabel htmlFor={channelId}>Canal</FieldLabel>
									<Input
										id={channelId}
										value={channel}
										onChange={(event) => setChannel(event.target.value)}
										placeholder="Meta, Google…"
										maxLength={60}
										className="w-36"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor={templateId}>Plantilla</FieldLabel>
									<Select
										value={template}
										onValueChange={(value) =>
											setTemplate(value as FlowTemplate)
										}
									>
										<SelectTrigger id={templateId} className="w-48">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(TEMPLATE_LABELS).map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
								<Button
									type="submit"
									disabled={!name.trim() || createCanvas.isPending}
								>
									{createCanvas.isPending ? <Spinner /> : null}
									Agregar lienzo
								</Button>
							</form>
						) : null}
					</section>

					<FlowProjectPeople project={project} />
				</div>

				<FlowProjectLibrary project={project} />
				<FlowProjectComments project={project} />
				<FlowProjectChat project={project} />
			</PageShellContent>
		</PageShell>
	);
}
