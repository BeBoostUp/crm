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
import {
	type FlowBoardHandle,
	FlowCanvasBoard,
} from "@/components/flow/flow-canvas-board";
import { FlowPrint } from "@/components/flow/flow-print";
import { dataUrlToFile, uploadFlowFile } from "@/components/flow/flow-upload";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

const SAVE_DELAY_MS = 700;

const THUMBNAIL_EVERY_MS = 20_000;

const THUMBNAIL = { width: 640, height: 360 } as const;

const PRINT = { width: 1600, height: 900 } as const;

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
	const cache = useCrmCache();
	const url = useWorkspaceUrl();
	const board = useRef<FlowBoardHandle>(null);
	const lastThumbnail = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [document, setDocument] = useState<FlowCanvasDocument>(canvas.document);
	const [mode, setMode] = useState<Mode>(canvas.canEdit ? "edit" : "present");
	const [cinematic, setCinematic] = useState(false);
	const [printInternal, setPrintInternal] = useState(false);
	const [printImage, setPrintImage] = useState<string | null>(null);
	const [status, setStatus] = useState<Status>("saved");

	const thumbnail = useMutation(
		trpc.flow.setCanvasThumbnail.mutationOptions({
			onSuccess: () => cache.flow(),
		}),
	);

	const refreshThumbnail = async (): Promise<void> => {
		if (Date.now() - lastThumbnail.current < THUMBNAIL_EVERY_MS) return;
		lastThumbnail.current = Date.now();
		const png = await board.current?.snapshot(
			THUMBNAIL.width,
			THUMBNAIL.height,
		);
		if (!png) return;
		const uploaded = await uploadFlowFile(
			await dataUrlToFile(png, "thumbnail.png"),
			canvas.projectId,
			"thumbnail",
		);
		thumbnail.mutate({ id: canvas.id, thumbnailUrl: uploaded.url });
	};

	const save = useMutation(
		trpc.flow.saveCanvas.mutationOptions({
			onSuccess: () => {
				setStatus("saved");
				refreshThumbnail().catch(() => undefined);
			},
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

	const print = async (internal: boolean): Promise<void> => {
		setPrintInternal(internal);
		setPrintImage(
			(await board.current?.snapshot(PRINT.width, PRINT.height)) ?? null,
		);
		setTimeout(() => window.print(), 100);
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
					{mode === "present" ? (
						<Button
							variant={cinematic ? "default" : "outline"}
							size="sm"
							onClick={() => setCinematic((value) => !value)}
						>
							Modo cine
						</Button>
					) : null}
					{canvas.canExport ? (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void print(false)}
							>
								<Icon icon={Printer} data-icon="inline-start" />
								PDF cliente
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void print(true)}
							>
								PDF interno
							</Button>
						</>
					) : null}
				</div>
			</div>

			<div className="min-h-0 flex-1 print:hidden">
				<FlowCanvasBoard
					key={mode}
					ref={board}
					document={document}
					type={canvas.type}
					canEdit={canvas.canEdit}
					presentation={mode === "present"}
					cinematic={cinematic}
					onDocumentChange={onDocumentChange}
				/>
			</div>

			<FlowPrint
				title={canvas.name}
				subtitle={`${canvas.projectName} · ${FLOW_CANVAS_LABELS[canvas.type]}`}
				document={document}
				internal={printInternal}
				image={printImage}
			/>
		</div>
	);
}
