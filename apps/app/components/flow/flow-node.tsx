"use client";

import { Badge } from "@crm/ui/components/badge";
import { cn } from "@crm/ui/lib/utils";
import {
	FLOW_NODE_LABELS,
	type FlowNodeKind,
	flowNodeAutoTags,
	flowNodeMissing,
	flowNodeTitle,
} from "@crm/validation/flow-canvas";
import {
	Handle,
	type NodeProps,
	type NodeTypes,
	Position,
} from "@xyflow/react";
import type { FlowRfNode } from "./flow-document";

const SUBTITLE_KEY = {
	campaign: "objective",
	adset: "audience",
	adgroup: "keywords",
	ad: "copy",
	landing: "url",
	email: "copy",
	note: "",
} as const satisfies Record<FlowNodeKind, string>;

function FlowNodeCard({ id, type, data, selected }: NodeProps<FlowRfNode>) {
	const kind: FlowNodeKind = type ?? "note";
	const node = { id, type: kind, position: { x: 0, y: 0 }, data };
	const missing = flowNodeMissing(node);
	const autoTags = flowNodeAutoTags(node);
	const subtitle = data[SUBTITLE_KEY[kind]] ?? "";

	return (
		<div
			className={cn(
				"w-60 rounded-md border bg-card text-card-foreground shadow-sm",
				selected && "ring-2 ring-ring",
				missing.length > 0 ? "border-destructive/50" : "border-success/50",
			)}
		>
			<Handle type="target" position={Position.Top} />
			<div className="space-y-1 px-3 py-2">
				{kind === "note" ? (
					<p className="whitespace-pre-wrap text-sm">
						{data.label?.trim() || "Nota vacía"}
					</p>
				) : (
					<>
						<div className="flex items-center justify-between gap-2">
							<span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
								{FLOW_NODE_LABELS[kind]}
							</span>
							<span className="flex items-center gap-1">
								{autoTags.map((tag) => (
									<Badge key={tag} variant="mono">
										{tag}
									</Badge>
								))}
								<span
									className={cn(
										"size-2 rounded-full",
										missing.length > 0 ? "bg-destructive" : "bg-success",
									)}
								/>
							</span>
						</div>
						<p className="truncate font-medium text-sm">
							{flowNodeTitle(node)}
						</p>
						{subtitle ? (
							<p className="line-clamp-2 text-muted-foreground text-xs">
								{subtitle}
							</p>
						) : null}
						{missing.length > 0 ? (
							<p className="text-destructive text-xs">
								Falta: {missing.join(", ")}
							</p>
						) : null}
					</>
				)}
			</div>
			<Handle type="source" position={Position.Bottom} />
		</div>
	);
}

export const flowNodeTypes: NodeTypes = {
	campaign: FlowNodeCard,
	adset: FlowNodeCard,
	adgroup: FlowNodeCard,
	ad: FlowNodeCard,
	landing: FlowNodeCard,
	email: FlowNodeCard,
	note: FlowNodeCard,
};
