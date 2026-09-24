import { createHash, randomBytes } from "node:crypto";
import { type Db, Prisma as PrismaNamespace } from "@crm/db";
import {
	EMPTY_FLOW_DOCUMENT,
	type FlowCanvasDocument,
	flowCompleteness,
	parseFlowCanvasDocument,
	stripFlowInternalFields,
} from "@crm/validation/flow-canvas";
import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import type {
	FlowAsset,
	FlowAssetCreateInput,
	FlowAssetUpdateInput,
	FlowCanvas,
	FlowCanvasCreateInput,
	FlowCanvasSummary,
	FlowCanvasUpdateInput,
	FlowChecklist,
	FlowChecklistItemUpdateInput,
	FlowGuestView,
	FlowProject,
	FlowProjectCreateInput,
	FlowProjectSummary,
	FlowProjectUpdateInput,
	FlowRole,
} from "./flow.contracts";
import { FLOW_DEMO_PROJECTS } from "./flow-demo";

const companySelect = { id: true, name: true, logoUrl: true } as const;

const checklistInclude = {
	items: { orderBy: { createdAt: "asc" } },
} as const satisfies PrismaNamespace.FlowChecklistInclude;

const projectInclude = {
	company: { select: companySelect },
	members: {
		include: {
			user: { select: { id: true, name: true, email: true, image: true } },
		},
		orderBy: { createdAt: "asc" },
	},
	canvases: { orderBy: { createdAt: "asc" } },
	assets: { orderBy: { createdAt: "desc" } },
	checklists: { include: checklistInclude, orderBy: { createdAt: "asc" } },
	guestLinks: { where: { revokedAt: null }, select: { id: true } },
} as const satisfies PrismaNamespace.FlowProjectInclude;

type ProjectRow = PrismaNamespace.FlowProjectGetPayload<{
	include: typeof projectInclude;
}>;

type CanvasRow = PrismaNamespace.FlowCanvasGetPayload<{ select: undefined }>;

type AssetRow = PrismaNamespace.FlowAssetGetPayload<{ select: undefined }>;

type ChecklistRow = PrismaNamespace.FlowChecklistGetPayload<{
	include: typeof checklistInclude;
}>;

type CompanyRow = { id: string; name: string; logoUrl: string | null } | null;

function tokenHash(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function company(row: CompanyRow): FlowProject["company"] {
	return row ? { id: row.id, name: row.name, iconUrl: row.logoUrl } : null;
}

function canvasSummary(row: CanvasRow): FlowCanvasSummary {
	return {
		id: row.id,
		type: row.type,
		name: row.name,
		channel: row.channel,
		completeness: row.completeness,
		nodeCount: parseFlowCanvasDocument(row.document).nodes.length,
		updatedAt: row.updatedAt.toISOString(),
	};
}

function asset(row: AssetRow): FlowAsset {
	return {
		id: row.id,
		kind: row.kind,
		title: row.title,
		url: row.url,
		notes: row.notes,
		tags: row.tags,
		createdAt: row.createdAt.toISOString(),
	};
}

function checklist(row: ChecklistRow): FlowChecklist {
	return {
		id: row.id,
		title: row.title,
		items: row.items.map((item) => ({
			id: item.id,
			text: item.text,
			done: item.done,
		})),
	};
}

function blank(value: string | undefined): string | null | undefined {
	return value === undefined ? undefined : value || null;
}

@Injectable()
export class FlowService {
	constructor(@InjectDatabase() private readonly db: Db) {}

	async listProjects(userId: string): Promise<FlowProjectSummary[]> {
		const rows = await this.db.flowProject.findMany({
			where: { members: { some: { userId } } },
			include: {
				company: { select: companySelect },
				members: { where: { userId }, select: { role: true } },
				canvases: { select: { completeness: true } },
			},
			orderBy: { updatedAt: "desc" },
		});

		return rows.map((row) => {
			const total = row.canvases.reduce(
				(sum, canvas) => sum + canvas.completeness,
				0,
			);
			return {
				id: row.id,
				name: row.name,
				description: row.description,
				color: row.color,
				company: company(row.company),
				role: row.members[0]?.role ?? "VIEWER",
				canvasCount: row.canvases.length,
				completeness:
					row.canvases.length === 0
						? 0
						: Math.round(total / row.canvases.length),
				updatedAt: row.updatedAt.toISOString(),
			};
		});
	}

	async getProject(id: string, userId: string): Promise<FlowProject> {
		const role = await this.access(id, userId);
		const row = await this.db.flowProject.findUnique({
			where: { id },
			include: projectInclude,
		});
		if (!row) throw new NotFoundException(`No flow project with id ${id}.`);

		return this.serializeProject(row, role);
	}

	async createProject(
		input: FlowProjectCreateInput,
		userId: string,
	): Promise<FlowProject> {
		try {
			const row = await this.db.flowProject.create({
				data: {
					name: input.name,
					description: input.description || null,
					companyId: input.companyId,
					createdById: userId,
					members: { create: { userId, role: "ADMIN" } },
				},
				include: projectInclude,
			});

			return this.serializeProject(row, "ADMIN");
		} catch (error) {
			throw this.translate(error);
		}
	}

	async updateProject(
		input: FlowProjectUpdateInput,
		userId: string,
	): Promise<FlowProject> {
		const role = await this.access(input.id, userId);
		this.assertAdmin(role);

		try {
			const row = await this.db.flowProject.update({
				where: { id: input.id },
				data: {
					name: input.name,
					description: blank(input.description),
					companyId: input.companyId,
					color: input.color,
				},
				include: projectInclude,
			});

			return this.serializeProject(row, role);
		} catch (error) {
			throw this.translate(error);
		}
	}

	async removeProject(id: string, userId: string): Promise<{ id: string }> {
		this.assertAdmin(await this.access(id, userId));
		await this.db.flowProject.delete({ where: { id } });
		return { id };
	}

	async setMember(
		projectId: string,
		targetUserId: string,
		role: FlowRole,
		userId: string,
	): Promise<FlowProject> {
		this.assertAdmin(await this.access(projectId, userId));
		if (role !== "ADMIN")
			await this.assertNotLastAdmin(projectId, targetUserId);

		await this.db.flowMember.upsert({
			where: { projectId_userId: { projectId, userId: targetUserId } },
			update: { role },
			create: { projectId, userId: targetUserId, role },
		});

		return this.getProject(projectId, userId);
	}

	async removeMember(
		projectId: string,
		targetUserId: string,
		userId: string,
	): Promise<FlowProject> {
		this.assertAdmin(await this.access(projectId, userId));
		await this.assertNotLastAdmin(projectId, targetUserId);
		await this.db.flowMember.deleteMany({
			where: { projectId, userId: targetUserId },
		});

		return this.getProject(projectId, userId);
	}

	async createCanvas(
		input: FlowCanvasCreateInput,
		userId: string,
	): Promise<FlowCanvasSummary> {
		this.assertEditor(await this.access(input.projectId, userId));
		const row = await this.db.flowCanvas.create({
			data: {
				projectId: input.projectId,
				type: input.type,
				name: input.name,
				channel: input.channel || null,
				document: EMPTY_FLOW_DOCUMENT,
			},
		});
		await this.touch(input.projectId);

		return canvasSummary(row);
	}

	async getCanvas(id: string, userId: string): Promise<FlowCanvas> {
		const row = await this.db.flowCanvas.findUnique({
			where: { id },
			include: { project: { select: { name: true } } },
		});
		if (!row) throw new NotFoundException(`No flow canvas with id ${id}.`);
		const role = await this.access(row.projectId, userId);

		return {
			id: row.id,
			projectId: row.projectId,
			projectName: row.project.name,
			type: row.type,
			name: row.name,
			channel: row.channel,
			document: parseFlowCanvasDocument(row.document),
			completeness: row.completeness,
			canEdit: role !== "VIEWER",
			updatedAt: row.updatedAt.toISOString(),
		};
	}

	async saveCanvas(
		id: string,
		document: FlowCanvasDocument,
		userId: string,
	): Promise<{ id: string; completeness: number; updatedAt: string }> {
		await this.canvasEditor(id, userId);
		const completeness = flowCompleteness(document);
		const row = await this.db.flowCanvas.update({
			where: { id },
			data: { document, completeness },
		});
		await this.touch(row.projectId);

		return { id, completeness, updatedAt: row.updatedAt.toISOString() };
	}

	async updateCanvas(
		input: FlowCanvasUpdateInput,
		userId: string,
	): Promise<FlowCanvasSummary> {
		await this.canvasEditor(input.id, userId);
		const row = await this.db.flowCanvas.update({
			where: { id: input.id },
			data: { name: input.name, channel: blank(input.channel) },
		});

		return canvasSummary(row);
	}

	async removeCanvas(id: string, userId: string): Promise<{ id: string }> {
		await this.canvasEditor(id, userId);
		await this.db.flowCanvas.delete({ where: { id } });
		return { id };
	}

	async createGuestLink(
		projectId: string,
		userId: string,
	): Promise<{ token: string }> {
		this.assertAdmin(await this.access(projectId, userId));
		const token = randomBytes(32).toString("base64url");
		await this.db.$transaction([
			this.db.flowGuestLink.updateMany({
				where: { projectId, revokedAt: null },
				data: { revokedAt: new Date() },
			}),
			this.db.flowGuestLink.create({
				data: { projectId, tokenHash: tokenHash(token) },
			}),
		]);

		return { token };
	}

	async revokeGuestLink(
		projectId: string,
		userId: string,
	): Promise<{ id: string }> {
		this.assertAdmin(await this.access(projectId, userId));
		await this.db.flowGuestLink.updateMany({
			where: { projectId, revokedAt: null },
			data: { revokedAt: new Date() },
		});

		return { id: projectId };
	}

	async guestView(token: string): Promise<FlowGuestView> {
		const link = await this.db.flowGuestLink.findUnique({
			where: { tokenHash: tokenHash(token) },
			include: {
				project: {
					include: {
						company: { select: companySelect },
						canvases: { orderBy: { createdAt: "asc" } },
					},
				},
			},
		});
		if (!link || link.revokedAt) {
			throw new NotFoundException("Este enlace ya no está activo.");
		}

		return {
			project: {
				name: link.project.name,
				description: link.project.description,
				color: link.project.color,
				companyName: link.project.company?.name ?? null,
			},
			canvases: link.project.canvases.map((row) => ({
				id: row.id,
				type: row.type,
				name: row.name,
				channel: row.channel,
				document: stripFlowInternalFields(
					parseFlowCanvasDocument(row.document),
				),
				completeness: row.completeness,
			})),
		};
	}

	async createAsset(
		input: FlowAssetCreateInput,
		userId: string,
	): Promise<FlowAsset> {
		this.assertEditor(await this.access(input.projectId, userId));
		const row = await this.db.flowAsset.create({
			data: {
				projectId: input.projectId,
				kind: input.kind,
				title: input.title,
				url: input.url || null,
				notes: input.notes || null,
				tags: input.tags,
			},
		});

		return asset(row);
	}

	async updateAsset(
		input: FlowAssetUpdateInput,
		userId: string,
	): Promise<FlowAsset> {
		const existing = await this.db.flowAsset.findUnique({
			where: { id: input.id },
			select: { projectId: true },
		});
		if (!existing) {
			throw new NotFoundException(`No flow asset with id ${input.id}.`);
		}
		this.assertEditor(await this.access(existing.projectId, userId));
		const row = await this.db.flowAsset.update({
			where: { id: input.id },
			data: {
				kind: input.kind,
				title: input.title,
				url: blank(input.url),
				notes: blank(input.notes),
				tags: input.tags,
			},
		});

		return asset(row);
	}

	async removeAsset(id: string, userId: string): Promise<{ id: string }> {
		const existing = await this.db.flowAsset.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!existing) throw new NotFoundException(`No flow asset with id ${id}.`);
		this.assertEditor(await this.access(existing.projectId, userId));
		await this.db.flowAsset.delete({ where: { id } });
		return { id };
	}

	async createChecklist(
		projectId: string,
		title: string,
		userId: string,
	): Promise<FlowChecklist> {
		this.assertEditor(await this.access(projectId, userId));
		const row = await this.db.flowChecklist.create({
			data: { projectId, title },
			include: checklistInclude,
		});

		return checklist(row);
	}

	async removeChecklist(id: string, userId: string): Promise<{ id: string }> {
		await this.checklistEditor(id, userId);
		await this.db.flowChecklist.delete({ where: { id } });
		return { id };
	}

	async addChecklistItem(
		checklistId: string,
		text: string,
		userId: string,
	): Promise<FlowChecklist> {
		await this.checklistEditor(checklistId, userId);
		const row = await this.db.flowChecklist.update({
			where: { id: checklistId },
			data: { items: { create: { text } } },
			include: checklistInclude,
		});

		return checklist(row);
	}

	async updateChecklistItem(
		input: FlowChecklistItemUpdateInput,
		userId: string,
	): Promise<FlowChecklist> {
		const item = await this.db.flowChecklistItem.findUnique({
			where: { id: input.id },
			select: { checklistId: true },
		});
		if (!item) {
			throw new NotFoundException(`No checklist item with id ${input.id}.`);
		}
		await this.checklistEditor(item.checklistId, userId);
		await this.db.flowChecklistItem.update({
			where: { id: input.id },
			data: { done: input.done, text: input.text },
		});

		return this.readChecklist(item.checklistId);
	}

	async removeChecklistItem(
		id: string,
		userId: string,
	): Promise<FlowChecklist> {
		const item = await this.db.flowChecklistItem.findUnique({
			where: { id },
			select: { checklistId: true },
		});
		if (!item) throw new NotFoundException(`No checklist item with id ${id}.`);
		await this.checklistEditor(item.checklistId, userId);
		await this.db.flowChecklistItem.delete({ where: { id } });

		return this.readChecklist(item.checklistId);
	}

	async seedDemo(userId: string): Promise<FlowProjectSummary[]> {
		for (const demo of FLOW_DEMO_PROJECTS) {
			const existing = await this.db.flowProject.findFirst({
				where: { name: demo.name, members: { some: { userId } } },
				select: { id: true },
			});
			if (existing) continue;

			const company =
				(await this.db.company.findFirst({
					where: { name: demo.company, archivedAt: null },
					select: { id: true },
				})) ??
				(await this.db.company.create({
					data: { name: demo.company, ownerId: userId },
					select: { id: true },
				}));

			await this.db.flowProject.create({
				data: {
					name: demo.name,
					description: demo.description,
					companyId: company.id,
					createdById: userId,
					members: { create: { userId, role: "ADMIN" } },
					canvases: {
						create: demo.canvases.map((canvas) => ({
							type: canvas.type,
							name: canvas.name,
							channel: canvas.channel || null,
							document: canvas.document,
							completeness: flowCompleteness(canvas.document),
						})),
					},
					assets: { create: demo.assets },
					checklists: {
						create: demo.checklists.map((list) => ({
							title: list.title,
							items: { create: list.items },
						})),
					},
				},
			});
		}

		return this.listProjects(userId);
	}

	private async readChecklist(id: string): Promise<FlowChecklist> {
		const row = await this.db.flowChecklist.findUnique({
			where: { id },
			include: checklistInclude,
		});
		if (!row) throw new NotFoundException(`No checklist with id ${id}.`);
		return checklist(row);
	}

	private serializeProject(row: ProjectRow, role: FlowRole): FlowProject {
		return {
			id: row.id,
			name: row.name,
			description: row.description,
			color: row.color,
			company: company(row.company),
			role,
			members: row.members.map((member) => ({
				userId: member.user.id,
				name: member.user.name,
				email: member.user.email,
				image: member.user.image,
				role: member.role,
			})),
			canvases: row.canvases.map(canvasSummary),
			assets: row.assets.map(asset),
			checklists: row.checklists.map(checklist),
			guestLink: { active: row.guestLinks.length > 0 },
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}

	private async access(projectId: string, userId: string): Promise<FlowRole> {
		const member = await this.db.flowMember.findUnique({
			where: { projectId_userId: { projectId, userId } },
		});
		if (!member) {
			throw new NotFoundException(`No flow project with id ${projectId}.`);
		}
		return member.role;
	}

	private async canvasEditor(id: string, userId: string): Promise<void> {
		const row = await this.db.flowCanvas.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!row) throw new NotFoundException(`No flow canvas with id ${id}.`);
		this.assertEditor(await this.access(row.projectId, userId));
	}

	private async checklistEditor(id: string, userId: string): Promise<void> {
		const row = await this.db.flowChecklist.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!row) throw new NotFoundException(`No checklist with id ${id}.`);
		this.assertEditor(await this.access(row.projectId, userId));
	}

	private async assertNotLastAdmin(
		projectId: string,
		targetUserId: string,
	): Promise<void> {
		const admins = await this.db.flowMember.findMany({
			where: { projectId, role: "ADMIN" },
			select: { userId: true },
		});
		if (admins.length === 1 && admins[0]?.userId === targetUserId) {
			throw new ConflictException("El proyecto necesita al menos un admin.");
		}
	}

	private assertEditor(role: FlowRole): void {
		if (role === "VIEWER") {
			throw new ForbiddenException(
				"Con acceso de solo lectura no se puede editar.",
			);
		}
	}

	private assertAdmin(role: FlowRole): void {
		if (role !== "ADMIN") {
			throw new ForbiddenException(
				"Solo un admin del proyecto puede hacer eso.",
			);
		}
	}

	private async touch(projectId: string): Promise<void> {
		await this.db.flowProject.update({
			where: { id: projectId },
			data: { updatedAt: new Date() },
		});
	}

	private translate(cause: unknown): Error {
		if (
			cause instanceof PrismaNamespace.PrismaClientKnownRequestError &&
			cause.code === "P2003"
		) {
			return new NotFoundException("Esa empresa no existe.");
		}
		return cause instanceof Error ? cause : new Error(String(cause));
	}
}
