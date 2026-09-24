"use client";

import {
	FLOW_NODE_LABELS,
	type FlowCanvasDocument,
	flowNodeFields,
	flowNodeTitle,
} from "@crm/validation/flow-canvas";
import { Fragment, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { orderedNodeIds } from "./flow-document";

const PRINT_CSS = `@media print {
	body * { visibility: hidden; }
	.flow-print, .flow-print * { visibility: visible; }
	.flow-print { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 24px; background: white; color: black; }
	.flow-print img { max-width: 100%; border: 1px solid #ddd; border-radius: 6px; }
}`;

const subscribe = (): (() => void) => () => {};

function useMounted(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}

export function FlowPrint({
	title,
	subtitle,
	document,
	internal,
	image,
}: {
	title: string;
	subtitle?: string;
	document: FlowCanvasDocument;
	internal: boolean;
	image?: string | null;
}) {
	const mounted = useMounted();
	if (!mounted) return null;

	const byId = new Map(document.nodes.map((node) => [node.id, node]));
	const targets = (id: string): string[] =>
		document.edges
			.filter((edge) => edge.source === id)
			.flatMap((edge) => {
				const node = byId.get(edge.target);
				return node ? [flowNodeTitle(node)] : [];
			});

	return createPortal(
		<div className="flow-print hidden print:block">
			<style>{PRINT_CSS}</style>
			<h1 className="font-semibold text-2xl">{title}</h1>
			{subtitle ? <p className="text-sm">{subtitle}</p> : null}
			{image ? <img src={image} alt="" className="mt-4" /> : null}
			<ol className="mt-6 space-y-4">
				{orderedNodeIds(document).map((id) => {
					const node = byId.get(id);
					if (!node) return null;
					const fields = flowNodeFields(node.type).filter(
						(field) => internal || !field.internal,
					);
					const next = targets(id);
					return (
						<li key={id} className="break-inside-avoid rounded-md border p-3">
							<p className="text-xs uppercase">{FLOW_NODE_LABELS[node.type]}</p>
							<p className="font-medium">{flowNodeTitle(node)}</p>
							<dl className="mt-2 grid grid-cols-[160px_1fr] gap-x-3 gap-y-1 text-sm">
								{fields.map((field, index) => {
									const value = node.data[field.key]?.trim();
									if (!value || index === 0) return null;
									return (
										<Fragment key={field.key}>
											<dt>{field.label}</dt>
											<dd className="whitespace-pre-wrap">{value}</dd>
										</Fragment>
									);
								})}
							</dl>
							{next.length > 0 ? (
								<p className="mt-2 text-xs">→ {next.join(", ")}</p>
							) : null}
						</li>
					);
				})}
			</ol>
		</div>,
		window.document.body,
	);
}
