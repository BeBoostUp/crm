import type {
	FlowCanvasDocument,
	FlowNodeKind,
} from "@crm/validation/flow-canvas";
import type { Edge, Node } from "@xyflow/react";

export type FlowNodeData = Record<string, string>;

export type FlowRfNode = Node<FlowNodeData, FlowNodeKind>;

export function toRfNodes(document: FlowCanvasDocument): FlowRfNode[] {
	return document.nodes.map((node) => ({
		id: node.id,
		type: node.type,
		position: node.position,
		data: { ...node.data },
	}));
}

export function toRfEdges(document: FlowCanvasDocument): Edge[] {
	return document.edges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
	}));
}

export function toDocument(
	nodes: FlowRfNode[],
	edges: Edge[],
): FlowCanvasDocument {
	return {
		nodes: nodes.map((node) => ({
			id: node.id,
			type: node.type ?? "note",
			position: { x: node.position.x, y: node.position.y },
			data: node.data,
		})),
		edges: edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
		})),
	};
}

export function orderedNodeIds(document: FlowCanvasDocument): string[] {
	const byId = new Map(document.nodes.map((node) => [node.id, node]));
	const incoming = new Set(document.edges.map((edge) => edge.target));
	const outgoing = new Map<string, string[]>();
	for (const edge of document.edges) {
		outgoing.set(edge.source, [
			...(outgoing.get(edge.source) ?? []),
			edge.target,
		]);
	}

	const byPosition = (a: string, b: string): number => {
		const left = byId.get(a);
		const right = byId.get(b);
		if (!left || !right) return 0;
		return (
			left.position.y - right.position.y || left.position.x - right.position.x
		);
	};

	const order: string[] = [];
	const seen = new Set<string>();
	const visit = (id: string): void => {
		if (seen.has(id) || !byId.has(id)) return;
		seen.add(id);
		order.push(id);
		for (const next of [...(outgoing.get(id) ?? [])].sort(byPosition)) {
			visit(next);
		}
	};

	const roots = document.nodes
		.filter((node) => !incoming.has(node.id))
		.map((node) => node.id)
		.sort(byPosition);
	for (const root of roots) visit(root);
	for (const node of document.nodes) visit(node.id);

	return order;
}

export type CreativeEmbed =
	| { kind: "iframe"; src: string }
	| { kind: "image"; src: string }
	| { kind: "link" };

export function creativeEmbed(url: string): CreativeEmbed {
	if (!URL.canParse(url)) return { kind: "link" };
	const parsed = new URL(url);
	const host = parsed.hostname.replace(/^www\./, "");

	if (host === "youtu.be") {
		return {
			kind: "iframe",
			src: `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`,
		};
	}
	if (host === "youtube.com" || host === "m.youtube.com") {
		const id =
			parsed.searchParams.get("v") ??
			parsed.pathname.match(/\/(?:shorts|embed)\/([^/]+)/)?.[1];
		if (id) {
			return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
		}
	}
	if (host === "loom.com") {
		const id = parsed.pathname.match(/\/(?:share|embed)\/([^/]+)/)?.[1];
		if (id) return { kind: "iframe", src: `https://www.loom.com/embed/${id}` };
	}
	if (host === "drive.google.com") {
		const id = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
		if (id) {
			return {
				kind: "iframe",
				src: `https://drive.google.com/file/d/${id}/preview`,
			};
		}
	}
	if (/\.(png|jpe?g|gif|webp|svg)$/i.test(parsed.pathname)) {
		return { kind: "image", src: url };
	}

	return { kind: "link" };
}
