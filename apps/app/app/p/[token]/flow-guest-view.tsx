"use client";

import Chat from "@carbon/icons-react/es/Chat";
import Printer from "@carbon/icons-react/es/Printer";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@crm/ui/components/field";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@crm/ui/components/sheet";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import { Textarea } from "@crm/ui/components/textarea";
import { FLOW_CANVAS_LABELS } from "@crm/validation/flow-canvas";
import { useMutation } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
	type FlowBoardHandle,
	FlowCanvasBoard,
} from "@/components/flow/flow-canvas-board";
import { FlowPrint } from "@/components/flow/flow-print";
import { FlowPortal } from "@/components/flow/portal/flow-portal";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

const PRINT = { width: 1600, height: 900 } as const;

type GuestData = RouterOutputs["flow"]["guestView"];

type GuestComment = GuestData["comments"][number];

export function FlowGuestView({
	data,
	token,
}: {
	data: GuestData;
	token: string;
}) {
	const trpc = useTRPC();
	const board = useRef<FlowBoardHandle>(null);
	const nameId = useId();
	const bodyId = useId();
	const [canvasId, setCanvasId] = useState(data.canvases[0]?.id ?? "");
	const [printImage, setPrintImage] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const [authorName, setAuthorName] = useState("");
	const [body, setBody] = useState("");
	const [comments, setComments] = useState<GuestComment[]>(data.comments);
	const [cinematic, setCinematic] = useState(false);
	const [view, setView] = useState<"plan" | "portal">("plan");
	const canvas = data.canvases.find((item) => item.id === canvasId) ?? null;

	const send = useMutation(
		trpc.flow.guestComment.mutationOptions({
			onSuccess: (posted) => {
				setComments((current) => [posted, ...current]);
				setBody("");
				toast.success("Comentario enviado.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

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
				<Tabs
					value={view}
					onValueChange={(value) =>
						setView(value === "portal" ? "portal" : "plan")
					}
				>
					<TabsList>
						<TabsTrigger value="plan">Plan</TabsTrigger>
						<TabsTrigger value="portal">Portal · vista previa</TabsTrigger>
					</TabsList>
				</Tabs>
				{view === "plan" && data.canvases.length > 1 ? (
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
					<div className="ml-auto flex flex-wrap items-center gap-2">
						<Badge variant="outline">{FLOW_CANVAS_LABELS[canvas.type]}</Badge>
						<Badge
							variant={canvas.completeness === 100 ? "default" : "outline"}
						>
							{canvas.completeness}% completo
						</Badge>
						<Button
							variant={cinematic ? "default" : "outline"}
							size="sm"
							onClick={() => setCinematic((value) => !value)}
						>
							Modo cine
						</Button>
						{data.project.canComment ? (
							<Button variant="outline" size="sm" onClick={() => setOpen(true)}>
								<Icon icon={Chat} data-icon="inline-start" />
								Comentarios ({comments.length})
							</Button>
						) : null}
						<Button variant="outline" size="sm" onClick={() => void print()}>
							<Icon icon={Printer} data-icon="inline-start" />
							PDF
						</Button>
					</div>
				) : null}
			</div>

			{view === "portal" ? (
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<FlowPortal mode="client" />
				</div>
			) : canvas ? (
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
							cinematic={cinematic}
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

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right">
					<SheetHeader>
						<SheetTitle>Comentarios</SheetTitle>
						<SheetDescription>
							Dejá tu nombre y lo que quieras decirle al equipo sobre este plan.
						</SheetDescription>
					</SheetHeader>
					<div className="flex-1 space-y-4 overflow-y-auto px-4">
						<form
							className="space-y-3"
							onSubmit={(event) => {
								event.preventDefault();
								send.mutate({
									token,
									canvasId: canvas?.id ?? null,
									nodeId: null,
									authorName: authorName.trim(),
									body: body.trim(),
								});
							}}
						>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor={nameId}>Tu nombre</FieldLabel>
									<Input
										id={nameId}
										value={authorName}
										onChange={(event) => setAuthorName(event.target.value)}
										maxLength={80}
										required
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor={bodyId}>Comentario</FieldLabel>
									<Textarea
										id={bodyId}
										value={body}
										onChange={(event) => setBody(event.target.value)}
										rows={3}
										maxLength={2000}
										required
									/>
								</Field>
							</FieldGroup>
							<Button
								type="submit"
								disabled={!authorName.trim() || !body.trim() || send.isPending}
							>
								Enviar comentario
							</Button>
						</form>
						<ul className="space-y-2">
							{comments.map((entry) => (
								<li key={entry.id} className="rounded-md border p-3">
									<p className="text-xs">
										<span className="font-medium">{entry.authorName}</span>
										<span className="text-muted-foreground">
											{" "}
											· {new Date(entry.createdAt).toLocaleString("es")}
										</span>
									</p>
									<p className="whitespace-pre-wrap text-sm">{entry.body}</p>
								</li>
							))}
						</ul>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
