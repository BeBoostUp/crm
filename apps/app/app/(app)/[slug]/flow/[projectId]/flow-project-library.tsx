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
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/flow/confirm-delete";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type FlowProject = RouterOutputs["flow"]["getProject"];

type AssetKind = FlowProject["assets"][number]["kind"];

const ASSET_KINDS = {
	AD: "Ad",
	LANDING: "Landing",
	EMAIL: "Email",
	RESOURCE: "Resource",
} as const satisfies Record<AssetKind, string>;

export function FlowProjectLibrary({ project }: { project: FlowProject }) {
	return (
		<div className="mt-8 grid gap-8 lg:grid-cols-2">
			<FlowAssets project={project} />
			<FlowChecklists project={project} />
		</div>
	);
}

function FlowAssets({ project }: { project: FlowProject }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const [kind, setKind] = useState<AssetKind>("AD");
	const [title, setTitle] = useState("");
	const [url, setUrl] = useState("");
	const [notes, setNotes] = useState("");
	const [tags, setTags] = useState("");
	const canEdit = project.role !== "VIEWER";

	const create = useMutation(
		trpc.flow.createAsset.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setTitle("");
				setUrl("");
				setNotes("");
				setTags("");
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

	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">Ad library</h2>
			{project.assets.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Save competitor ads, landing pages and references here.
				</p>
			) : (
				<ul className="space-y-2">
					{project.assets.map((asset) => (
						<li
							key={asset.id}
							className="flex items-start gap-2 rounded-md border bg-card p-3"
						>
							<div className="min-w-0 flex-1 space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="outline">{ASSET_KINDS[asset.kind]}</Badge>
									<p className="truncate font-medium text-sm">{asset.title}</p>
								</div>
								{asset.url ? (
									<a
										href={asset.url}
										target="_blank"
										rel="noreferrer"
										className="block truncate text-primary text-xs underline-offset-4 hover:underline"
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
									label="Delete reference"
									description={`"${asset.title}" will be removed from the library.`}
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
						});
					}}
				>
					<Select
						value={kind}
						onValueChange={(value) => setKind(value as AssetKind)}
					>
						<SelectTrigger aria-label="Kind">
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
						placeholder="Title"
						aria-label="Title"
						maxLength={120}
						required
					/>
					<Input
						value={url}
						onChange={(event) => setUrl(event.target.value)}
						placeholder="https://…"
						aria-label="Link"
						className="sm:col-span-2"
					/>
					<Input
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
						placeholder="Notes"
						aria-label="Notes"
					/>
					<Input
						value={tags}
						onChange={(event) => setTags(event.target.value)}
						placeholder="Tags, comma separated"
						aria-label="Tags"
					/>
					<Button
						type="submit"
						className="sm:col-span-2"
						disabled={!title.trim() || create.isPending}
					>
						Save reference
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
					Pre-campaign, creatives, launch, post-campaign: keep the routine here.
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
						placeholder="New checklist, e.g. Pre-launch"
						aria-label="New checklist"
						maxLength={120}
						required
					/>
					<Button type="submit" disabled={!title.trim() || create.isPending}>
						Add
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

	const addItem = useMutation(
		trpc.flow.addChecklistItem.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setText("");
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

	const done = checklist.items.filter((item) => item.done).length;

	return (
		<div className="space-y-2 rounded-md border bg-card p-3">
			<div className="flex items-center gap-2">
				<p className="flex-1 font-medium text-sm">{checklist.title}</p>
				<span className="text-muted-foreground text-xs">
					{done}/{checklist.items.length}
				</span>
				{canEdit ? (
					<ConfirmDelete
						label="Delete checklist"
						description={`"${checklist.title}" and its items will be gone.`}
						onConfirm={() => removeChecklist.mutate({ id: checklist.id })}
					/>
				) : null}
			</div>
			<ul className="space-y-1">
				{checklist.items.map((item) => (
					<li key={item.id} className="flex items-center gap-2">
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
						{canEdit ? (
							<Button
								variant="ghost"
								size="icon"
								aria-label={`Remove ${item.text}`}
								onClick={() => removeItem.mutate({ id: item.id })}
							>
								<Icon icon={Close} />
							</Button>
						) : null}
					</li>
				))}
			</ul>
			{canEdit ? (
				<form
					className="flex gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						addItem.mutate({ checklistId: checklist.id, text: text.trim() });
					}}
				>
					<Input
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder="Add a task"
						aria-label="Add a task"
						maxLength={500}
						required
					/>
					<Button
						type="submit"
						variant="outline"
						disabled={!text.trim() || addItem.isPending}
					>
						Add
					</Button>
				</form>
			) : null}
		</div>
	);
}
