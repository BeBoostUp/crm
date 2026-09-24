import { z } from "zod";
import { parse } from "./index";

export const FLOW_CANVAS_TYPES = [
	"JOURNEY",
	"CAMPAIGN",
	"MIND",
	"EMAIL",
] as const;

export type FlowCanvasType = (typeof FLOW_CANVAS_TYPES)[number];

export const FLOW_NODE_KINDS = [
	"campaign",
	"adset",
	"adgroup",
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
	"Ventas",
	"Leads",
	"Tráfico",
	"Reconocimiento",
	"Interacción",
	"Descargas",
	"Mensajes",
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
		{
			key: "name",
			label: "Nombre de la campaña",
			kind: "text",
			required: true,
		},
		{
			key: "objective",
			label: "Objetivo",
			kind: "select",
			required: true,
			options: FLOW_CAMPAIGN_OBJECTIVES,
		},
		{
			key: "budget",
			label: "Presupuesto",
			kind: "text",
			placeholder: "CBO · 50 €/día",
		},
		{
			key: "strategy",
			label: "Nota de estrategia",
			kind: "textarea",
			internal: true,
		},
	],
	adset: [
		{ key: "name", label: "Nombre del adset", kind: "text", required: true },
		{
			key: "audience",
			label: "Audiencia / segmentación",
			kind: "textarea",
			required: true,
			placeholder: "Intereses: marketing digital, funnels",
		},
		{
			key: "optimization",
			label: "Optimización",
			kind: "text",
			placeholder: "Leads · Andrómeda",
		},
		{
			key: "budget",
			label: "Presupuesto",
			kind: "text",
			placeholder: "ABO · 10 €/día",
		},
		{ key: "budgetType", label: "Tipo (CBO / ABO)", kind: "text" },
		{ key: "notes", label: "Nota interna", kind: "textarea", internal: true },
	],
	adgroup: [
		{
			key: "name",
			label: "Nombre del grupo de anuncios",
			kind: "text",
			required: true,
		},
		{
			key: "keywords",
			label: "Palabras clave",
			kind: "textarea",
			required: true,
			placeholder: 'una por línea · [exacta] "frase" amplia',
		},
		{
			key: "matchType",
			label: "Concordancia",
			kind: "text",
			placeholder: "Exacta, frase, amplia",
		},
		{
			key: "bid",
			label: "Puja / CPA objetivo",
			kind: "text",
			placeholder: "CPA 20 €",
		},
		{ key: "negatives", label: "Negativas", kind: "textarea" },
		{ key: "notes", label: "Nota interna", kind: "textarea", internal: true },
	],
	ad: [
		{ key: "name", label: "Nombre del anuncio", kind: "text", required: true },
		{
			key: "creativeUrl",
			label: "Link del creativo",
			kind: "url",
			required: true,
			placeholder: "Drive, Loom, YouTube, Biblioteca de anuncios de Meta…",
		},
		{ key: "copy", label: "Copy principal", kind: "textarea", required: true },
		{ key: "description", label: "Descripción", kind: "textarea" },
		{ key: "cta", label: "CTA", kind: "text" },
		{
			key: "tags",
			label: "Etiquetas",
			kind: "text",
			placeholder: "#UGC #Reel #Hook3s",
		},
		{
			key: "notes",
			label: "Notas internas",
			kind: "textarea",
			internal: true,
		},
	],
	landing: [
		{ key: "name", label: "Nombre interno", kind: "text" },
		{ key: "url", label: "URL", kind: "url", required: true },
		{ key: "notes", label: "Notas", kind: "textarea", internal: true },
	],
	email: [
		{ key: "subject", label: "Asunto", kind: "text", required: true },
		{ key: "copy", label: "Copy", kind: "textarea", required: true },
		{ key: "cta", label: "CTA", kind: "text" },
		{ key: "notes", label: "Notas", kind: "textarea", internal: true },
	],
	note: [{ key: "label", label: "Nota", kind: "textarea" }],
} as const satisfies Record<FlowNodeKind, readonly FlowField[]>;

export const FLOW_NODE_LABELS = {
	campaign: "Campaña",
	adset: "Adset",
	adgroup: "Grupo de anuncios",
	ad: "Anuncio",
	landing: "Landing",
	email: "Email",
	note: "Nota",
} as const satisfies Record<FlowNodeKind, string>;

export const FLOW_CANVAS_NODE_KINDS = {
	JOURNEY: ["campaign", "adset", "adgroup", "ad", "landing", "email", "note"],
	CAMPAIGN: ["campaign", "adset", "adgroup", "note"],
	MIND: ["note"],
	EMAIL: ["email", "landing", "note"],
} as const satisfies Record<FlowCanvasType, readonly FlowNodeKind[]>;

export const FLOW_CANVAS_LABELS = {
	JOURNEY: "Customer journey",
	CAMPAIGN: "Mapa de campañas",
	MIND: "Mapa mental",
	EMAIL: "Mapa de emails",
} as const satisfies Record<FlowCanvasType, string>;

export function flowNodeFields(kind: FlowNodeKind): readonly FlowField[] {
	return FLOW_NODE_FIELDS[kind];
}

export function flowNodeTitle(node: FlowNode): string {
	const first = flowNodeFields(node.type)[0];
	const value = first ? (node.data[first.key] ?? "").trim() : "";
	return value || `${FLOW_NODE_LABELS[node.type]} sin título`;
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

const AUTO_TAG_PATTERNS = [
	{ tag: "CBO", pattern: /\bCBO\b/i },
	{ tag: "ABO", pattern: /\bABO\b/i },
] as const;

export function flowNodeAutoTags(node: FlowNode): string[] {
	const text = Object.values(node.data).join(" ");
	return AUTO_TAG_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
		({ tag }) => tag,
	);
}
