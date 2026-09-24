"use client";

import "@xyflow/react/dist/style.css";

import Add from "@carbon/icons-react/es/Add";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import {
	FLOW_CANVAS_NODE_KINDS,
	FLOW_NODE_LABELS,
	type FlowCanvasDocument,
	type FlowCanvasType,
	type FlowNodeKind,
} from "@crm/validation/flow-canvas";
import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	Background,
	Controls,
	type Edge,
	getNodesBounds,
	getViewportForBounds,
	MiniMap,
	type OnConnect,
	type OnEdgesChange,
	type OnNodesChange,
	Panel,
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { useTheme } from "next-themes";
import { type Ref, useImperativeHandle, useRef, useState } from "react";
import {
	type FlowNodeData,
	type FlowRfNode,
	orderedNodeIds,
	toDocument,
	toRfEdges,
	toRfNodes,
} from "./flow-document";
import { flowNodeTypes } from "./flow-node";
import { FlowNodeSheet } from "./flow-node-sheet";

const SPAWN_GAP = 40;

const SPAWN_STEPS = 6;

const SNAPSHOT = {
	background: "#0a0a0a",
	minZoom: 0.1,
	maxZoom: 2,
	padding: 0.08,
} as const;

export type FlowBoardHandle = {
	snapshot: (width: number, height: number) => Promise<string | null>;
};

type Props = {
	document: FlowCanvasDocument;
	type: FlowCanvasType;
	canEdit: boolean;
	presentation: boolean;
	hideInternal?: boolean;
	cinematic?: boolean;
	onDocumentChange?: (document: FlowCanvasDocument) => void;
	ref?: Ref<FlowBoardHandle>;
};

export function FlowCanvasBoard(props: Props) {
	return (
		<ReactFlowProvider>
			<Board {...props} />
		</ReactFlowProvider>
	);
}

function Board({
	document,
	type,
	canEdit,
	presentation,
	hideInternal,
	cinematic = false,
	onDocumentChange,
	ref,
}: Props) {
	const { resolvedTheme } = useTheme();
	const { screenToFlowPosition, fitView, getNodes } = useReactFlow<
		FlowRfNode,
		Edge
	>();
	const [nodes, setNodes] = useState<FlowRfNode[]>(() => toRfNodes(document));
	const [edges, setEdges] = useState<Edge[]>(() => toRfEdges(document));
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	const editing = canEdit && !presentation;

	useImperativeHandle(ref, () => ({
		snapshot: async (width, height) => {
			const element = window.document.querySelector<HTMLElement>(
				".react-flow__viewport",
			);
			const measured = getNodes();
			if (!element || measured.length === 0) return null;
			const viewport = getViewportForBounds(
				getNodesBounds(measured),
				width,
				height,
				SNAPSHOT.minZoom,
				SNAPSHOT.maxZoom,
				SNAPSHOT.padding,
			);
			return toPng(element, {
				backgroundColor: SNAPSHOT.background,
				width,
				height,
				style: {
					width: `${width}px`,
					height: `${height}px`,
					transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
				},
			});
		},
	}));

	const commit = (nextNodes: FlowRfNode[], nextEdges: Edge[]): void => {
		nodesRef.current = nextNodes;
		edgesRef.current = nextEdges;
		setNodes(nextNodes);
		setEdges(nextEdges);
		if (editing) onDocumentChange?.(toDocument(nextNodes, nextEdges));
	};

	const onNodesChange: OnNodesChange<FlowRfNode> = (changes) =>
		commit(applyNodeChanges(changes, nodesRef.current), edgesRef.current);

	const onEdgesChange: OnEdgesChange<Edge> = (changes) =>
		commit(nodesRef.current, applyEdgeChanges(changes, edgesRef.current));

	const onConnect: OnConnect = (connection) =>
		commit(
			nodesRef.current,
			addEdge({ ...connection, id: crypto.randomUUID() }, edgesRef.current),
		);

	const addNode = (kind: FlowNodeKind): void => {
		const offset = (nodesRef.current.length % SPAWN_STEPS) * SPAWN_GAP;
		const center = screenToFlowPosition({
			x: window.innerWidth / 2,
			y: window.innerHeight / 2,
		});
		const node: FlowRfNode = {
			id: crypto.randomUUID(),
			type: kind,
			position: { x: center.x + offset, y: center.y + offset },
			data: {},
		};
		commit([...nodesRef.current, node], edgesRef.current);
		setSelectedId(node.id);
	};

	const updateData = (id: string, data: FlowNodeData): void =>
		commit(
			nodesRef.current.map((node) =>
				node.id === id ? { ...node, data } : node,
			),
			edgesRef.current,
		);

	const removeNode = (id: string): void => {
		commit(
			nodesRef.current.filter((node) => node.id !== id),
			edgesRef.current.filter(
				(edge) => edge.source !== id && edge.target !== id,
			),
		);
		setSelectedId(null);
	};

	const step = (direction: -1 | 1): void => {
		const order = orderedNodeIds(
			toDocument(nodesRef.current, edgesRef.current),
		);
		if (order.length === 0) return;
		const index = selectedId ? order.indexOf(selectedId) : -1;
		const next = order[(index + direction + order.length) % order.length];
		if (!next) return;
		setSelectedId(next);
		void fitView({ nodes: [{ id: next }], duration: 400, maxZoom: 1.2 });
	};

	const selected = nodes.find((node) => node.id === selectedId) ?? null;
	const dim = cinematic && presentation && selectedId !== null;
	const displayNodes = dim
		? nodes.map((node) => ({
				...node,
				style: {
					opacity: node.id === selectedId ? 1 : 0.2,
					transition: "opacity 300ms",
				},
			}))
		: nodes;
	const displayEdges = dim
		? edges.map((edge) => ({
				...edge,
				style: {
					opacity:
						edge.source === selectedId || edge.target === selectedId ? 1 : 0.15,
				},
			}))
		: edges;

	return (
		<div className="relative h-full min-h-0 w-full">
			<ReactFlow
				nodes={displayNodes}
				edges={displayEdges}
				nodeTypes={flowNodeTypes}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onNodeClick={(_, node) => setSelectedId(node.id)}
				onPaneClick={() => setSelectedId(null)}
				nodesDraggable={editing}
				nodesConnectable={editing}
				elementsSelectable
				deleteKeyCode={editing ? ["Backspace", "Delete"] : null}
				colorMode={resolvedTheme === "dark" ? "dark" : "light"}
				fitView
				minZoom={0.2}
			>
				<Background gap={16} />
				<Controls showInteractive={false} />
				<MiniMap pannable zoomable />
				{editing ? (
					<Panel position="top-left" className="flex flex-wrap gap-2">
						{FLOW_CANVAS_NODE_KINDS[type].map((kind) => (
							<Button
								key={kind}
								size="sm"
								variant="outline"
								onClick={() => addNode(kind)}
							>
								<Icon icon={Add} data-icon="inline-start" />
								{FLOW_NODE_LABELS[kind]}
							</Button>
						))}
					</Panel>
				) : null}
			</ReactFlow>

			<FlowNodeSheet
				node={selected}
				canEdit={editing}
				hideInternal={hideInternal}
				onClose={() => setSelectedId(null)}
				onChange={updateData}
				onDelete={editing ? removeNode : undefined}
				onStep={presentation ? step : undefined}
			/>
		</div>
	);
}
