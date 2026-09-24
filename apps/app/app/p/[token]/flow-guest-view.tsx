"use client";

import Printer from "@carbon/icons-react/es/Printer";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import { FLOW_CANVAS_LABELS } from "@crm/validation/flow-canvas";
import { useRef, useState } from "react";
import {
	type FlowBoardHandle,
	FlowCanvasBoard,
} from "@/components/flow/flow-canvas-board";
import { FlowPrint } from "@/components/flow/flow-print";
import type { RouterOutputs } from "@/lib/trpc/types";

const PRINT = { width: 1600, height: 900 } as const;

type GuestData = RouterOutputs["flow"]["guestView"];

export function FlowGuestView({ data }: { data: GuestData }) {
	const board = useRef<FlowBoardHandle>(null);
	const [canvasId, setCanvasId] = useState(data.canvases[0]?.id ?? "");
	const [printImage, setPrintImage] = useState<string | null>(null);
	const canvas = data.canvases.find((item) => item.id === canvasId) ?? null;

	const print = async (): Promise<void> => {
		setPrintImage(
			(await board.current?.snapshot(PRINT.width, PRINT.height)) ?? null,
		);
		setTimeout(() => window.print(), 100);
	};

	return (
		<div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
			<div
				className="flex flex-wrap items-center gap-3 border-b px-4 py-2"
				style={{ borderBottomColor: data.project.color ?? undefined }}
			>
				{data.project.logoUrl ? (
					<img
						src={data.project.logoUrl}
						alt=""
						className="size-9 rounded-md object-cover"
					/>
				) : null}
				<div className="min-w-0">
					<h1 className="truncate font-medium text-sm">{data.project.name}</h1>
					<p className="truncate text-muted-foreground text-xs">
						{[data.project.companyName, data.project.description]
							.filter(Boolean)
							.join(" · ") || "Plan de campaña"}
					</p>
				</div>
				{data.canvases.length > 1 ? (
					<Tabs value={canvasId} onValueChange={setCanvasId}>
						<TabsList>
							{data.canvases.map((item) => (
								<TabsTrigger key={item.id} value={item.id}>
									{item.name}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				) : null}
				{canvas ? (
					<div className="ml-auto flex items-center gap-2">
						<Badge variant="outline">{FLOW_CANVAS_LABELS[canvas.type]}</Badge>
						<Badge
							variant={canvas.completeness === 100 ? "default" : "outline"}
						>
							{canvas.completeness}% completo
						</Badge>
						<Button variant="outline" size="sm" onClick={() => void print()}>
							<Icon icon={Printer} data-icon="inline-start" />
							PDF
						</Button>
					</div>
				) : null}
			</div>

			{canvas ? (
				<>
					<div className="min-h-0 flex-1 print:hidden">
						<FlowCanvasBoard
							key={canvas.id}
							ref={board}
							document={canvas.document}
							type={canvas.type}
							canEdit={false}
							presentation
							hideInternal
						/>
					</div>
					<FlowPrint
						title={canvas.name}
						subtitle={`${data.project.name} · ${FLOW_CANVAS_LABELS[canvas.type]}`}
						document={canvas.document}
						internal={false}
						image={printImage}
					/>
				</>
			) : (
				<p className="p-6 text-muted-foreground text-sm">
					Este plan todavía no tiene lienzos.
				</p>
			)}
		</div>
	);
}
