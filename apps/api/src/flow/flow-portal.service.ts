import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";
import { type Db, Prisma as PrismaNamespace } from "@crm/db";
import {
	ForbiddenException,
	Injectable,
	NotFoundException,
	ServiceUnavailableException,
} from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import { FlowService } from "./flow.service";
import {
	deliverables as deliverablesSchema,
	type GuestPortal,
	type Metric,
	type MetricUpsertInput,
	type Milestone,
	type MilestoneCreateInput,
	type MilestoneUpdateInput,
	type OnboardingItem,
	type Portal,
} from "./flow-portal.contracts";

const DEFAULT_MILESTONES = [
	{
		title: "Kick-off y plan de campaña",
		deliverables: [
			"Customer journey",
			"Mapa de campañas",
			"Ángulos y objeciones",
		],
	},
	{
		title: "Creativos y landing",
		deliverables: ["Anuncios", "Landing", "Emails"],
	},
	{
		title: "Lanzamiento",
		deliverables: ["Campañas activas", "Pixel y CAPI verificados"],
	},
	{
		title: "Optimización",
		deliverables: ["Informe de CPA por cita", "Nuevos creativos"],
	},
] as const;

const DEFAULT_ONBOARDING = [
	{ kind: "QUESTION", label: "¿Cuál es el objetivo principal de la campaña?" },
	{ kind: "QUESTION", label: "¿Ticket medio y margen por venta?" },
	{ kind: "QUESTION", label: "¿Zona geográfica de captación?" },
	{ kind: "QUESTION", label: "Casos de éxito y testimonios disponibles" },
	{ kind: "ASSET", label: "Acceso a Meta Business Manager (socio)" },
	{ kind: "ASSET", label: "Pixel / Dataset de Meta" },
	{ kind: "ASSET", label: "Acceso a Google Ads (administrador)" },
	{ kind: "ASSET", label: "GA4 y dominio de la landing" },
	{ kind: "ASSET", label: "Acceso al CRM" },
] as const;

type MilestoneRow = PrismaNamespace.FlowMilestoneGetPayload<{
	select: undefined;
}>;
type MetricRow = PrismaNamespace.FlowMetricGetPayload<{ select: undefined }>;
type OnboardingRow = PrismaNamespace.FlowOnboardingItemGetPayload<{
	select: undefined;
}>;
type DecisionRow = PrismaNamespace.FlowDecisionGetPayload<{
	select: undefined;
}>;
type TicketRow = PrismaNamespace.FlowTicketGetPayload<{ select: undefined }>;
type SecretRow = PrismaNamespace.FlowSecretGetPayload<{ select: undefined }>;

const iso = (value: Date | null): string | null =>
	value ? value.toISOString() : null;

function milestone(row: MilestoneRow): Milestone {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		dueAt: iso(row.dueAt),
		position: row.position,
		status: row.status,
		deliverables: deliverablesSchema.catch([]).parse(row.deliverables),
		approvedAt: iso(row.approvedAt),
		approvedBy: row.approvedBy,
	};
}

function metric(row: MetricRow): Metric {
	return {
		id: row.id,
		weekStart: row.weekStart.toISOString().slice(0, 10),
		spend: row.spend,
		leads: row.leads,
		booked: row.booked,
		attended: row.attended,
		sales: row.sales,
		notes: row.notes,
	};
}

function onboarding(row: OnboardingRow): OnboardingItem {
	return {
		id: row.id,
		kind: row.kind,
		label: row.label,
		answer: row.answer,
		done: row.done,
		position: row.position,
	};
}

function decision(row: DecisionRow) {
	return {
		id: row.id,
		title: row.title,
		why: row.why,
		author: row.author,
		decidedAt: row.decidedAt.toISOString(),
	};
}

function ticket(row: TicketRow) {
	return {
		id: row.id,
		title: row.title,
		body: row.body,
		author: row.author,
		status: row.status,
		createdAt: row.createdAt.toISOString(),
	};
}

function secret(row: SecretRow) {
	return {
		id: row.id,
		name: row.name,
		username: row.username,
		updatedAt: row.updatedAt.toISOString(),
	};
}

function vaultKey(): Buffer {
	const raw = process.env.FLOW_VAULT_KEY;
	if (!raw)
		throw new ServiceUnavailableException(
			"La bóveda no está configurada (FLOW_VAULT_KEY).",
		);
	return createHash("sha256").update(raw).digest();
}

function encrypt(value: string): { ciphertext: string; iv: string } {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
	const encrypted = Buffer.concat([
		cipher.update(value, "utf8"),
		cipher.final(),
	]);
	return {
		ciphertext: Buffer.concat([encrypted, cipher.getAuthTag()]).toString(
			"base64",
		),
		iv: iv.toString("base64"),
	};
}

function decrypt(ciphertext: string, iv: string): string {
	const data = Buffer.from(ciphertext, "base64");
	const decipher = createDecipheriv(
		"aes-256-gcm",
		vaultKey(),
		Buffer.from(iv, "base64"),
	);
	decipher.setAuthTag(data.subarray(data.length - 16));
	return Buffer.concat([
		decipher.update(data.subarray(0, data.length - 16)),
		decipher.final(),
	]).toString("utf8");
}

@Injectable()
export class FlowPortalService {
	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly flow: FlowService,
	) {}

	async portal(projectId: string, userId: string): Promise<Portal> {
		const project = await this.flow.getProject(projectId, userId);
		await this.ensureDefaults(projectId);
		const [milestones, metrics, items, decisions, tickets, secrets] =
			await Promise.all([
				this.db.flowMilestone.findMany({
					where: { projectId },
					orderBy: { position: "asc" },
				}),
				this.db.flowMetric.findMany({
					where: { projectId },
					orderBy: { weekStart: "asc" },
					take: 26,
				}),
				this.db.flowOnboardingItem.findMany({
					where: { projectId },
					orderBy: { position: "asc" },
				}),
				this.db.flowDecision.findMany({
					where: { projectId },
					orderBy: { decidedAt: "desc" },
					take: 100,
				}),
				this.db.flowTicket.findMany({
					where: { projectId },
					orderBy: { createdAt: "desc" },
					take: 100,
				}),
				project.role === "ADMIN"
					? this.db.flowSecret.findMany({
							where: { projectId },
							orderBy: { name: "asc" },
						})
					: Promise.resolve([]),
			]);
		return {
			milestones: milestones.map(milestone),
			metrics: metrics.map(metric),
			onboarding: items.map(onboarding),
			decisions: decisions.map(decision),
			tickets: tickets.map(ticket),
			secrets: secrets.map(secret),
		};
	}

	async createMilestone(
		input: MilestoneCreateInput,
		userId: string,
	): Promise<Milestone> {
		await this.editor(input.projectId, userId);
		const position = await this.db.flowMilestone.count({
			where: { projectId: input.projectId },
		});
		const row = await this.db.flowMilestone.create({
			data: {
				projectId: input.projectId,
				title: input.title,
				description: input.description || null,
				dueAt: input.dueAt ? new Date(input.dueAt) : null,
				deliverables: input.deliverables,
				position,
			},
		});
		return milestone(row);
	}

	async updateMilestone(
		input: MilestoneUpdateInput,
		userId: string,
	): Promise<Milestone> {
		const existing = await this.db.flowMilestone.findUnique({
			where: { id: input.id },
			select: { projectId: true },
		});
		if (!existing)
			throw new NotFoundException(`No existe el hito ${input.id}.`);
		await this.editor(existing.projectId, userId);
		const row = await this.db.flowMilestone.update({
			where: { id: input.id },
			data: {
				title: input.title,
				description:
					input.description === undefined
						? undefined
						: input.description || null,
				dueAt:
					input.dueAt === undefined
						? undefined
						: input.dueAt
							? new Date(input.dueAt)
							: null,
				status: input.status,
				deliverables: input.deliverables,
				approvedAt:
					input.status && input.status !== "APPROVED" ? null : undefined,
				approvedBy:
					input.status && input.status !== "APPROVED" ? null : undefined,
			},
		});
		return milestone(row);
	}

	async removeMilestone(id: string, userId: string): Promise<{ id: string }> {
		const existing = await this.db.flowMilestone.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!existing) throw new NotFoundException(`No existe el hito ${id}.`);
		await this.editor(existing.projectId, userId);
		await this.db.flowMilestone.delete({ where: { id } });
		return { id };
	}

	async upsertMetric(
		input: MetricUpsertInput,
		userId: string,
	): Promise<Metric> {
		await this.editor(input.projectId, userId);
		const weekStart = new Date(`${input.weekStart}T00:00:00.000Z`);
		const data = {
			spend: input.spend,
			leads: input.leads,
			booked: input.booked,
			attended: input.attended,
			sales: input.sales,
			notes: input.notes || null,
		};
		const row = await this.db.flowMetric.upsert({
			where: { projectId_weekStart: { projectId: input.projectId, weekStart } },
			update: data,
			create: { projectId: input.projectId, weekStart, ...data },
		});
		return metric(row);
	}

	async removeMetric(id: string, userId: string): Promise<{ id: string }> {
		const existing = await this.db.flowMetric.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!existing) throw new NotFoundException(`No existe la métrica ${id}.`);
		await this.editor(existing.projectId, userId);
		await this.db.flowMetric.delete({ where: { id } });
		return { id };
	}

	async createOnboardingItem(
		projectId: string,
		kind: "QUESTION" | "ASSET",
		label: string,
		userId: string,
	): Promise<OnboardingItem> {
		await this.editor(projectId, userId);
		const position = await this.db.flowOnboardingItem.count({
			where: { projectId },
		});
		return onboarding(
			await this.db.flowOnboardingItem.create({
				data: { projectId, kind, label, position },
			}),
		);
	}

	async answerOnboardingItem(
		id: string,
		answer: string,
		done: boolean | undefined,
		userId: string,
	): Promise<OnboardingItem> {
		const existing = await this.db.flowOnboardingItem.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!existing) throw new NotFoundException(`No existe el ítem ${id}.`);
		await this.editor(existing.projectId, userId);
		return onboarding(
			await this.db.flowOnboardingItem.update({
				where: { id },
				data: { answer: answer || null, done: done ?? answer.length > 0 },
			}),
		);
	}

	async removeOnboardingItem(
		id: string,
		userId: string,
	): Promise<{ id: string }> {
		const existing = await this.db.flowOnboardingItem.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!existing) throw new NotFoundException(`No existe el ítem ${id}.`);
		await this.editor(existing.projectId, userId);
		await this.db.flowOnboardingItem.delete({ where: { id } });
		return { id };
	}

	async createDecision(
		projectId: string,
		title: string,
		why: string,
		userId: string,
	) {
		await this.editor(projectId, userId);
		const user = await this.db.user.findUnique({
			where: { id: userId },
			select: { name: true },
		});
		return decision(
			await this.db.flowDecision.create({
				data: { projectId, title, why, author: user?.name ?? "Equipo" },
			}),
		);
	}

	async removeDecision(id: string, userId: string): Promise<{ id: string }> {
		const existing = await this.db.flowDecision.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!existing) throw new NotFoundException(`No existe la decisión ${id}.`);
		await this.editor(existing.projectId, userId);
		await this.db.flowDecision.delete({ where: { id } });
		return { id };
	}

	async createTicket(
		projectId: string,
		title: string,
		body: string,
		userId: string,
	) {
		await this.flow.getProject(projectId, userId);
		const user = await this.db.user.findUnique({
			where: { id: userId },
			select: { name: true },
		});
		return ticket(
			await this.db.flowTicket.create({
				data: {
					projectId,
					title,
					body: body || null,
					author: user?.name ?? "Equipo",
				},
			}),
		);
	}

	async updateTicket(id: string, status: "OPEN" | "RESOLVED", userId: string) {
		const existing = await this.db.flowTicket.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!existing)
			throw new NotFoundException(`No existe la incidencia ${id}.`);
		await this.editor(existing.projectId, userId);
		return ticket(
			await this.db.flowTicket.update({ where: { id }, data: { status } }),
		);
	}

	async setSecret(
		projectId: string,
		name: string,
		username: string,
		value: string,
		userId: string,
	) {
		await this.admin(projectId, userId);
		const encrypted = encrypt(value);
		const existing = await this.db.flowSecret.findFirst({
			where: { projectId, name },
			select: { id: true },
		});
		const row = existing
			? await this.db.flowSecret.update({
					where: { id: existing.id },
					data: { username: username || null, ...encrypted },
				})
			: await this.db.flowSecret.create({
					data: { projectId, name, username: username || null, ...encrypted },
				});
		return secret(row);
	}

	async revealSecret(id: string, userId: string): Promise<{ value: string }> {
		const row = await this.db.flowSecret.findUnique({ where: { id } });
		if (!row) throw new NotFoundException(`No existe el acceso ${id}.`);
		await this.admin(row.projectId, userId);
		return { value: decrypt(row.ciphertext, row.iv) };
	}

	async removeSecret(id: string, userId: string): Promise<{ id: string }> {
		const row = await this.db.flowSecret.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!row) throw new NotFoundException(`No existe el acceso ${id}.`);
		await this.admin(row.projectId, userId);
		await this.db.flowSecret.delete({ where: { id } });
		return { id };
	}

	async guestPortal(token: string): Promise<GuestPortal> {
		const projectId = await this.guestProject(token);
		await this.ensureDefaults(projectId);
		const [milestones, metrics, items, tickets] = await Promise.all([
			this.db.flowMilestone.findMany({
				where: { projectId },
				orderBy: { position: "asc" },
			}),
			this.db.flowMetric.findMany({
				where: { projectId },
				orderBy: { weekStart: "asc" },
				take: 26,
			}),
			this.db.flowOnboardingItem.findMany({
				where: { projectId },
				orderBy: { position: "asc" },
			}),
			this.db.flowTicket.findMany({
				where: { projectId },
				orderBy: { createdAt: "desc" },
				take: 50,
			}),
		]);
		return {
			milestones: milestones.map(milestone),
			metrics: metrics.map(metric),
			onboarding: items.map(onboarding),
			tickets: tickets.map(ticket),
		};
	}

	async guestApprove(
		token: string,
		milestoneId: string,
		name: string,
	): Promise<Milestone> {
		const projectId = await this.guestProject(token);
		const row = await this.db.flowMilestone.findUnique({
			where: { id: milestoneId },
		});
		if (!row || row.projectId !== projectId)
			throw new NotFoundException("No existe ese hito.");
		if (row.status !== "DELIVERED")
			throw new ForbiddenException("Solo se aprueban hitos entregados.");
		return milestone(
			await this.db.flowMilestone.update({
				where: { id: milestoneId },
				data: { status: "APPROVED", approvedAt: new Date(), approvedBy: name },
			}),
		);
	}

	async guestAnswer(
		token: string,
		itemId: string,
		answer: string,
	): Promise<OnboardingItem> {
		const projectId = await this.guestProject(token);
		const row = await this.db.flowOnboardingItem.findUnique({
			where: { id: itemId },
			select: { projectId: true, kind: true },
		});
		if (!row || row.projectId !== projectId)
			throw new NotFoundException("No existe ese ítem.");
		return onboarding(
			await this.db.flowOnboardingItem.update({
				where: { id: itemId },
				data: {
					answer: row.kind === "ASSET" ? null : answer || null,
					done: true,
				},
			}),
		);
	}

	async guestTicket(token: string, name: string, title: string, body: string) {
		const projectId = await this.guestProject(token);
		return ticket(
			await this.db.flowTicket.create({
				data: { projectId, title, body: body || null, author: name },
			}),
		);
	}

	private async guestProject(token: string): Promise<string> {
		const hash = createHash("sha256").update(token).digest("hex");
		const link = await this.db.flowGuestLink.findUnique({
			where: { tokenHash: hash },
			select: { projectId: true, revokedAt: true },
		});
		if (!link || link.revokedAt)
			throw new NotFoundException("Este enlace ya no está activo.");
		return link.projectId;
	}

	private async ensureDefaults(projectId: string): Promise<void> {
		const [milestones, items] = await Promise.all([
			this.db.flowMilestone.count({ where: { projectId } }),
			this.db.flowOnboardingItem.count({ where: { projectId } }),
		]);
		if (milestones === 0) {
			await this.db.flowMilestone.createMany({
				data: DEFAULT_MILESTONES.map((item, position) => ({
					projectId,
					title: item.title,
					position,
					deliverables: item.deliverables.map((label) => ({ label, url: "" })),
				})),
			});
		}
		if (items === 0) {
			await this.db.flowOnboardingItem.createMany({
				data: DEFAULT_ONBOARDING.map((item, position) => ({
					projectId,
					kind: item.kind,
					label: item.label,
					position,
				})),
			});
		}
	}

	private async editor(projectId: string, userId: string): Promise<void> {
		const project = await this.flow.getProject(projectId, userId);
		if (project.role === "VIEWER")
			throw new ForbiddenException(
				"Con acceso de solo lectura no se puede editar.",
			);
	}

	private async admin(projectId: string, userId: string): Promise<void> {
		const project = await this.flow.getProject(projectId, userId);
		if (project.role !== "ADMIN")
			throw new ForbiddenException(
				"Solo un admin del proyecto puede hacer eso.",
			);
	}
}
