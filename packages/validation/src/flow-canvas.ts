import { z } from "zod";
import { parse } from "./index";

export const FLOW_CANVAS_TYPES = ["JOURNEY", "CAMPAIGN", "MIND"] as const;

export type FlowCanvasType = (typeof FLOW_CANVAS_TYPES)[number];

export const FLOW_NODE_KINDS = [
	"campaign",
	"adset",
	"ad",
	"landing",
	"email",
	"note",
] as const;

export const flowNodeKind = z.enum(FLOW_NODE_KINDS);

export type FlowNodeKind = z.infer<typeof flowNodeKind>;

export const flowNode = z.object({
	id: z.string().min(1),
	type: flowNodeKind,
	position: z.object({ x: z.number(), y: z.number() }),
	data: z.record(z.string(), z.string()).default({}),
});

export type FlowNode = z.infer<typeof flowNode>;

export const flowEdge = z.object({
	id: z.string().min(1),
	source: z.string().min(1),
	target: z.string().min(1),
});

export type FlowEdge = z.infer<typeof flowEdge>;

export const flowCanvasDocument = z.object({
	nodes: z.array(flowNode).default([]),
	edges: z.array(flowEdge).default([]),
	viewport: z
		.object({ x: z.number(), y: z.number(), zoom: z.number() })
		.optional(),
});

export type FlowCanvasDocument = z.infer<typeof flowCanvasDocument>;

export function parseFlowCanvasDocument(value: unknown): FlowCanvasDocument {
	return parse(flowCanvasDocument, value, "flow canvas document");
}

export const EMPTY_FLOW_DOCUMENT: FlowCanvasDocument = { nodes: [], edges: [] };

export const FLOW_CAMPAIGN_OBJECTIVES = [
	"Sales",
	"Leads",
	"Traffic",
	"Awareness",
	"Engagement",
	"App installs",
	"Messages",
] as const;

export type FlowField = {
	key: string;
	label: string;
	kind: "text" | "textarea" | "url" | "select";
	required?: boolean;
	internal?: boolean;
	options?: readonly string[];
	placeholder?: string;
};

export const FLOW_NODE_FIELDS = {
	campaign: [
		{ key: "name", label: "Campaign name", kind: "text", required: true },
		{
			key: "objective",
			label: "Objective",
			kind: "select",
			required: true,
			options: FLOW_CAMPAIGN_OBJECTIVES,
		},
		{
			key: "budget",
			label: "Budget",
			kind: "text",
			placeholder: "CBO · 50 €/day",
		},
		{
			key: "strategy",
			label: "Strategy note",
			kind: "textarea",
			internal: true,
		},
	],
	adset: [
		{ key: "name", label: "Ad set name", kind: "text", required: true },
		{
			key: "audience",
			label: "Audience",
			kind: "textarea",
			required: true,
			placeholder: "Interests: digital marketing, funnels",
		},
		{
			key: "optimization",
			label: "Optimization",
			kind: "text",
			placeholder: "Leads · Andromeda",
		},
		{
			key: "budget",
			label: "Budget",
			kind: "text",
			placeholder: "ABO · 10 €/day",
		},
		{ key: "budgetType", label: "CBO / ABO", kind: "text" },
		{ key: "notes", label: "Internal note", kind: "textarea", internal: true },
	],
	ad: [
		{ key: "name", label: "Ad name", kind: "text", required: true },
		{
			key: "creativeUrl",
			label: "Creative link",
			kind: "url",
			required: true,
			placeholder: "Drive, Loom, YouTube, Meta Ads Library…",
		},
		{ key: "copy", label: "Primary copy", kind: "textarea", required: true },
		{ key: "description", label: "Description", kind: "textarea" },
		{ key: "cta", label: "Call to action", kind: "text" },
		{
			key: "tags",
			label: "Tags",
			kind: "text",
			placeholder: "#UGC #Reel #Hook3s",
		},
		{
			key: "notes",
			label: "Internal notes",
			kind: "textarea",
			internal: true,
		},
	],
	landing: [
		{ key: "name", label: "Internal name", kind: "text" },
		{ key: "url", label: "URL", kind: "url", required: true },
		{ key: "notes", label: "Notes", kind: "textarea", internal: true },
	],
	email: [
		{ key: "subject", label: "Subject", kind: "text", required: true },
		{ key: "copy", label: "Copy", kind: "textarea", required: true },
		{ key: "cta", label: "Call to action", kind: "text" },
		{ key: "notes", label: "Notes", kind: "textarea", internal: true },
	],
	note: [{ key: "label", label: "Note", kind: "textarea" }],
} as const satisfies Record<FlowNodeKind, readonly FlowField[]>;

export const FLOW_NODE_LABELS = {
	campaign: "Campaign",
	adset: "Ad set",
	ad: "Ad",
	landing: "Landing page",
	email: "Email",
	note: "Note",
} as const satisfies Record<FlowNodeKind, string>;

export const FLOW_CANVAS_NODE_KINDS = {
	JOURNEY: ["campaign", "adset", "ad", "landing", "email"],
	CAMPAIGN: ["campaign", "adset"],
	MIND: ["note"],
} as const satisfies Record<FlowCanvasType, readonly FlowNodeKind[]>;

export const FLOW_CANVAS_LABELS = {
	JOURNEY: "Customer journey",
	CAMPAIGN: "Campaign map",
	MIND: "Mind map",
} as const satisfies Record<FlowCanvasType, string>;

export function flowNodeFields(kind: FlowNodeKind): readonly FlowField[] {
	return FLOW_NODE_FIELDS[kind];
}

export function flowNodeTitle(node: FlowNode): string {
	const first = flowNodeFields(node.type)[0];
	const value = first ? (node.data[first.key] ?? "").trim() : "";
	return value || `Untitled ${FLOW_NODE_LABELS[node.type].toLowerCase()}`;
}

export function flowNodeMissing(node: FlowNode): string[] {
	return flowNodeFields(node.type)
		.filter((field) => field.required && !(node.data[field.key] ?? "").trim())
		.map((field) => field.label);
}

export function flowCompleteness(document: FlowCanvasDocument): number {
	if (document.nodes.length === 0) return 0;
	const complete = document.nodes.filter(
		(node) => flowNodeMissing(node).length === 0,
	).length;
	return Math.round((complete / document.nodes.length) * 100);
}

export function stripFlowInternalFields(
	document: FlowCanvasDocument,
): FlowCanvasDocument {
	return {
		...document,
		nodes: document.nodes.map((node) => {
			const internal = new Set(
				flowNodeFields(node.type)
					.filter((field) => field.internal)
					.map((field) => field.key),
			);
			return {
				...node,
				data: Object.fromEntries(
					Object.entries(node.data).filter(([key]) => !internal.has(key)),
				),
			};
		}),
	};
}
