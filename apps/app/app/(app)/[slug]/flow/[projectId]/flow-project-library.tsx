"use client";

import Close from "@carbon/icons-react/es/Close";
import Launch from "@carbon/icons-react/es/Launch";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Checkbox } from "@crm/ui/components/checkbox";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { SortableItem, SortableList } from "@crm/ui/components/sortable-list";
import { Spinner } from "@crm/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/flow/confirm-delete";
import {
	FLOW_UPLOAD,
	formatBytes,
	uploadFlowFile,
} from "@/components/flow/flow-upload";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type FlowProject = RouterOutputs["flow"]["getProject"];

type FlowAssetRow = FlowProject["assets"][number];

type AssetKind = FlowAssetRow["kind"];

const ASSET_KINDS = {
	AD: "Anuncio",
	LANDING: "Landing",
	EMAIL: "Email",
	RESOURCE: "Recurso",
} as const satisfies Record<AssetKind, string>;

export function FlowProjectLibrary({ project }: { project: FlowProject }) {
	return (
		<div className="mt-8 grid gap-8 lg:grid-cols-2">
			<FlowAssets project={project} />
			<FlowChecklists project={project} />
		</div>
	);
}

function AssetFile({ asset }: { asset: FlowAssetRow }) {
	if (!asset.fileUrl) return null;
	const type = asset.fileType ?? "";
	if (type.startsWith("image/")) {
		return (
			<a href={asset.fileUrl} target="_blank" rel="noreferrer">
				<img
					src={asset.fileUrl}
					alt={asset.title}
					className="max-h-48 rounded-md border"
				/>
			</a>
		);
	}
	if (type.startsWith("video/")) {
		return (
			<video
				src={asset.fileUrl}
				controls
				className="max-h-56 rounded-md border"
			>
				<track kind="captions" />
			</video>
		);
	}
	return (
		<a
			href={asset.fileUrl}
			target="_blank"
			rel="noreferrer"
			className="text-link text-xs underline-offset-4 hover:underline"
		>
			<Icon icon={Launch} data-icon="inline-start" />
			{type === "application/pdf" ? "Abrir PDF" : "Abrir archivo"}
			{asset.fileSize ? ` · ${formatBytes(asset.fileSize)}` : ""}
		</a>
	);
}

function FlowAssets({ project }: { project: FlowProject }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const fileId = useId();
	const [kind, setKind] = useState<AssetKind>("AD");
	const [title, setTitle] = useState("");
	const [url, setUrl] = useState("");
	const [notes, setNotes] = useState("");
	const [tags, setTags] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const canEdit = project.role !== "VIEWER";
	const canUpload = project.me.canUpload;

	const create = useMutation(
		trpc.flow.createAsset.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setTitle("");
				setUrl("");
				setNotes("");
				setTags("");
				setFile(null);
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const remove = useMutation(
		trpc.flow.removeAsset.mutationOptions({
			onSuccess: () => cache.flow(),
			onError: (error) => toast.error(error.message),
		}),
	);

	const submit = async (): Promise<void> => {
		let uploaded = null;
		if (file) {
			setUploading(true);
			try {
				uploaded = await uploadFlowFile(file, project.id, "asset");
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "No se pudo subir el archivo.",
				);
				setUploading(false);
				return;
			}
			setUploading(false);
		}
		create.mutate({
			projectId: project.id,
			kind,
			title: title.trim(),
			url: url.trim(),
			notes: notes.trim(),
			tags: tags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
			file: uploaded
				? { url: uploaded.url, type: uploaded.contentType, size: uploaded.size }
				: null,
		});
	};

	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">AdLibrary</h2>
			{project.assets.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Guardá acá anuncios de la competencia, landings y referencias, con
					enlace o con archivo.
				</p>
			) : (
				<ul className="space-y-2">
					{project.assets.map((asset) => (
						<li
							key={asset.id}
							className="flex items-start gap-2 rounded-md border bg-card p-3"
						>
							<div className="min-w-0 flex-1 space-y-2">
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="outline">{ASSET_KINDS[asset.kind]}</Badge>
									<p className="truncate font-medium text-sm">{asset.title}</p>
								</div>
								<AssetFile asset={asset} />
								{asset.url ? (
									<a
										href={asset.url}
										target="_blank"
										rel="noreferrer"
										className="block truncate text-link text-xs underline-offset-4 hover:underline"
									>
										<Icon icon={Launch} data-icon="inline-start" />
										{asset.url}
									</a>
								) : null}
								{asset.notes ? (
									<p className="whitespace-pre-wrap text-muted-foreground text-xs">
										{asset.notes}
									</p>
								) : null}
								{asset.tags.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										{asset.tags.map((tag) => (
											<Badge key={tag} variant="mono">
												{tag}
											</Badge>
										))}
									</div>
								) : null}
							</div>
							{canEdit ? (
								<ConfirmDelete
									label="Eliminar referencia"
									description={`Se quita «${asset.title}» de la biblioteca.`}
									onConfirm={() => remove.mutate({ id: asset.id })}
								/>
							) : null}
						</li>
					))}
				</ul>
			)}

			{canEdit ? (
				<form
					className="grid gap-2 sm:grid-cols-2"
					onSubmit={(event) => {
						event.preventDefault();
						void submit();
					}}
				>
					<Select
						value={kind}
						onValueChange={(value) => setKind(value as AssetKind)}
					>
						<SelectTrigger aria-label="Tipo">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(ASSET_KINDS).map(([value, label]) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder="Título"
						aria-label="Título"
						maxLength={120}
						required
					/>
					<Input
						value={url}
						onChange={(event) => setUrl(event.target.value)}
						placeholder="https://…"
						aria-label="Enlace"
						className="sm:col-span-2"
					/>
					{canUpload ? (
						<div className="sm:col-span-2">
							<label
								htmlFor={fileId}
								className="block text-muted-foreground text-xs"
							>
								Archivo (imagen hasta 5 MB, PDF hasta 10 MB, video hasta 30 MB;
								las imágenes se comprimen solas)
							</label>
							<Input
								id={fileId}
								type="file"
								accept={FLOW_UPLOAD.accept}
								onChange={(event) => setFile(event.target.files?.[0] ?? null)}
							/>
						</div>
					) : null}
					<Input
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
						placeholder="Notas"
						aria-label="Notas"
					/>
					<Input
						value={tags}
						onChange={(event) => setTags(event.target.value)}
						placeholder="Etiquetas, separadas por coma"
						aria-label="Etiquetas"
					/>
					<Button
						type="submit"
						className="sm:col-span-2"
						disabled={!title.trim() || create.isPending || uploading}
					>
						{uploading || create.isPending ? <Spinner /> : null}
						{uploading ? "Subiendo…" : "Guardar referencia"}
					</Button>
				</form>
			) : null}
		</section>
	);
}

function FlowChecklists({ project }: { project: FlowProject }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const [title, setTitle] = useState("");
	const canEdit = project.role !== "VIEWER";

	const create = useMutation(
		trpc.flow.createChecklist.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setTitle("");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">Checklists</h2>
			{project.checklists.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Pre-campaña, creativos, lanzamiento, post-campaña: la rutina, acá.
				</p>
			) : null}
			{project.checklists.map((checklist) => (
				<FlowChecklist
					key={checklist.id}
					checklist={checklist}
					canEdit={canEdit}
				/>
			))}

			{canEdit ? (
				<form
					className="flex gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						create.mutate({ projectId: project.id, title: title.trim() });
					}}
				>
					<Input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder="Nueva checklist, p. ej. Pre-lanzamiento"
						aria-label="Nueva checklist"
						maxLength={120}
						required
					/>
					<Button type="submit" disabled={!title.trim() || create.isPending}>
						Agregar
					</Button>
				</form>
			) : null}
		</section>
	);
}

function FlowChecklist({
	checklist,
	canEdit,
}: {
	checklist: FlowProject["checklists"][number];
	canEdit: boolean;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const [text, setText] = useState("");
	const [parentId, setParentId] = useState<string | null>(null);

	const addItem = useMutation(
		trpc.flow.addChecklistItem.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setText("");
				setParentId(null);
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const updateItem = useMutation(
		trpc.flow.updateChecklistItem.mutationOptions({
			onSuccess: () => cache.flow(),
			onError: (error) => toast.error(error.message),
		}),
	);
	const removeItem = useMutation(
		trpc.flow.removeChecklistItem.mutationOptions({
			onSuccess: () => cache.flow(),
			onError: (error) => toast.error(error.message),
		}),
	);
	const removeChecklist = useMutation(
		trpc.flow.removeChecklist.mutationOptions({
			onSuccess: () => cache.flow(),
			onError: (error) => toast.error(error.message),
		}),
	);
	const reorder = useMutation(
		trpc.flow.reorderChecklistItems.mutationOptions({
			onSuccess: () => cache.flow(),
			onError: (error) => toast.error(error.message),
		}),
	);

	const parents = checklist.items.filter((item) => item.parentId === null);
	const childrenOf = (id: string) =>
		checklist.items.filter((item) => item.parentId === id);
	const done = checklist.items.filter((item) => item.done).length;

	const row = (item: FlowProject["checklists"][number]["items"][number]) => (
		<div className="flex items-center gap-2">
			<Checkbox
				checked={item.done}
				disabled={!canEdit}
				aria-label={item.text}
				onCheckedChange={(checked) =>
					updateItem.mutate({ id: item.id, done: checked === true })
				}
			/>
			<span
				className={
					item.done
						? "flex-1 text-muted-foreground text-sm line-through"
						: "flex-1 text-sm"
				}
			>
				{item.text}
			</span>
			{canEdit && item.parentId === null ? (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setParentId(parentId === item.id ? null : item.id)}
				>
					Subtarea
				</Button>
			) : null}
			{canEdit ? (
				<Button
					variant="ghost"
					size="icon"
					aria-label={`Quitar ${item.text}`}
					onClick={() => removeItem.mutate({ id: item.id })}
				>
					<Icon icon={Close} />
				</Button>
			) : null}
		</div>
	);

	return (
		<div className="space-y-2 rounded-md border bg-card p-3">
			<div className="flex items-center gap-2">
				<p className="flex-1 font-medium text-sm">{checklist.title}</p>
				<span className="text-muted-foreground text-xs">
					{done}/{checklist.items.length}
				</span>
				{canEdit ? (
					<ConfirmDelete
						label="Eliminar checklist"
						description={`Se borra «${checklist.title}» con sus tareas.`}
						onConfirm={() => removeChecklist.mutate({ id: checklist.id })}
					/>
				) : null}
			</div>
			{canEdit ? (
				<SortableList
					ids={parents.map((item) => item.id)}
					onReorder={(ids) =>
						reorder.mutate({ checklistId: checklist.id, ids })
					}
				>
					{parents.map((item) => (
						<SortableItem key={item.id} id={item.id} label={item.text}>
							<div className="flex-1">
								{row(item)}
								{childrenOf(item.id).length > 0 ? (
									<ul className="ml-6 space-y-1">
										{childrenOf(item.id).map((child) => (
											<li key={child.id}>{row(child)}</li>
										))}
									</ul>
								) : null}
							</div>
						</SortableItem>
					))}
				</SortableList>
			) : (
				<ul className="space-y-1">
					{parents.map((item) => (
						<li key={item.id}>
							{row(item)}
							{childrenOf(item.id).length > 0 ? (
								<ul className="ml-6 space-y-1">
									{childrenOf(item.id).map((child) => (
										<li key={child.id}>{row(child)}</li>
									))}
								</ul>
							) : null}
						</li>
					))}
				</ul>
			)}
			{canEdit ? (
				<form
					className="flex gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						addItem.mutate({
							checklistId: checklist.id,
							text: text.trim(),
							parentId,
						});
					}}
				>
					<Input
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder={
							parentId
								? `Subtarea de «${checklist.items.find((item) => item.id === parentId)?.text ?? ""}»`
								: "Agregar una tarea"
						}
						aria-label="Agregar una tarea"
						maxLength={500}
						required
					/>
					<Button
						type="submit"
						variant="outline"
						disabled={!text.trim() || addItem.isPending}
					>
						Agregar
					</Button>
				</form>
			) : null}
		</div>
	);
}
