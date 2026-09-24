"use client";

import ArrowLeft from "@carbon/icons-react/es/ArrowLeft";
import Printer from "@carbon/icons-react/es/Printer";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import {
	FLOW_CANVAS_LABELS,
	type FlowCanvasDocument,
	flowCompleteness,
} from "@crm/validation/flow-canvas";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FlowCanvasBoard } from "@/components/flow/flow-canvas-board";
import { FlowPrint } from "@/components/flow/flow-print";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

const SAVE_DELAY_MS = 700;

const STATUS_LABEL = {
	saved: "Guardado",
	pending: "Cambios sin guardar",
	saving: "Guardando…",
	error: "No se pudo guardar",
} as const;

type Status = keyof typeof STATUS_LABEL;

type Mode = "edit" | "present";

export function FlowCanvasEditor({ canvasId }: { canvasId: string }) {
	const trpc = useTRPC();
	const { data: canvas } = useQuery(
		trpc.flow.getCanvas.queryOptions({ id: canvasId }),
	);

	if (!canvas) return null;

	return <Editor canvas={canvas} />;
}

function Editor({ canvas }: { canvas: RouterOutputs["flow"]["getCanvas"] }) {
	const trpc = useTRPC();
	const url = useWorkspaceUrl();
	const [document, setDocument] = useState<FlowCanvasDocument>(canvas.document);
	const [mode, setMode] = useState<Mode>(canvas.canEdit ? "edit" : "present");
	const [printInternal, setPrintInternal] = useState(false);
	const [status, setStatus] = useState<Status>("saved");
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const save = useMutation(
		trpc.flow.saveCanvas.mutationOptions({
			onSuccess: () => setStatus("saved"),
			onError: (error) => {
				setStatus("error");
				toast.error(error.message);
			},
		}),
	);

	const onDocumentChange = (next: FlowCanvasDocument): void => {
		setDocument(next);
		setStatus("pending");
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			setStatus("saving");
			save.mutate({ id: canvas.id, document: next });
		}, SAVE_DELAY_MS);
	};

	const print = (internal: boolean): void => {
		setPrintInternal(internal);
		setTimeout(() => window.print(), 50);
	};

	const completeness = flowCompleteness(document);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
				<Button asChild variant="ghost" size="sm">
					<Link href={url(`/flow/${canvas.projectId}`)}>
						<Icon icon={ArrowLeft} data-icon="inline-start" />
						{canvas.projectName}
					</Link>
				</Button>
				<h1 className="font-medium text-sm">{canvas.name}</h1>
				<Badge variant="outline">{FLOW_CANVAS_LABELS[canvas.type]}</Badge>
				<Badge variant={completeness === 100 ? "default" : "outline"}>
					{completeness}% completo
				</Badge>
				{canvas.canEdit ? (
					<span className="text-muted-foreground text-xs">
						{STATUS_LABEL[status]}
					</span>
				) : null}

				<div className="ml-auto flex flex-wrap items-center gap-2">
					{canvas.canEdit ? (
						<Tabs
							value={mode}
							onValueChange={(value) =>
								setMode(value === "present" ? "present" : "edit")
							}
						>
							<TabsList>
								<TabsTrigger value="edit">Editor</TabsTrigger>
								<TabsTrigger value="present">Presentación</TabsTrigger>
							</TabsList>
						</Tabs>
					) : null}
					<Button variant="outline" size="sm" onClick={() => print(false)}>
						<Icon icon={Printer} data-icon="inline-start" />
						PDF cliente
					</Button>
					<Button variant="outline" size="sm" onClick={() => print(true)}>
						PDF interno
					</Button>
				</div>
			</div>

			<div className="min-h-0 flex-1 print:hidden">
				<FlowCanvasBoard
					key={mode}
					document={document}
					type={canvas.type}
					canEdit={canvas.canEdit}
					presentation={mode === "present"}
					onDocumentChange={onDocumentChange}
				/>
			</div>

			<FlowPrint
				title={canvas.name}
				subtitle={`${canvas.projectName} · ${FLOW_CANVAS_LABELS[canvas.type]}`}
				document={document}
				internal={printInternal}
			/>
		</div>
	);
}
