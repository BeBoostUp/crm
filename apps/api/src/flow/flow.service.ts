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
	FLOW_CHANNEL_KEYS,
	FLOW_CHANNEL_LABELS,
	FLOW_LIMITS,
	type FlowCanvasAccess,
	type FlowChannelKey,
	type FlowMemberPermissions,
	parseFlowMemberPermissions,
} from "@crm/validation/flow-permissions";
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
	FlowChatMessage,
	FlowChatSendInput,
	FlowChecklist,
	FlowChecklistItemCreateInput,
	FlowChecklistItemUpdateInput,
	FlowGuestComment,
	FlowGuestCommentInput,
	FlowGuestView,
	FlowMemberSetInput,
	FlowProject,
	FlowProjectCreateInput,
	FlowProjectSummary,
	FlowProjectUpdateInput,
	FlowRole,
} from "./flow.contracts";
import { FLOW_DEMO_PROJECTS } from "./flow-demo";
import { FLOW_TEMPLATES } from "./flow-templates";

const companySelect = { id: true, name: true, logoUrl: true } as const;

const checklistInclude = {
	items: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
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
	checklists: {
		include: checklistInclude,
		orderBy: [{ position: "asc" }, { createdAt: "asc" }],
	},
	comments: { orderBy: { createdAt: "desc" }, take: 100 },
	guestLinks: {
		where: { revokedAt: null },
		select: { id: true, canComment: true },
	},
} as const satisfies PrismaNamespace.FlowProjectInclude;

const messageInclude = {
	user: { select: { id: true, name: true, image: true } },
} as const satisfies PrismaNamespace.FlowChatMessageInclude;

type ProjectRow = PrismaNamespace.FlowProjectGetPayload<{
	include: typeof projectInclude;
}>;

type CanvasRow = PrismaNamespace.FlowCanvasGetPayload<{ select: undefined }>;

type AssetRow = PrismaNamespace.FlowAssetGetPayload<{ select: undefined }>;

type CommentRow = PrismaNamespace.FlowGuestCommentGetPayload<{
	select: undefined;
}>;

type ChecklistRow = PrismaNamespace.FlowChecklistGetPayload<{
	include: typeof checklistInclude;
}>;

type MessageRow = PrismaNamespace.FlowChatMessageGetPayload<{
	include: typeof messageInclude;
}>;

type CompanyRow = { id: string; name: string; logoUrl: string | null } | null;

type Grant = { role: FlowRole; permissions: FlowMemberPermissions };

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
		thumbnailUrl: row.thumbnailUrl,
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
		fileUrl: row.fileUrl,
		fileType: row.fileType,
		fileSize: row.fileSize,
		notes: row.notes,
		tags: row.tags,
		createdAt: row.createdAt.toISOString(),
	};
}

function checklist(row: ChecklistRow): FlowChecklist {
	return {
		id: row.id,
		title: row.title,
		position: row.position,
		items: row.items.map((item) => ({
			id: item.id,
			text: item.text,
			done: item.done,
			parentId: item.parentId,
			position: item.position,
		})),
	};
}

function comment(row: CommentRow): FlowGuestComment {
	return {
		id: row.id,
		canvasId: row.canvasId,
		nodeId: row.nodeId,
		authorName: row.authorName,
		body: row.body,
		createdAt: row.createdAt.toISOString(),
	};
}

function message(row: MessageRow): FlowChatMessage {
	return {
		id: row.id,
		channelId: row.channelId,
		body: row.body,
		fileUrl: row.fileUrl,
		fileType: row.fileType,
		fileName: row.fileName,
		createdAt: row.createdAt.toISOString(),
		author: { id: row.user.id, name: row.user.name, image: row.user.image },
	};
}

function blank(value: string | undefined): string | null | undefined {
	return value === undefined ? undefined : value || null;
}

function canvasAccess(grant: Grant, canvasId: string): FlowCanvasAccess {
	if (grant.role === "ADMIN") return "edit";
	const override = grant.permissions.canvases[canvasId];
	if (override) return override;
	return grant.role === "VIEWER" ? "view" : "edit";
}

function canUpload(grant: Grant): boolean {
	if (grant.role === "ADMIN") return true;
	return grant.permissions.canUpload ?? grant.role !== "VIEWER";
}

function canExport(grant: Grant): boolean {
	if (grant.role === "ADMIN") return true;
	return grant.permissions.canExport ?? true;
}

function channelsFor(grant: Grant): FlowChannelKey[] {
	if (grant.role === "ADMIN" || grant.permissions.channels === null) {
		return [...FLOW_CHANNEL_KEYS];
	}
	return [...grant.permissions.channels];
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
				logoUrl: row.logoUrl,
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
		const grant = await this.grant(id, userId);
		const row = await this.db.flowProject.findUnique({
			where: { id },
			include: projectInclude,
		});
		if (!row) throw new NotFoundException(`No existe el proyecto ${id}.`);

		return this.serializeProject(row, grant);
	}

	async createProject(
		input: FlowProjectCreateInput,
		userId: string,
	): Promise<FlowProject> {
		await this.assertBelow(
			this.db.flowProject.count(),
			FLOW_LIMITS.projects,
			"proyectos",
		);
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

			return this.serializeProject(row, {
				role: "ADMIN",
				permissions: parseFlowMemberPermissions(null),
			});
		} catch (error) {
			throw this.translate(error);
		}
	}

	async updateProject(
		input: FlowProjectUpdateInput,
		userId: string,
	): Promise<FlowProject> {
		const grant = await this.grant(input.id, userId);
		this.assertAdmin(grant.role);

		try {
			const row = await this.db.flowProject.update({
				where: { id: input.id },
				data: {
					name: input.name,
					description: blank(input.description),
					companyId: input.companyId,
					color: input.color,
					logoUrl: input.logoUrl,
				},
				include: projectInclude,
			});

			return this.serializeProject(row, grant);
		} catch (error) {
			throw this.translate(error);
		}
	}

	async removeProject(id: string, userId: string): Promise<{ id: string }> {
		this.assertAdmin((await this.grant(id, userId)).role);
		await this.db.flowProject.delete({ where: { id } });
		return { id };
	}

	async setMember(
		input: FlowMemberSetInput,
		userId: string,
	): Promise<FlowProject> {
		this.assertAdmin((await this.grant(input.projectId, userId)).role);
		if (input.role !== "ADMIN") {
			await this.assertNotLastAdmin(input.projectId, input.userId);
		}
		await this.assertBelow(
			this.db.flowMember.count({
				where: { projectId: input.projectId, NOT: { userId: input.userId } },
			}),
			FLOW_LIMITS.membersPerProject - 1,
			"integrantes",
		);

		const permissions =
			input.permissions === undefined ? undefined : input.permissions;
		await this.db.flowMember.upsert({
			where: {
				projectId_userId: { projectId: input.projectId, userId: input.userId },
			},
			update: { role: input.role, permissions },
			create: {
				projectId: input.projectId,
				userId: input.userId,
				role: input.role,
				permissions,
			},
		});

		return this.getProject(input.projectId, userId);
	}

	async removeMember(
		projectId: string,
		targetUserId: string,
		userId: string,
	): Promise<FlowProject> {
		this.assertAdmin((await this.grant(projectId, userId)).role);
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
		const grant = await this.grant(input.projectId, userId);
		this.assertEditor(grant.role);
		await this.assertBelow(
			this.db.flowCanvas.count({ where: { projectId: input.projectId } }),
			FLOW_LIMITS.canvasesPerProject,
			"lienzos por proyecto",
		);
		const document = input.template
			? FLOW_TEMPLATES[input.template]
			: EMPTY_FLOW_DOCUMENT;
		const row = await this.db.flowCanvas.create({
			data: {
				projectId: input.projectId,
				type: input.type,
				name: input.name,
				channel: input.channel || null,
				document,
				completeness: flowCompleteness(document),
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
		if (!row) throw new NotFoundException(`No existe el lienzo ${id}.`);
		const grant = await this.grant(row.projectId, userId);
		const access = canvasAccess(grant, id);
		if (access === "none") {
			throw new NotFoundException(`No existe el lienzo ${id}.`);
		}

		return {
			id: row.id,
			projectId: row.projectId,
			projectName: row.project.name,
			type: row.type,
			name: row.name,
			channel: row.channel,
			document: parseFlowCanvasDocument(row.document),
			completeness: row.completeness,
			canEdit: access === "edit",
			canExport: canExport(grant),
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

	async setCanvasThumbnail(
		id: string,
		thumbnailUrl: string,
		userId: string,
	): Promise<{ id: string }> {
		await this.canvasEditor(id, userId);
		await this.db.flowCanvas.update({ where: { id }, data: { thumbnailUrl } });
		return { id };
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

	async assertUploader(projectId: string, userId: string): Promise<void> {
		const grant = await this.grant(projectId, userId);
		if (!canUpload(grant)) {
			throw new ForbiddenException("No tenés permiso para subir archivos.");
		}
	}

	async createGuestLink(
		projectId: string,
		canComment: boolean,
		userId: string,
	): Promise<{ token: string }> {
		this.assertAdmin((await this.grant(projectId, userId)).role);
		const token = randomBytes(32).toString("base64url");
		await this.db.$transaction([
			this.db.flowGuestLink.updateMany({
				where: { projectId, revokedAt: null },
				data: { revokedAt: new Date() },
			}),
			this.db.flowGuestLink.create({
				data: { projectId, tokenHash: tokenHash(token), canComment },
			}),
		]);

		return { token };
	}

	async revokeGuestLink(
		projectId: string,
		userId: string,
	): Promise<{ id: string }> {
		this.assertAdmin((await this.grant(projectId, userId)).role);
		await this.db.flowGuestLink.updateMany({
			where: { projectId, revokedAt: null },
			data: { revokedAt: new Date() },
		});

		return { id: projectId };
	}

	async guestView(token: string): Promise<FlowGuestView> {
		const link = await this.activeLink(token, {
			company: { select: companySelect },
			canvases: { orderBy: { createdAt: "asc" } },
			comments: { orderBy: { createdAt: "desc" }, take: 100 },
		});

		return {
			project: {
				name: link.project.name,
				description: link.project.description,
				color: link.project.color,
				logoUrl: link.project.logoUrl,
				companyName: link.project.company?.name ?? null,
				canComment: link.canComment,
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
			comments: link.project.comments.map(comment),
		};
	}

	async guestComment(input: FlowGuestCommentInput): Promise<FlowGuestComment> {
		const link = await this.activeLink(input.token, {
			canvases: { select: { id: true } },
		});
		if (!link.canComment) {
			throw new ForbiddenException("Este enlace no admite comentarios.");
		}
		const canvasId = link.project.canvases.some(
			(canvas) => canvas.id === input.canvasId,
		)
			? input.canvasId
			: null;
		const row = await this.db.flowGuestComment.create({
			data: {
				projectId: link.projectId,
				canvasId,
				nodeId: canvasId ? input.nodeId : null,
				authorName: input.authorName,
				body: input.body,
			},
		});

		return comment(row);
	}

	async removeGuestComment(
		id: string,
		userId: string,
	): Promise<{ id: string }> {
		const row = await this.db.flowGuestComment.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!row) throw new NotFoundException(`No existe el comentario ${id}.`);
		this.assertEditor((await this.grant(row.projectId, userId)).role);
		await this.db.flowGuestComment.delete({ where: { id } });
		return { id };
	}

	async chatChannels(
		projectId: string,
		userId: string,
	): Promise<{ id: string; key: FlowChannelKey; name: string }[]> {
		const grant = await this.grant(projectId, userId);
		await this.db.flowChatChannel.createMany({
			data: FLOW_CHANNEL_KEYS.map((key) => ({ projectId, key })),
			skipDuplicates: true,
		});
		const allowed = new Set(channelsFor(grant));
		const rows = await this.db.flowChatChannel.findMany({
			where: { projectId },
		});

		return FLOW_CHANNEL_KEYS.flatMap((key) => {
			const row = rows.find((candidate) => candidate.key === key);
			return row && allowed.has(key)
				? [{ id: row.id, key, name: FLOW_CHANNEL_LABELS[key] }]
				: [];
		});
	}

	async chatMessages(
		channelId: string,
		after: string | undefined,
		userId: string,
	): Promise<FlowChatMessage[]> {
		await this.channelMember(channelId, userId);
		const rows = await this.db.flowChatMessage.findMany({
			where: after
				? { channelId, createdAt: { gt: new Date(after) } }
				: { channelId },
			include: messageInclude,
			orderBy: { createdAt: "desc" },
			take: 100,
		});

		return rows.reverse().map(message);
	}

	async chatSend(
		input: FlowChatSendInput,
		userId: string,
	): Promise<FlowChatMessage> {
		await this.channelMember(input.channelId, userId);
		const row = await this.db.flowChatMessage.create({
			data: {
				channelId: input.channelId,
				userId,
				body: input.body,
				fileUrl: input.file?.url ?? null,
				fileType: input.file?.type ?? null,
				fileName: input.file?.name ?? null,
			},
			include: messageInclude,
		});

		return message(row);
	}

	async createAsset(
		input: FlowAssetCreateInput,
		userId: string,
	): Promise<FlowAsset> {
		const grant = await this.grant(input.projectId, userId);
		this.assertEditor(grant.role);
		if (input.file && !canUpload(grant)) {
			throw new ForbiddenException("No tenés permiso para subir archivos.");
		}
		await this.assertBelow(
			this.db.flowAsset.count({ where: { projectId: input.projectId } }),
			FLOW_LIMITS.assetsPerProject,
			"referencias por proyecto",
		);
		const row = await this.db.flowAsset.create({
			data: {
				projectId: input.projectId,
				kind: input.kind,
				title: input.title,
				url: input.url || null,
				fileUrl: input.file?.url ?? null,
				fileType: input.file?.type ?? null,
				fileSize: input.file?.size ?? null,
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
			throw new NotFoundException(`No existe la referencia ${input.id}.`);
		}
		this.assertEditor((await this.grant(existing.projectId, userId)).role);
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
		if (!existing)
			throw new NotFoundException(`No existe la referencia ${id}.`);
		this.assertEditor((await this.grant(existing.projectId, userId)).role);
		await this.db.flowAsset.delete({ where: { id } });
		return { id };
	}

	async createChecklist(
		projectId: string,
		title: string,
		userId: string,
	): Promise<FlowChecklist> {
		this.assertEditor((await this.grant(projectId, userId)).role);
		const position = await this.db.flowChecklist.count({
			where: { projectId },
		});
		const row = await this.db.flowChecklist.create({
			data: { projectId, title, position },
			include: checklistInclude,
		});

		return checklist(row);
	}

	async removeChecklist(id: string, userId: string): Promise<{ id: string }> {
		await this.checklistEditor(id, userId);
		await this.db.flowChecklist.delete({ where: { id } });
		return { id };
	}

	async reorderChecklists(
		projectId: string,
		ids: string[],
		userId: string,
	): Promise<{ id: string }> {
		this.assertEditor((await this.grant(projectId, userId)).role);
		await this.db.$transaction(
			ids.map((id, position) =>
				this.db.flowChecklist.updateMany({
					where: { id, projectId },
					data: { position },
				}),
			),
		);
		return { id: projectId };
	}

	async addChecklistItem(
		input: FlowChecklistItemCreateInput,
		userId: string,
	): Promise<FlowChecklist> {
		await this.checklistEditor(input.checklistId, userId);
		if (input.parentId) {
			const parent = await this.db.flowChecklistItem.findUnique({
				where: { id: input.parentId },
				select: { checklistId: true, parentId: true },
			});
			if (!parent || parent.checklistId !== input.checklistId) {
				throw new NotFoundException("La tarea madre no existe.");
			}
			if (parent.parentId) {
				throw new ConflictException("Solo se admite un nivel de subtareas.");
			}
		}
		const position = await this.db.flowChecklistItem.count({
			where: { checklistId: input.checklistId },
		});
		const row = await this.db.flowChecklist.update({
			where: { id: input.checklistId },
			data: {
				items: {
					create: { text: input.text, parentId: input.parentId, position },
				},
			},
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
		if (!item) throw new NotFoundException(`No existe la tarea ${input.id}.`);
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
		if (!item) throw new NotFoundException(`No existe la tarea ${id}.`);
		await this.checklistEditor(item.checklistId, userId);
		await this.db.$transaction([
			this.db.flowChecklistItem.deleteMany({ where: { parentId: id } }),
			this.db.flowChecklistItem.delete({ where: { id } }),
		]);

		return this.readChecklist(item.checklistId);
	}

	async reorderChecklistItems(
		checklistId: string,
		ids: string[],
		userId: string,
	): Promise<FlowChecklist> {
		await this.checklistEditor(checklistId, userId);
		await this.db.$transaction(
			ids.map((id, position) =>
				this.db.flowChecklistItem.updateMany({
					where: { id, checklistId },
					data: { position },
				}),
			),
		);

		return this.readChecklist(checklistId);
	}

	async seedDemo(userId: string): Promise<FlowProjectSummary[]> {
		for (const demo of FLOW_DEMO_PROJECTS) {
			const existing = await this.db.flowProject.findFirst({
				where: { name: demo.name, members: { some: { userId } } },
				select: { id: true },
			});
			if (existing) continue;

			const client =
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
					companyId: client.id,
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
						create: demo.checklists.map((list, position) => ({
							title: list.title,
							position,
							items: {
								create: list.items.map((item, index) => ({
									...item,
									position: index,
								})),
							},
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
		if (!row) throw new NotFoundException(`No existe la checklist ${id}.`);
		return checklist(row);
	}

	private serializeProject(row: ProjectRow, grant: Grant): FlowProject {
		return {
			id: row.id,
			name: row.name,
			description: row.description,
			color: row.color,
			logoUrl: row.logoUrl,
			company: company(row.company),
			role: grant.role,
			me: {
				canUpload: canUpload(grant),
				canExport: canExport(grant),
				channels: channelsFor(grant),
			},
			members: row.members.map((member) => ({
				userId: member.user.id,
				name: member.user.name,
				email: member.user.email,
				image: member.user.image,
				role: member.role,
				permissions: parseFlowMemberPermissions(member.permissions),
			})),
			canvases: row.canvases
				.filter((canvas) => canvasAccess(grant, canvas.id) !== "none")
				.map(canvasSummary),
			assets: row.assets.map(asset),
			checklists: row.checklists.map(checklist),
			comments: row.comments.map(comment),
			guestLink: {
				active: row.guestLinks.length > 0,
				canComment: row.guestLinks.some((link) => link.canComment),
			},
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}

	private async grant(projectId: string, userId: string): Promise<Grant> {
		const member = await this.db.flowMember.findUnique({
			where: { projectId_userId: { projectId, userId } },
		});
		if (!member) {
			throw new NotFoundException(`No existe el proyecto ${projectId}.`);
		}
		return {
			role: member.role,
			permissions: parseFlowMemberPermissions(member.permissions),
		};
	}

	private async activeLink<Include extends PrismaNamespace.FlowProjectInclude>(
		token: string,
		include: Include,
	) {
		const link = await this.db.flowGuestLink.findUnique({
			where: { tokenHash: tokenHash(token) },
			include: { project: { include } },
		});
		if (!link || link.revokedAt) {
			throw new NotFoundException("Este enlace ya no está activo.");
		}
		return link;
	}

	private async canvasEditor(id: string, userId: string): Promise<void> {
		const row = await this.db.flowCanvas.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!row) throw new NotFoundException(`No existe el lienzo ${id}.`);
		const grant = await this.grant(row.projectId, userId);
		if (canvasAccess(grant, id) !== "edit") {
			throw new ForbiddenException("No tenés permiso para editar este lienzo.");
		}
	}

	private async checklistEditor(id: string, userId: string): Promise<void> {
		const row = await this.db.flowChecklist.findUnique({
			where: { id },
			select: { projectId: true },
		});
		if (!row) throw new NotFoundException(`No existe la checklist ${id}.`);
		this.assertEditor((await this.grant(row.projectId, userId)).role);
	}

	private async channelMember(
		channelId: string,
		userId: string,
	): Promise<void> {
		const channel = await this.db.flowChatChannel.findUnique({
			where: { id: channelId },
			select: { projectId: true, key: true },
		});
		if (!channel)
			throw new NotFoundException(`No existe el canal ${channelId}.`);
		const grant = await this.grant(channel.projectId, userId);
		if (!channelsFor(grant).includes(channel.key)) {
			throw new ForbiddenException("No tenés acceso a este canal.");
		}
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

	private async assertBelow(
		count: Promise<number>,
		limit: number,
		subject: string,
	): Promise<void> {
		if ((await count) >= limit) {
			throw new ConflictException(
				`Llegaste al límite de ${limit} ${subject} del plan.`,
			);
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
