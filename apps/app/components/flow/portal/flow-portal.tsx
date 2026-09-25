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
import { FLOW_SECTIONS, type FlowSection } from "../flow-sections";
import {
	type MilestoneStatus,
	PORTAL_MOCK,
	PORTAL_MOCK_2,
} from "./portal-mock";
import {
	RealDocs,
	RealMilestones,
	RealOnboarding,
	RealSummary,
	RealSupport,
} from "./portal-real";

type Mode = "team" | "client";

type Project = { id: string; canEdit: boolean; isAdmin: boolean };

function realSections(
	project: Project,
): Partial<Record<FlowSection, React.ReactNode>> {
	return {
		onboarding: (
			<RealOnboarding projectId={project.id} canEdit={project.canEdit} />
		),
		hitos: <RealMilestones projectId={project.id} canEdit={project.canEdit} />,
		resumen: <RealSummary projectId={project.id} canEdit={project.canEdit} />,
		soporte: <RealSupport projectId={project.id} canEdit={project.canEdit} />,
		docs: (
			<RealDocs
				projectId={project.id}
				canEdit={project.canEdit}
				isAdmin={project.isAdmin}
			/>
		),
	};
}

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

function Preview({ partial = false }: { partial?: boolean }) {
	return (
		<p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
			{partial
				? "Onboarding, hitos, resumen, soporte y documentación ya guardan datos reales. Facturación, atribución, contenido y plantillas siguen siendo vista previa con datos de ejemplo."
				: "Vista previa con datos de ejemplo. Nada de esto se guarda todavía: sirve para decidir cómo queda antes de construirlo."}
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

function Onboarding({ mode }: { mode: Mode }) {
	const data = PORTAL_MOCK_2.onboarding;
	return (
		<div className="space-y-6">
			<Section title={`Onboarding · ${data.progress}% completado`}>
				<div className="h-2 w-full rounded-sm bg-muted">
					<div
						className="h-2 rounded-sm bg-primary"
						style={{ width: `${data.progress}%` }}
					/>
				</div>
				<div className="rounded-md border bg-card p-3 text-sm">
					<p className="text-muted-foreground text-xs">
						Email de bienvenida automático
					</p>
					<p className="mt-1">{data.welcome}</p>
				</div>
			</Section>
			<div className="grid gap-6 lg:grid-cols-2">
				<Section title="Cuestionario">
					{data.questions.map((item) => (
						<div key={item.q} className="rounded-md border bg-card p-3 text-sm">
							<p className="font-medium">{item.q}</p>
							<p
								className={
									item.done
										? "text-muted-foreground text-xs"
										: "text-warning text-xs"
								}
							>
								{item.done ? item.a : "Pendiente de respuesta"}
							</p>
						</div>
					))}
				</Section>
				<Section title="Accesos requeridos (cifrados, van al supervisor)">
					{data.assets.map((asset) => (
						<div
							key={asset.name}
							className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm"
						>
							<Icon icon={Locked} />
							<p className="flex-1">{asset.name}</p>
							<Badge
								variant={asset.status === "recibido" ? "default" : "outline"}
							>
								{asset.status}
							</Badge>
							{mode === "client" && asset.status === "pendiente" ? (
								<Button
									size="sm"
									variant="outline"
									onClick={() => toast.success("Acceso enviado (ejemplo).")}
								>
									Entregar
								</Button>
							) : null}
						</div>
					))}
				</Section>
			</div>
			<Section title="SOPs entregados al cierre del proyecto">
				<div className="flex flex-wrap gap-2">
					{data.sops.map((sop) => (
						<Badge key={sop} variant="outline">
							{sop}
						</Badge>
					))}
				</div>
			</Section>
		</div>
	);
}

function Support({ mode }: { mode: Mode }) {
	const data = PORTAL_MOCK_2.support;
	return (
		<div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
			<Section title="Soporte con IA · sabe todo del proyecto">
				<div className="space-y-2 rounded-md border bg-card p-3">
					{data.thread.map((entry) => (
						<div key={entry.text} className="text-sm">
							<p className="text-muted-foreground text-xs">{entry.who}</p>
							<p>{entry.text}</p>
						</div>
					))}
				</div>
				<p className="text-muted-foreground text-xs">
					Responde con la ficha del cliente, las fases y la checklist; con
					permiso, ejecuta cambios.
					{mode === "team" ? " El cliente puede usar su propia API key." : ""}
				</p>
			</Section>
			<Section title="Incidencias">
				{data.tickets.map((ticket) => (
					<div
						key={ticket.id}
						className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm"
					>
						<span className="font-mono text-xs">{ticket.id}</span>
						<p className="flex-1">{ticket.title}</p>
						<Badge
							variant={ticket.status === "resuelto" ? "default" : "secondary"}
						>
							{ticket.status}
						</Badge>
						{mode === "team" ? (
							<span className="text-muted-foreground text-xs">
								{ticket.owner}
							</span>
						) : null}
					</div>
				))}
			</Section>
		</div>
	);
}

function EventMap() {
	return (
		<Section title="Plan de medición · evento por nodo del lienzo">
			<table className="w-full text-sm">
				<thead className="text-muted-foreground text-xs">
					<tr>
						<th className="py-1 text-left font-normal">Nodo</th>
						<th className="py-1 text-left font-normal">Evento</th>
						<th className="py-1 text-right font-normal">
							Recibidos / esperados
						</th>
					</tr>
				</thead>
				<tbody>
					{PORTAL_MOCK_2.eventMap.map((row) => (
						<tr key={row.node} className="border-t">
							<td className="py-2">{row.node}</td>
							<td className="py-2 text-xs">{row.event}</td>
							<td className="py-2 text-right font-mono text-xs">
								{row.received}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Section>
	);
}

function Templates() {
	return (
		<Section title="Plantillas versionadas">
			{PORTAL_MOCK_2.templates.map((template) => (
				<div
					key={template.name}
					className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-3 text-sm"
				>
					<p className="flex-1 font-medium">{template.name}</p>
					<Badge variant="mono">{template.version}</Badge>
					<span className="text-muted-foreground text-xs">
						{template.instances} proyectos
					</span>
					{template.pending > 0 ? (
						<Button
							size="sm"
							variant="outline"
							onClick={() => toast.success("Actualización aplicada (ejemplo).")}
						>
							Actualizar {template.pending} proyectos
						</Button>
					) : (
						<Badge variant="default">al día</Badge>
					)}
				</div>
			))}
			<p className="text-muted-foreground text-xs">
				Una mejora en la plantilla llega a todos los proyectos sin pisar lo
				personalizado.
			</p>
		</Section>
	);
}

function Team() {
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<Section title="Reuniones → tareas">
				{PORTAL_MOCK_2.meetings.map((meeting) => (
					<div
						key={meeting.title}
						className="rounded-md border bg-card p-3 text-sm"
					>
						<div className="flex items-center gap-2">
							<p className="flex-1 font-medium">{meeting.title}</p>
							<Badge variant="outline">{meeting.folder}</Badge>
						</div>
						<ul className="mt-1 text-muted-foreground text-xs">
							{meeting.tasks.map((task) => (
								<li key={task}>· {task} → checklist</li>
							))}
						</ul>
					</div>
				))}
			</Section>
			<Section title="Starter kit para nuevos del equipo">
				{PORTAL_MOCK_2.starterKit.map((item) => (
					<div
						key={item.text}
						className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm"
					>
						<span
							className={item.done ? "text-success" : "text-muted-foreground"}
						>
							<Icon icon={Checkmark} />
						</span>
						<p className={item.done ? "line-through" : ""}>{item.text}</p>
					</div>
				))}
			</Section>
		</div>
	);
}

function Tiers() {
	return (
		<Section title="Niveles de servicio">
			<div className="grid gap-3 sm:grid-cols-2">
				{PORTAL_MOCK_2.tiers.map((tier) => (
					<div
						key={tier.name}
						className="rounded-md border bg-card p-3 text-sm"
					>
						<div className="flex items-center gap-2">
							<p className="font-medium">{tier.name}</p>
							<Badge variant="outline">{tier.price}</Badge>
						</div>
						<p className="mt-1 text-muted-foreground text-xs">{tier.for}</p>
						<ul className="mt-2 text-xs">
							{tier.features.map((feature) => (
								<li key={feature}>· {feature}</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</Section>
	);
}

export function FlowPortal({
	mode,
	section,
	project,
}: {
	mode: Mode;
	section?: FlowSection;
	project?: Project;
}) {
	const real = project ? realSections(project) : {};
	const render = (key: FlowSection, mock: React.ReactNode) => real[key] ?? mock;
	if (section) {
		return (
			<div className="space-y-4">
				{real[section] ? null : <Preview />}
				<h1 className="font-semibold text-lg">{FLOW_SECTIONS[section]}</h1>
				{section === "onboarding"
					? render("onboarding", <Onboarding mode={mode} />)
					: null}
				{section === "hitos"
					? render("hitos", <Milestones mode={mode} />)
					: null}
				{section === "resumen" ? render("resumen", <Summary />) : null}
				{section === "facturacion" ? (
					<div className="space-y-6">
						<Billing mode={mode} />
						<Tiers />
					</div>
				) : null}
				{section === "atribucion" ? (
					<div className="space-y-6">
						<EventMap />
						<Attribution />
					</div>
				) : null}
				{section === "contenido" ? <Content mode={mode} /> : null}
				{section === "soporte"
					? render("soporte", <Support mode={mode} />)
					: null}
				{section === "docs" ? render("docs", <Docs mode={mode} />) : null}
				{section === "plantillas" ? (
					<div className="space-y-6">
						<Templates />
						<Team />
					</div>
				) : null}
			</div>
		);
	}
	return (
		<div className="space-y-4">
			<Preview partial={Boolean(project)} />
			<Tabs defaultValue="hitos">
				<TabsList className="flex-wrap">
					<TabsTrigger value="onboarding">Onboarding</TabsTrigger>
					<TabsTrigger value="hitos">Hitos</TabsTrigger>
					<TabsTrigger value="resumen">Resumen ejecutivo</TabsTrigger>
					<TabsTrigger value="facturacion">
						{mode === "client"
							? "Propuesta y facturas"
							: "Propuesta y facturación"}
					</TabsTrigger>
					<TabsTrigger value="atribucion">Atribución</TabsTrigger>
					<TabsTrigger value="contenido">Contenido</TabsTrigger>
					<TabsTrigger value="soporte">Soporte</TabsTrigger>
					<TabsTrigger value="docs">Documentación</TabsTrigger>
					{mode === "team" ? (
						<TabsTrigger value="plantillas">Plantillas y equipo</TabsTrigger>
					) : null}
				</TabsList>
				<TabsContent value="onboarding" className="pt-4">
					{render("onboarding", <Onboarding mode={mode} />)}
				</TabsContent>
				<TabsContent value="hitos" className="pt-4">
					{render("hitos", <Milestones mode={mode} />)}
				</TabsContent>
				<TabsContent value="resumen" className="pt-4">
					{render("resumen", <Summary />)}
				</TabsContent>
				<TabsContent value="facturacion" className="space-y-6 pt-4">
					<Billing mode={mode} />
					<Tiers />
				</TabsContent>
				<TabsContent value="atribucion" className="space-y-6 pt-4">
					<EventMap />
					<Attribution />
				</TabsContent>
				<TabsContent value="contenido" className="pt-4">
					<Content mode={mode} />
				</TabsContent>
				<TabsContent value="soporte" className="pt-4">
					{render("soporte", <Support mode={mode} />)}
				</TabsContent>
				<TabsContent value="docs" className="pt-4">
					{render("docs", <Docs mode={mode} />)}
				</TabsContent>
				<TabsContent value="plantillas" className="space-y-6 pt-4">
					<Templates />
					<Team />
				</TabsContent>
			</Tabs>
		</div>
	);
}
