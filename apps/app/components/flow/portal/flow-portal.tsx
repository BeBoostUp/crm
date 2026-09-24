"use client";

import Checkmark from "@carbon/icons-react/es/Checkmark";
import Locked from "@carbon/icons-react/es/Locked";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@crm/ui/components/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { type MilestoneStatus, PORTAL_MOCK } from "./portal-mock";

type Mode = "team" | "client";

const STATUS_VARIANT = {
	pendiente: "outline",
	"en curso": "secondary",
	entregado: "mono",
	aprobado: "default",
} as const satisfies Record<MilestoneStatus, string>;

const INVOICE_VARIANT = {
	borrador: "outline",
	enviada: "secondary",
	pagada: "default",
} as const;

const PIECE_VARIANT = {
	borrador: "outline",
	aprobado: "secondary",
	publicado: "default",
} as const;

function Preview() {
	return (
		<p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
			Vista previa con datos de ejemplo. Nada de esto se guarda todavía: sirve
			para decidir cómo queda antes de construirlo.
		</p>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">{title}</h2>
			{children}
		</section>
	);
}

function Milestones({ mode }: { mode: Mode }) {
	const [approved, setApproved] = useState<string[]>([]);
	return (
		<Section title="Hitos del proyecto">
			<ol className="space-y-3">
				{PORTAL_MOCK.milestones.map((milestone, index) => {
					const status: MilestoneStatus = approved.includes(milestone.id)
						? "aprobado"
						: milestone.status;
					return (
						<li
							key={milestone.id}
							className="flex gap-3 rounded-md border bg-card p-3"
						>
							<span className="flex size-7 shrink-0 items-center justify-center rounded-full border font-medium text-xs">
								{status === "aprobado" ? <Icon icon={Checkmark} /> : index + 1}
							</span>
							<div className="min-w-0 flex-1 space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<p className="font-medium text-sm">{milestone.title}</p>
									<Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
									<span className="text-muted-foreground text-xs">
										{milestone.due}
									</span>
								</div>
								<ul className="text-muted-foreground text-xs">
									{milestone.deliverables.map((item) => (
										<li key={item}>· {item}</li>
									))}
								</ul>
								{status === "aprobado" ? (
									<p className="text-success text-xs">
										Aprobado por {milestone.approvedBy ?? "el cliente · ahora"}
									</p>
								) : null}
							</div>
							{mode === "client" && status === "entregado" ? (
								<Button
									size="sm"
									onClick={() => {
										setApproved((current) => [...current, milestone.id]);
										toast.success("Hito aprobado (ejemplo).");
									}}
								>
									Aprobar
								</Button>
							) : null}
						</li>
					);
				})}
			</ol>
		</Section>
	);
}

function Summary() {
	const max = Math.max(...PORTAL_MOCK.weeks.map((week) => week.spend));
	return (
		<Section title="Resumen ejecutivo · últimas 4 semanas">
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{PORTAL_MOCK.kpis.map((kpi) => (
					<div key={kpi.label} className="rounded-md border bg-card p-3">
						<p className="text-muted-foreground text-xs">{kpi.label}</p>
						<p className="font-semibold text-2xl">{kpi.value}</p>
						<p className="text-muted-foreground text-xs">{kpi.delta}</p>
					</div>
				))}
			</div>
			<div className="rounded-md border bg-card p-3">
				<p className="mb-3 text-muted-foreground text-xs">
					Inversión semanal y citas asistidas
				</p>
				<div className="flex h-40 items-stretch gap-4">
					{PORTAL_MOCK.weeks.map((week) => (
						<div
							key={week.label}
							className="flex flex-1 flex-col items-center justify-end gap-1"
						>
							<span className="text-xs">{week.visits} citas</span>
							<div
								className="w-full min-h-1 rounded-sm bg-primary"
								style={{ height: `${(week.spend / max) * 100}%` }}
							/>
							<span className="text-muted-foreground text-xs">
								{week.label} · {week.spend} €
							</span>
						</div>
					))}
				</div>
			</div>
			<p className="text-muted-foreground text-xs">
				Optimizando a «cita asistida» desde el 3 oct: el CPA por cita bajó de
				118 € a 73,6 € (-38 %).
			</p>
		</Section>
	);
}

function Billing({ mode }: { mode: Mode }) {
	const proposal = PORTAL_MOCK.proposal;
	return (
		<Section title="Propuesta y facturación">
			<div className="rounded-md border bg-card p-3">
				<div className="flex flex-wrap items-center gap-2">
					<p className="font-medium text-sm">{proposal.title}</p>
					<Badge variant="default">
						{proposal.status} · {proposal.acceptedAt}
					</Badge>
				</div>
				<p className="mt-1 text-sm">
					{proposal.price} · {proposal.setup}
				</p>
				<ul className="mt-2 text-muted-foreground text-xs">
					{proposal.scope.map((item) => (
						<li key={item}>· {item}</li>
					))}
				</ul>
			</div>
			<table className="w-full text-sm">
				<thead className="text-muted-foreground text-xs">
					<tr>
						<th className="py-1 text-left font-normal">Factura</th>
						<th className="py-1 text-left font-normal">Concepto</th>
						<th className="py-1 text-left font-normal">Fecha</th>
						<th className="py-1 text-right font-normal">Importe</th>
						<th className="py-1 text-right font-normal">Estado</th>
					</tr>
				</thead>
				<tbody>
					{PORTAL_MOCK.invoices.map((invoice) => (
						<tr key={invoice.number} className="border-t">
							<td className="py-2 font-mono text-xs">{invoice.number}</td>
							<td className="py-2">{invoice.concept}</td>
							<td className="py-2 text-muted-foreground">{invoice.date}</td>
							<td className="py-2 text-right">{invoice.amount}</td>
							<td className="py-2 text-right">
								<Badge variant={INVOICE_VARIANT[invoice.status]}>
									{invoice.status}
								</Badge>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{mode === "team" ? (
				<p className="text-muted-foreground text-xs">
					Las facturas se crearían en Holded al aceptar la propuesta y al inicio
					de cada mes; acá se ve su estado.
				</p>
			) : null}
		</Section>
	);
}

function Attribution() {
	const config = PORTAL_MOCK.attribution;
	return (
		<Section title="Atribución server-side">
			<div className="grid gap-3 sm:grid-cols-3">
				<div className="rounded-md border bg-card p-3 text-sm">
					<p className="text-muted-foreground text-xs">Pixel de Meta</p>
					<p className="font-mono">{config.pixel}</p>
					<p className="text-success text-xs">CAPI {config.capi}</p>
				</div>
				<div className="rounded-md border bg-card p-3 text-sm">
					<p className="text-muted-foreground text-xs">Campos UTM guardados</p>
					<p className="text-xs">{config.utms.join(" · ")}</p>
				</div>
				<div className="rounded-md border bg-card p-3 text-sm">
					<p className="text-muted-foreground text-xs">Conciliación</p>
					<p className="text-xs">{config.reconciliation}</p>
				</div>
			</div>
			<table className="w-full text-sm">
				<thead className="text-muted-foreground text-xs">
					<tr>
						<th className="py-1 text-left font-normal">Cuándo</th>
						<th className="py-1 text-left font-normal">Evento</th>
						<th className="py-1 text-left font-normal">Origen</th>
						<th className="py-1 text-left font-normal">Meta CAPI</th>
						<th className="py-1 text-left font-normal">Google</th>
					</tr>
				</thead>
				<tbody>
					{PORTAL_MOCK.events.map((event) => (
						<tr key={`${event.at}-${event.type}`} className="border-t">
							<td className="py-2 text-muted-foreground">{event.at}</td>
							<td className="py-2">
								{event.type}
								<span className="block text-muted-foreground text-xs">
									{event.utm}
								</span>
							</td>
							<td className="py-2 text-xs">{event.source}</td>
							<td className="py-2 text-xs">{event.meta}</td>
							<td className="py-2 text-xs">{event.google}</td>
						</tr>
					))}
				</tbody>
			</table>
		</Section>
	);
}

function Content({ mode }: { mode: Mode }) {
	return (
		<Section title="Motor de contenido">
			<div className="grid gap-4 lg:grid-cols-2">
				<div className="space-y-2">
					<p className="text-muted-foreground text-xs">Fuentes</p>
					{PORTAL_MOCK.sources.map((source) => (
						<div
							key={source.title}
							className="rounded-md border bg-card p-3 text-sm"
						>
							<p className="font-medium">{source.title}</p>
							<p className="text-muted-foreground text-xs">
								{source.kind}
								{source.minutes ? ` · ${source.minutes} min` : ""} ·{" "}
								{source.status}
							</p>
						</div>
					))}
					{mode === "team" ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								toast.success("Generación simulada: 4 piezas nuevas.")
							}
						>
							Generar piezas de la semana
						</Button>
					) : null}
				</div>
				<div className="space-y-2">
					<p className="text-muted-foreground text-xs">Piezas</p>
					{PORTAL_MOCK.pieces.map((piece) => (
						<div
							key={piece.title}
							className="rounded-md border bg-card p-3 text-sm"
						>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">{piece.channel}</Badge>
								<p className="font-medium">{piece.title}</p>
								<Badge
									variant={
										PIECE_VARIANT[piece.status as keyof typeof PIECE_VARIANT]
									}
								>
									{piece.status}
								</Badge>
							</div>
							<p className="text-muted-foreground text-xs">
								Estilo: {piece.style}
							</p>
						</div>
					))}
				</div>
			</div>
		</Section>
	);
}

function Docs({ mode }: { mode: Mode }) {
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<Section title="Documentación viva">
				{PORTAL_MOCK.docs.map((doc) => (
					<div
						key={doc.title}
						className="rounded-md border bg-card p-3 text-sm"
					>
						<p className="font-medium">{doc.title}</p>
						<p className="text-muted-foreground text-xs">
							Actualizado {doc.updated} · {doc.by}
						</p>
					</div>
				))}
			</Section>
			<Section title="Decisiones">
				{PORTAL_MOCK.decisions.map((decision) => (
					<div
						key={decision.title}
						className="rounded-md border bg-card p-3 text-sm"
					>
						<p className="font-medium">{decision.title}</p>
						<p className="text-muted-foreground text-xs">
							{decision.date} · {decision.by}
						</p>
						<p className="mt-1 text-xs">{decision.why}</p>
					</div>
				))}
			</Section>
			{mode === "team" ? (
				<Section title="Bóveda de accesos">
					{PORTAL_MOCK.vault.map((entry) => (
						<div
							key={entry.name}
							className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm"
						>
							<Icon icon={Locked} />
							<div className="min-w-0 flex-1">
								<p className="font-medium">{entry.name}</p>
								<p className="text-muted-foreground text-xs">
									{entry.user} · ••••••••••• · {entry.updated}
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => toast.success("Copiado (ejemplo).")}
							>
								Copiar
							</Button>
						</div>
					))}
				</Section>
			) : null}
		</div>
	);
}

export function FlowPortal({ mode }: { mode: Mode }) {
	return (
		<div className="space-y-4">
			<Preview />
			<Tabs defaultValue="hitos">
				<TabsList className="flex-wrap">
					<TabsTrigger value="hitos">Hitos</TabsTrigger>
					<TabsTrigger value="resumen">Resumen ejecutivo</TabsTrigger>
					<TabsTrigger value="facturacion">
						{mode === "client"
							? "Propuesta y facturas"
							: "Propuesta y facturación"}
					</TabsTrigger>
					<TabsTrigger value="atribucion">Atribución</TabsTrigger>
					<TabsTrigger value="contenido">Contenido</TabsTrigger>
					<TabsTrigger value="docs">Documentación</TabsTrigger>
				</TabsList>
				<TabsContent value="hitos" className="pt-4">
					<Milestones mode={mode} />
				</TabsContent>
				<TabsContent value="resumen" className="pt-4">
					<Summary />
				</TabsContent>
				<TabsContent value="facturacion" className="pt-4">
					<Billing mode={mode} />
				</TabsContent>
				<TabsContent value="atribucion" className="pt-4">
					<Attribution />
				</TabsContent>
				<TabsContent value="contenido" className="pt-4">
					<Content mode={mode} />
				</TabsContent>
				<TabsContent value="docs" className="pt-4">
					<Docs mode={mode} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
