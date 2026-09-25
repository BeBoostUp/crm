"use client";

import Checkmark from "@carbon/icons-react/es/Checkmark";
import Close from "@carbon/icons-react/es/Close";
import Locked from "@carbon/icons-react/es/Locked";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { Textarea } from "@crm/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type Portal = RouterOutputs["flowPortal"]["get"];

type GuestPortal = RouterOutputs["flowPortal"]["guestPortal"];

type Milestone = Portal["milestones"][number];

type Metric = Portal["metrics"][number];

const STATUS = {
	PENDING: { label: "pendiente", variant: "outline" },
	IN_PROGRESS: { label: "en curso", variant: "secondary" },
	DELIVERED: { label: "entregado", variant: "mono" },
	APPROVED: { label: "aprobado", variant: "default" },
} as const;

type Status = keyof typeof STATUS;

function useError() {
	return (error: { message: string }) => toast.error(error.message);
}

function money(value: number): string {
	return `${value.toLocaleString("es", { maximumFractionDigits: 0 })} €`;
}

function MilestoneCard({
	milestone,
	index,
	children,
}: {
	milestone: Milestone;
	index: number;
	children?: React.ReactNode;
}) {
	const status = STATUS[milestone.status as Status];
	return (
		<li className="flex gap-3 rounded-md border bg-card p-3">
			<span className="flex size-7 shrink-0 items-center justify-center rounded-full border font-medium text-xs">
				{milestone.status === "APPROVED" ? (
					<Icon icon={Checkmark} />
				) : (
					index + 1
				)}
			</span>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="font-medium text-sm">{milestone.title}</p>
					<Badge variant={status.variant}>{status.label}</Badge>
					{milestone.dueAt ? (
						<span className="text-muted-foreground text-xs">
							{new Date(milestone.dueAt).toLocaleDateString("es")}
						</span>
					) : null}
				</div>
				{milestone.description ? (
					<p className="text-muted-foreground text-xs">
						{milestone.description}
					</p>
				) : null}
				<ul className="text-muted-foreground text-xs">
					{milestone.deliverables.map((item) => (
						<li key={item.label}>
							·{" "}
							{item.url ? (
								<a
									href={item.url}
									target="_blank"
									rel="noreferrer"
									className="text-link underline-offset-4 hover:underline"
								>
									{item.label}
								</a>
							) : (
								item.label
							)}
						</li>
					))}
				</ul>
				{milestone.approvedBy ? (
					<p className="text-success text-xs">
						Aprobado por {milestone.approvedBy}
						{milestone.approvedAt
							? ` · ${new Date(milestone.approvedAt).toLocaleDateString("es")}`
							: ""}
					</p>
				) : null}
			</div>
			{children}
		</li>
	);
}

export function RealMilestones({
	projectId,
	canEdit,
}: {
	projectId: string;
	canEdit: boolean;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const onError = useError();
	const { data } = useQuery(trpc.flowPortal.get.queryOptions({ projectId }));
	const [title, setTitle] = useState("");
	const [deliverables, setDeliverables] = useState("");
	const create = useMutation(
		trpc.flowPortal.createMilestone.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setTitle("");
				setDeliverables("");
			},
			onError,
		}),
	);
	const update = useMutation(
		trpc.flowPortal.updateMilestone.mutationOptions({
			onSuccess: () => cache.flow(),
			onError,
		}),
	);
	const remove = useMutation(
		trpc.flowPortal.removeMilestone.mutationOptions({
			onSuccess: () => cache.flow(),
			onError,
		}),
	);
	if (!data) return null;

	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">Hitos del proyecto</h2>
			<ol className="space-y-3">
				{data.milestones.map((milestone, index) => (
					<MilestoneCard key={milestone.id} milestone={milestone} index={index}>
						{canEdit ? (
							<div className="flex items-center gap-1">
								<Select
									value={milestone.status}
									onValueChange={(value) =>
										update.mutate({ id: milestone.id, status: value as Status })
									}
								>
									<SelectTrigger className="w-36" aria-label="Estado">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(STATUS).map(([value, entry]) => (
											<SelectItem key={value} value={value}>
												{entry.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									variant="ghost"
									size="icon"
									aria-label="Quitar hito"
									onClick={() => remove.mutate({ id: milestone.id })}
								>
									<Icon icon={Close} />
								</Button>
							</div>
						) : null}
					</MilestoneCard>
				))}
			</ol>
			{canEdit ? (
				<form
					className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
					onSubmit={(event) => {
						event.preventDefault();
						create.mutate({
							projectId,
							title: title.trim(),
							description: "",
							dueAt: null,
							deliverables: deliverables
								.split(",")
								.map((label) => label.trim())
								.filter(Boolean)
								.map((label) => ({ label, url: "" })),
						});
					}}
				>
					<Input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder="Nuevo hito"
						aria-label="Nuevo hito"
						required
						maxLength={160}
					/>
					<Input
						value={deliverables}
						onChange={(event) => setDeliverables(event.target.value)}
						placeholder="Entregables, separados por coma"
						aria-label="Entregables"
					/>
					<Button type="submit" disabled={!title.trim() || create.isPending}>
						Agregar
					</Button>
				</form>
			) : null}
		</section>
	);
}

export function GuestMilestones({
	token,
	data,
}: {
	token: string;
	data: GuestPortal;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const onError = useError();
	const [name, setName] = useState("");
	const approve = useMutation(
		trpc.flowPortal.guestApprove.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				toast.success("Hito aprobado.");
			},
			onError,
		}),
	);
	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">Hitos del proyecto</h2>
			<Input
				value={name}
				onChange={(event) => setName(event.target.value)}
				placeholder="Tu nombre (para aprobar)"
				aria-label="Tu nombre"
				className="max-w-xs"
			/>
			<ol className="space-y-3">
				{data.milestones.map((milestone, index) => (
					<MilestoneCard key={milestone.id} milestone={milestone} index={index}>
						{milestone.status === "DELIVERED" ? (
							<Button
								size="sm"
								disabled={!name.trim() || approve.isPending}
								onClick={() =>
									approve.mutate({
										token,
										milestoneId: milestone.id,
										name: name.trim(),
									})
								}
							>
								Aprobar
							</Button>
						) : null}
					</MilestoneCard>
				))}
			</ol>
		</section>
	);
}

export function SummaryView({ metrics }: { metrics: Metric[] }) {
	const last = metrics.slice(-4);
	const total = (key: "spend" | "leads" | "booked" | "attended") =>
		last.reduce((sum, row) => sum + row[key], 0);
	const spend = total("spend");
	const leads = total("leads");
	const booked = total("booked");
	const attended = total("attended");
	const max = Math.max(1, ...last.map((row) => row.spend));
	const per = (count: number) => (count > 0 ? money(spend / count) : "—");
	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">
				Resumen ejecutivo · últimas {last.length || 0} semanas
			</h2>
			{last.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Todavía no hay métricas cargadas.
				</p>
			) : null}
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{[
					{ label: "Inversión", value: money(spend), delta: "" },
					{
						label: "Leads",
						value: String(leads),
						delta: `${per(leads)} por lead`,
					},
					{
						label: "Citas agendadas",
						value: String(booked),
						delta: leads
							? `${Math.round((booked / leads) * 100)} % de los leads`
							: "",
					},
					{
						label: "Citas asistidas",
						value: String(attended),
						delta: `CPA ${per(attended)}`,
					},
				].map((kpi) => (
					<div key={kpi.label} className="rounded-md border bg-card p-3">
						<p className="text-muted-foreground text-xs">{kpi.label}</p>
						<p className="font-semibold text-2xl">{kpi.value}</p>
						<p className="text-muted-foreground text-xs">{kpi.delta}</p>
					</div>
				))}
			</div>
			{last.length > 0 ? (
				<div className="rounded-md border bg-card p-3">
					<p className="mb-3 text-muted-foreground text-xs">
						Inversión semanal y citas asistidas
					</p>
					<div className="flex h-40 items-stretch gap-4">
						{last.map((row) => (
							<div
								key={row.id}
								className="flex flex-1 flex-col items-center justify-end gap-1"
							>
								<span className="text-xs">{row.attended} citas</span>
								<div
									className="w-full min-h-1 rounded-sm bg-primary"
									style={{ height: `${(row.spend / max) * 100}%` }}
								/>
								<span className="text-muted-foreground text-xs">
									{row.weekStart.slice(5)} · {money(row.spend)}
								</span>
							</div>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}

export function RealSummary({
	projectId,
	canEdit,
}: {
	projectId: string;
	canEdit: boolean;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const onError = useError();
	const { data } = useQuery(trpc.flowPortal.get.queryOptions({ projectId }));
	const [form, setForm] = useState({
		weekStart: "",
		spend: "",
		leads: "",
		booked: "",
		attended: "",
		sales: "",
	});
	const upsert = useMutation(
		trpc.flowPortal.upsertMetric.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				toast.success("Semana guardada.");
			},
			onError,
		}),
	);
	const remove = useMutation(
		trpc.flowPortal.removeMetric.mutationOptions({
			onSuccess: () => cache.flow(),
			onError,
		}),
	);
	if (!data) return null;
	const set =
		(key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
			setForm((current) => ({ ...current, [key]: event.target.value }));

	return (
		<div className="space-y-6">
			<SummaryView metrics={data.metrics} />
			{canEdit ? (
				<section className="space-y-3">
					<h2 className="font-medium text-sm">Cargar semana</h2>
					<form
						className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7"
						onSubmit={(event) => {
							event.preventDefault();
							upsert.mutate({
								projectId,
								weekStart: form.weekStart,
								spend: Number(form.spend || 0),
								leads: Number(form.leads || 0),
								booked: Number(form.booked || 0),
								attended: Number(form.attended || 0),
								sales: Number(form.sales || 0),
								notes: "",
							});
						}}
					>
						<Input
							type="date"
							value={form.weekStart}
							onChange={set("weekStart")}
							aria-label="Semana (lunes)"
							required
						/>
						<Input
							type="number"
							min="0"
							step="0.01"
							value={form.spend}
							onChange={set("spend")}
							placeholder="Inversión €"
							aria-label="Inversión"
						/>
						<Input
							type="number"
							min="0"
							value={form.leads}
							onChange={set("leads")}
							placeholder="Leads"
							aria-label="Leads"
						/>
						<Input
							type="number"
							min="0"
							value={form.booked}
							onChange={set("booked")}
							placeholder="Citas agendadas"
							aria-label="Citas agendadas"
						/>
						<Input
							type="number"
							min="0"
							value={form.attended}
							onChange={set("attended")}
							placeholder="Citas asistidas"
							aria-label="Citas asistidas"
						/>
						<Input
							type="number"
							min="0"
							value={form.sales}
							onChange={set("sales")}
							placeholder="Ventas"
							aria-label="Ventas"
						/>
						<Button
							type="submit"
							disabled={!form.weekStart || upsert.isPending}
						>
							Guardar
						</Button>
					</form>
					{data.metrics.length > 0 ? (
						<table className="w-full text-sm">
							<thead className="text-muted-foreground text-xs">
								<tr>
									<th className="py-1 text-left font-normal">Semana</th>
									<th className="py-1 text-right font-normal">Inversión</th>
									<th className="py-1 text-right font-normal">Leads</th>
									<th className="py-1 text-right font-normal">Agendadas</th>
									<th className="py-1 text-right font-normal">Asistidas</th>
									<th className="py-1 text-right font-normal">Ventas</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{data.metrics.map((row) => (
									<tr key={row.id} className="border-t">
										<td className="py-1">{row.weekStart}</td>
										<td className="py-1 text-right">{money(row.spend)}</td>
										<td className="py-1 text-right">{row.leads}</td>
										<td className="py-1 text-right">{row.booked}</td>
										<td className="py-1 text-right">{row.attended}</td>
										<td className="py-1 text-right">{row.sales}</td>
										<td className="py-1 text-right">
											<Button
												variant="ghost"
												size="icon"
												aria-label="Quitar semana"
												onClick={() => remove.mutate({ id: row.id })}
											>
												<Icon icon={Close} />
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : null}
				</section>
			) : null}
		</div>
	);
}

export function OnboardingView({
	items,
	onAnswer,
	canEdit,
}: {
	items: GuestPortal["onboarding"];
	onAnswer: (id: string, answer: string) => void;
	canEdit: boolean;
}) {
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const done = items.filter((item) => item.done).length;
	const progress = items.length ? Math.round((done / items.length) * 100) : 0;
	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">
				Onboarding · {progress}% completado
			</h2>
			<div className="h-2 w-full rounded-sm bg-muted">
				<div
					className="h-2 rounded-sm bg-primary"
					style={{ width: `${progress}%` }}
				/>
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				{(["QUESTION", "ASSET"] as const).map((kind) => (
					<div key={kind} className="space-y-2">
						<p className="text-muted-foreground text-xs">
							{kind === "QUESTION" ? "Cuestionario" : "Accesos requeridos"}
						</p>
						{items
							.filter((item) => item.kind === kind)
							.map((item) => (
								<div
									key={item.id}
									className="rounded-md border bg-card p-3 text-sm"
								>
									<div className="flex items-center gap-2">
										{kind === "ASSET" ? <Icon icon={Locked} /> : null}
										<p className="flex-1 font-medium">{item.label}</p>
										<Badge variant={item.done ? "default" : "outline"}>
											{item.done
												? kind === "ASSET"
													? "recibido"
													: "respondido"
												: "pendiente"}
										</Badge>
									</div>
									{item.answer ? (
										<p className="mt-1 text-muted-foreground text-xs">
											{item.answer}
										</p>
									) : null}
									{canEdit && !item.done ? (
										kind === "QUESTION" ? (
											<form
												className="mt-2 flex gap-2"
												onSubmit={(event) => {
													event.preventDefault();
													onAnswer(item.id, drafts[item.id] ?? "");
												}}
											>
												<Input
													value={drafts[item.id] ?? ""}
													onChange={(event) =>
														setDrafts((current) => ({
															...current,
															[item.id]: event.target.value,
														}))
													}
													placeholder="Respuesta"
													aria-label={item.label}
													required
												/>
												<Button type="submit" size="sm" variant="outline">
													Responder
												</Button>
											</form>
										) : (
											<Button
												className="mt-2"
												size="sm"
												variant="outline"
												onClick={() => onAnswer(item.id, "")}
											>
												Marcar como entregado
											</Button>
										)
									) : null}
								</div>
							))}
					</div>
				))}
			</div>
		</section>
	);
}

export function RealOnboarding({
	projectId,
	canEdit,
}: {
	projectId: string;
	canEdit: boolean;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const onError = useError();
	const { data } = useQuery(trpc.flowPortal.get.queryOptions({ projectId }));
	const [label, setLabel] = useState("");
	const [kind, setKind] = useState<"QUESTION" | "ASSET">("QUESTION");
	const answer = useMutation(
		trpc.flowPortal.answerOnboardingItem.mutationOptions({
			onSuccess: () => cache.flow(),
			onError,
		}),
	);
	const create = useMutation(
		trpc.flowPortal.createOnboardingItem.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setLabel("");
			},
			onError,
		}),
	);
	if (!data) return null;
	return (
		<div className="space-y-6">
			<OnboardingView
				items={data.onboarding}
				canEdit={canEdit}
				onAnswer={(id, value) =>
					answer.mutate({ id, answer: value, done: true })
				}
			/>
			{canEdit ? (
				<form
					className="flex flex-wrap gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						create.mutate({ projectId, kind, label: label.trim() });
					}}
				>
					<Select
						value={kind}
						onValueChange={(value) =>
							setKind(value === "ASSET" ? "ASSET" : "QUESTION")
						}
					>
						<SelectTrigger className="w-40" aria-label="Tipo">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="QUESTION">Pregunta</SelectItem>
							<SelectItem value="ASSET">Acceso</SelectItem>
						</SelectContent>
					</Select>
					<Input
						value={label}
						onChange={(event) => setLabel(event.target.value)}
						placeholder="Nueva pregunta o acceso a pedir"
						aria-label="Nuevo ítem"
						className="min-w-60 flex-1"
						required
						maxLength={300}
					/>
					<Button type="submit" disabled={!label.trim() || create.isPending}>
						Agregar
					</Button>
				</form>
			) : null}
		</div>
	);
}

export function TicketsView({
	tickets,
	onCreate,
	onResolve,
	askName,
}: {
	tickets: GuestPortal["tickets"];
	onCreate: (name: string, title: string, body: string) => void;
	onResolve?: (id: string, status: "OPEN" | "RESOLVED") => void;
	askName: boolean;
}) {
	const [name, setName] = useState("");
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">Incidencias</h2>
			{tickets.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No hay incidencias abiertas.
				</p>
			) : null}
			{tickets.map((ticket) => (
				<div
					key={ticket.id}
					className="flex items-start gap-2 rounded-md border bg-card p-3 text-sm"
				>
					<div className="min-w-0 flex-1">
						<p className="font-medium">{ticket.title}</p>
						{ticket.body ? (
							<p className="text-muted-foreground text-xs">{ticket.body}</p>
						) : null}
						<p className="text-muted-foreground text-xs">
							{ticket.author} ·{" "}
							{new Date(ticket.createdAt).toLocaleString("es")}
						</p>
					</div>
					<Badge
						variant={ticket.status === "RESOLVED" ? "default" : "secondary"}
					>
						{ticket.status === "RESOLVED" ? "resuelta" : "abierta"}
					</Badge>
					{onResolve ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								onResolve(
									ticket.id,
									ticket.status === "RESOLVED" ? "OPEN" : "RESOLVED",
								)
							}
						>
							{ticket.status === "RESOLVED" ? "Reabrir" : "Resolver"}
						</Button>
					) : null}
				</div>
			))}
			<form
				className="grid gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					onCreate(name.trim(), title.trim(), body.trim());
					setTitle("");
					setBody("");
				}}
			>
				{askName ? (
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Tu nombre"
						aria-label="Tu nombre"
						required
					/>
				) : null}
				<Input
					value={title}
					onChange={(event) => setTitle(event.target.value)}
					placeholder="Título de la incidencia"
					aria-label="Título"
					required
					maxLength={200}
				/>
				<Textarea
					value={body}
					onChange={(event) => setBody(event.target.value)}
					placeholder="Detalle (opcional)"
					aria-label="Detalle"
					rows={2}
				/>
				<Button
					type="submit"
					className="justify-self-start"
					disabled={!title.trim() || (askName && !name.trim())}
				>
					Abrir incidencia
				</Button>
			</form>
		</section>
	);
}

export function RealSupport({
	projectId,
	canEdit,
}: {
	projectId: string;
	canEdit: boolean;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const onError = useError();
	const { data } = useQuery(trpc.flowPortal.get.queryOptions({ projectId }));
	const create = useMutation(
		trpc.flowPortal.createTicket.mutationOptions({
			onSuccess: () => cache.flow(),
			onError,
		}),
	);
	const update = useMutation(
		trpc.flowPortal.updateTicket.mutationOptions({
			onSuccess: () => cache.flow(),
			onError,
		}),
	);
	if (!data) return null;
	return (
		<TicketsView
			tickets={data.tickets}
			askName={false}
			onCreate={(_, title, body) => create.mutate({ projectId, title, body })}
			onResolve={
				canEdit ? (id, status) => update.mutate({ id, status }) : undefined
			}
		/>
	);
}

export function RealDocs({
	projectId,
	canEdit,
	isAdmin,
}: {
	projectId: string;
	canEdit: boolean;
	isAdmin: boolean;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const onError = useError();
	const { data } = useQuery(trpc.flowPortal.get.queryOptions({ projectId }));
	const [decision, setDecision] = useState({ title: "", why: "" });
	const [secretForm, setSecretForm] = useState({
		name: "",
		username: "",
		value: "",
	});
	const [revealed, setRevealed] = useState<Record<string, string>>({});
	const createDecision = useMutation(
		trpc.flowPortal.createDecision.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setDecision({ title: "", why: "" });
			},
			onError,
		}),
	);
	const removeDecision = useMutation(
		trpc.flowPortal.removeDecision.mutationOptions({
			onSuccess: () => cache.flow(),
			onError,
		}),
	);
	const setSecret = useMutation(
		trpc.flowPortal.setSecret.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setSecretForm({ name: "", username: "", value: "" });
				toast.success("Acceso guardado cifrado.");
			},
			onError,
		}),
	);
	const removeSecret = useMutation(
		trpc.flowPortal.removeSecret.mutationOptions({
			onSuccess: () => cache.flow(),
			onError,
		}),
	);
	const queryClient = useQueryClient();
	const reveal = (id: string) =>
		queryClient
			.fetchQuery({
				...trpc.flowPortal.revealSecret.queryOptions({ id }),
				gcTime: 0,
			})
			.then((result) =>
				setRevealed((current) => ({ ...current, [id]: result.value })),
			)
			.catch(onError);
	if (!data) return null;
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<section className="space-y-3">
				<h2 className="font-medium text-sm">Decisiones</h2>
				{data.decisions.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Anotá acá por qué se decide cada cosa.
					</p>
				) : null}
				{data.decisions.map((entry) => (
					<div
						key={entry.id}
						className="flex items-start gap-2 rounded-md border bg-card p-3 text-sm"
					>
						<div className="min-w-0 flex-1">
							<p className="font-medium">{entry.title}</p>
							<p className="text-muted-foreground text-xs">
								{new Date(entry.decidedAt).toLocaleDateString("es")} ·{" "}
								{entry.author}
							</p>
							<p className="mt-1 text-xs">{entry.why}</p>
						</div>
						{canEdit ? (
							<Button
								variant="ghost"
								size="icon"
								aria-label="Quitar decisión"
								onClick={() => removeDecision.mutate({ id: entry.id })}
							>
								<Icon icon={Close} />
							</Button>
						) : null}
					</div>
				))}
				{canEdit ? (
					<form
						className="grid gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							createDecision.mutate({
								projectId,
								title: decision.title.trim(),
								why: decision.why.trim(),
							});
						}}
					>
						<Input
							value={decision.title}
							onChange={(event) =>
								setDecision((current) => ({
									...current,
									title: event.target.value,
								}))
							}
							placeholder="Qué se decidió"
							aria-label="Decisión"
							required
							maxLength={200}
						/>
						<Textarea
							value={decision.why}
							onChange={(event) =>
								setDecision((current) => ({
									...current,
									why: event.target.value,
								}))
							}
							placeholder="Por qué"
							aria-label="Motivo"
							rows={2}
							required
						/>
						<Button
							type="submit"
							className="justify-self-start"
							disabled={
								!decision.title.trim() ||
								!decision.why.trim() ||
								createDecision.isPending
							}
						>
							Registrar
						</Button>
					</form>
				) : null}
			</section>
			{isAdmin ? (
				<section className="space-y-3">
					<h2 className="font-medium text-sm">Bóveda de accesos</h2>
					{data.secrets.map((entry) => (
						<div
							key={entry.id}
							className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm"
						>
							<Icon icon={Locked} />
							<div className="min-w-0 flex-1">
								<p className="font-medium">{entry.name}</p>
								<p className="truncate text-muted-foreground text-xs">
									{entry.username ?? ""}{" "}
									{revealed[entry.id]
										? `· ${revealed[entry.id]}`
										: "· •••••••••"}
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void reveal(entry.id)}
							>
								Ver
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Quitar acceso"
								onClick={() => removeSecret.mutate({ id: entry.id })}
							>
								<Icon icon={Close} />
							</Button>
						</div>
					))}
					<form
						className="grid gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							setSecret.mutate({
								projectId,
								name: secretForm.name.trim(),
								username: secretForm.username.trim(),
								value: secretForm.value,
							});
						}}
					>
						<Input
							value={secretForm.name}
							onChange={(event) =>
								setSecretForm((current) => ({
									...current,
									name: event.target.value,
								}))
							}
							placeholder="Servicio (Meta, Google Ads, WordPress…)"
							aria-label="Servicio"
							required
						/>
						<Input
							value={secretForm.username}
							onChange={(event) =>
								setSecretForm((current) => ({
									...current,
									username: event.target.value,
								}))
							}
							placeholder="Usuario"
							aria-label="Usuario"
						/>
						<Input
							type="password"
							value={secretForm.value}
							onChange={(event) =>
								setSecretForm((current) => ({
									...current,
									value: event.target.value,
								}))
							}
							placeholder="Contraseña o token"
							aria-label="Secreto"
							required
						/>
						<Button
							type="submit"
							className="justify-self-start"
							disabled={
								!secretForm.name.trim() ||
								!secretForm.value ||
								setSecret.isPending
							}
						>
							Guardar cifrado
						</Button>
					</form>
				</section>
			) : null}
		</div>
	);
}

export function GuestPortal({ token }: { token: string }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const onError = useError();
	const { data } = useQuery(
		trpc.flowPortal.guestPortal.queryOptions({ token }),
	);
	const answer = useMutation(
		trpc.flowPortal.guestAnswer.mutationOptions({
			onSuccess: () => cache.flow(),
			onError,
		}),
	);
	const ticket = useMutation(
		trpc.flowPortal.guestTicket.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				toast.success("Incidencia enviada al equipo.");
			},
			onError,
		}),
	);
	if (!data) return null;
	return (
		<div className="space-y-8">
			<GuestMilestones token={token} data={data} />
			<SummaryView metrics={data.metrics} />
			<OnboardingView
				items={data.onboarding}
				canEdit
				onAnswer={(id, value) =>
					answer.mutate({ token, itemId: id, answer: value })
				}
			/>
			<TicketsView
				tickets={data.tickets}
				askName
				onCreate={(name, title, body) =>
					ticket.mutate({ token, name, title, body })
				}
			/>
		</div>
	);
}
