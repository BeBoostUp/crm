"use client";

import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import Launch from "@carbon/icons-react/es/Launch";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import { Button } from "@crm/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@crm/ui/components/field";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@crm/ui/components/sheet";
import { Textarea } from "@crm/ui/components/textarea";
import {
	FLOW_NODE_LABELS,
	type FlowField,
	flowNodeFields,
	flowNodeMissing,
	flowNodeTitle,
} from "@crm/validation/flow-canvas";
import { useId } from "react";
import {
	creativeEmbed,
	type FlowNodeData,
	type FlowRfNode,
} from "./flow-document";

type Props = {
	node: FlowRfNode | null;
	canEdit: boolean;
	hideInternal?: boolean;
	onClose: () => void;
	onChange: (id: string, data: FlowNodeData) => void;
	onDelete?: (id: string) => void;
	onStep?: (direction: -1 | 1) => void;
};

export function FlowNodeSheet({
	node,
	canEdit,
	hideInternal = false,
	onClose,
	onChange,
	onDelete,
	onStep,
}: Props) {
	const prefix = useId();
	const kind = node?.type ?? "note";
	const fields = flowNodeFields(kind).filter(
		(field) => !(hideInternal && field.internal),
	);
	const current = node ? { ...node, type: kind } : null;
	const missing = current ? flowNodeMissing(current) : [];

	return (
		<Sheet
			open={node !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>{current ? flowNodeTitle(current) : ""}</SheetTitle>
					<SheetDescription>
						{FLOW_NODE_LABELS[kind]}
						{missing.length > 0
							? ` · falta ${missing.join(", ")}`
							: " · completo"}
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-4">
					{node ? (
						<FieldGroup>
							{fields.map((field) => (
								<NodeField
									key={field.key}
									id={`${prefix}-${field.key}`}
									field={field}
									value={node.data[field.key] ?? ""}
									canEdit={canEdit}
									onChange={(value) =>
										onChange(node.id, { ...node.data, [field.key]: value })
									}
								/>
							))}
						</FieldGroup>
					) : null}
				</div>

				<SheetFooter>
					{onStep ? (
						<>
							<Button variant="outline" onClick={() => onStep(-1)}>
								<Icon icon={ChevronLeft} data-icon="inline-start" />
								Anterior
							</Button>
							<Button variant="outline" onClick={() => onStep(1)}>
								Siguiente
								<Icon icon={ChevronRight} data-icon="inline-end" />
							</Button>
						</>
					) : null}
					{canEdit && onDelete && node ? (
						<Button variant="destructive" onClick={() => onDelete(node.id)}>
							<Icon icon={TrashCan} data-icon="inline-start" />
							Eliminar
						</Button>
					) : null}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function NodeField({
	id,
	field,
	value,
	canEdit,
	onChange,
}: {
	id: string;
	field: FlowField;
	value: string;
	canEdit: boolean;
	onChange: (value: string) => void;
}) {
	const preview = field.kind === "url" && value ? creativeEmbed(value) : null;

	return (
		<Field>
			<FieldLabel htmlFor={id}>
				{field.label}
				{field.required ? " *" : ""}
			</FieldLabel>
			{canEdit ? (
				<NodeInput id={id} field={field} value={value} onChange={onChange} />
			) : (
				<p id={id} className="whitespace-pre-wrap text-sm">
					{value || <span className="text-muted-foreground">—</span>}
				</p>
			)}
			{field.kind === "url" && value ? (
				<a
					href={value}
					target="_blank"
					rel="noreferrer"
					className="text-link text-xs underline-offset-4 hover:underline"
				>
					<Icon icon={Launch} data-icon="inline-start" />
					Abrir enlace
				</a>
			) : null}
			{preview?.kind === "iframe" ? (
				<iframe
					title={field.label}
					src={preview.src}
					className="aspect-video w-full rounded-md border"
					allow="autoplay; fullscreen"
				/>
			) : null}
			{preview?.kind === "image" ? (
				<img src={preview.src} alt="" className="w-full rounded-md border" />
			) : null}
		</Field>
	);
}

function NodeInput({
	id,
	field,
	value,
	onChange,
}: {
	id: string;
	field: FlowField;
	value: string;
	onChange: (value: string) => void;
}) {
	if (field.kind === "textarea") {
		return (
			<Textarea
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={field.placeholder}
				rows={4}
			/>
		);
	}
	if (field.kind === "select") {
		return (
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger id={id} className="w-full">
					<SelectValue placeholder="Elegir…" />
				</SelectTrigger>
				<SelectContent>
					{field.options?.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}
	return (
		<Input
			id={id}
			type={field.kind === "url" ? "url" : "text"}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder={field.placeholder}
		/>
	);
}
