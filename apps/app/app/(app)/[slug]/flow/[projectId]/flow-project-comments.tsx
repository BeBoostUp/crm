"use client";

import Close from "@carbon/icons-react/es/Close";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type FlowProject = RouterOutputs["flow"]["getProject"];

export function FlowProjectComments({ project }: { project: FlowProject }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const remove = useMutation(
		trpc.flow.removeGuestComment.mutationOptions({
			onSuccess: () => cache.flow(),
			onError: (error) => toast.error(error.message),
		}),
	);
	const canEdit = project.role !== "VIEWER";
	const canvasName = (id: string | null): string | null =>
		project.canvases.find((canvas) => canvas.id === id)?.name ?? null;

	if (project.comments.length === 0) return null;

	return (
		<section className="mt-8 space-y-3">
			<h2 className="font-medium text-sm">Comentarios del cliente</h2>
			<ul className="space-y-2">
				{project.comments.map((entry) => (
					<li
						key={entry.id}
						className="flex items-start gap-2 rounded-md border bg-card p-3"
					>
						<div className="min-w-0 flex-1">
							<p className="text-xs">
								<span className="font-medium">{entry.authorName}</span>
								<span className="text-muted-foreground">
									{" "}
									· {new Date(entry.createdAt).toLocaleString("es")}
									{canvasName(entry.canvasId)
										? ` · ${canvasName(entry.canvasId)}`
										: ""}
								</span>
							</p>
							<p className="whitespace-pre-wrap text-sm">{entry.body}</p>
						</div>
						{canEdit ? (
							<Button
								variant="ghost"
								size="icon"
								aria-label="Quitar comentario"
								onClick={() => remove.mutate({ id: entry.id })}
							>
								<Icon icon={Close} />
							</Button>
						) : null}
					</li>
				))}
			</ul>
		</section>
	);
}
