import {
	FLOW_CANVAS_TYPES,
	flowCanvasDocument,
} from "@crm/validation/flow-canvas";
import {
	FLOW_CHANNEL_KEYS,
	FLOW_LIMITS,
	flowMemberPermissions,
} from "@crm/validation/flow-permissions";
import { z } from "zod";
import { FLOW_TEMPLATE_KEYS } from "./flow-templates";

export const flowRole = z.enum(["ADMIN", "EDITOR", "VIEWER"]);

export type FlowRole = z.infer<typeof flowRole>;

export const flowCanvasType = z.enum(FLOW_CANVAS_TYPES);

export const flowAssetKind = z.enum(["AD", "LANDING", "EMAIL", "RESOURCE"]);

export const flowChannelKey = z.enum(FLOW_CHANNEL_KEYS);

export const flowCanvasTemplate = z.enum(FLOW_TEMPLATE_KEYS);

const name = z.string().trim().min(1, "Falta el nombre.").max(120);

const longText = z.string().trim().max(4000);

const tags = z.array(z.string().trim().min(1).max(40)).max(20);

const flowFile = z.object({
	url: z.string().trim().min(1).max(2000),
	type: z.string().trim().min(1).max(120),
	size: z.number().int().nonnegative(),
});

export const flowIdInput = z.object({ id: z.string() });

export const flowProjectIdInput = z.object({ projectId: z.string() });

export const flowDeleteOutput = z.object({ id: z.string() });

export const flowProjectCreateInput = z.object({
	name,
	companyId: z.string().nullable().default(null),
	description: z.string().trim().max(2000).default(""),
});

export type FlowProjectCreateInput = z.infer<typeof flowProjectCreateInput>;

export const flowProjectUpdateInput = z.object({
	id: z.string(),
	name: name.optional(),
	companyId: z.string().nullable().optional(),
	description: z.string().trim().max(2000).optional(),
	color: z.string().trim().max(32).nullable().optional(),
	logoUrl: z.string().trim().max(2000).nullable().optional(),
});

export type FlowProjectUpdateInput = z.infer<typeof flowProjectUpdateInput>;

const flowCompany = z
	.object({
		id: z.string(),
		name: z.string(),
		iconUrl: z.string().nullable(),
	})
	.nullable();

export const flowProjectSummaryOutput = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	color: z.string().nullable(),
	logoUrl: z.string().nullable(),
	company: flowCompany,
	role: flowRole,
	canvasCount: z.number(),
	completeness: z.number(),
	updatedAt: z.string(),
});

export type FlowProjectSummary = z.infer<typeof flowProjectSummaryOutput>;

export const flowProjectListOutput = z.array(flowProjectSummaryOutput);

export const flowMemberOutput = z.object({
	userId: z.string(),
	name: z.string(),
	email: z.string(),
	image: z.string().nullable(),
	role: flowRole,
	permissions: flowMemberPermissions,
});

export const flowCanvasSummaryOutput = z.object({
	id: z.string(),
	type: flowCanvasType,
	name: z.string(),
	channel: z.string().nullable(),
	thumbnailUrl: z.string().nullable(),
	completeness: z.number(),
	nodeCount: z.number(),
	updatedAt: z.string(),
});

export type FlowCanvasSummary = z.infer<typeof flowCanvasSummaryOutput>;

export const flowAssetOutput = z.object({
	id: z.string(),
	kind: flowAssetKind,
	title: z.string(),
	url: z.string().nullable(),
	fileUrl: z.string().nullable(),
	fileType: z.string().nullable(),
	fileSize: z.number().nullable(),
	notes: z.string().nullable(),
	tags: z.array(z.string()),
	createdAt: z.string(),
});

export type FlowAsset = z.infer<typeof flowAssetOutput>;

export const flowChecklistItemOutput = z.object({
	id: z.string(),
	text: z.string(),
	done: z.boolean(),
	parentId: z.string().nullable(),
	position: z.number(),
});

export const flowChecklistOutput = z.object({
	id: z.string(),
	title: z.string(),
	position: z.number(),
	items: z.array(flowChecklistItemOutput),
});

export type FlowChecklist = z.infer<typeof flowChecklistOutput>;

export const flowGuestCommentOutput = z.object({
	id: z.string(),
	canvasId: z.string().nullable(),
	nodeId: z.string().nullable(),
	authorName: z.string(),
	body: z.string(),
	createdAt: z.string(),
});

export type FlowGuestComment = z.infer<typeof flowGuestCommentOutput>;

export const flowProjectOutput = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	color: z.string().nullable(),
	logoUrl: z.string().nullable(),
	company: flowCompany,
	role: flowRole,
	me: z.object({
		canUpload: z.boolean(),
		canExport: z.boolean(),
		channels: z.array(flowChannelKey),
	}),
	members: z.array(flowMemberOutput),
	canvases: z.array(flowCanvasSummaryOutput),
	assets: z.array(flowAssetOutput),
	checklists: z.array(flowChecklistOutput),
	comments: z.array(flowGuestCommentOutput),
	guestLink: z.object({ active: z.boolean(), canComment: z.boolean() }),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type FlowProject = z.infer<typeof flowProjectOutput>;

export const flowMemberSetInput = z.object({
	projectId: z.string(),
	userId: z.string(),
	role: flowRole,
	permissions: flowMemberPermissions.optional(),
});

export type FlowMemberSetInput = z.infer<typeof flowMemberSetInput>;

export const flowMemberRemoveInput = z.object({
	projectId: z.string(),
	userId: z.string(),
});

export const flowCanvasCreateInput = z.object({
	projectId: z.string(),
	type: flowCanvasType,
	name,
	channel: z.string().trim().max(60).default(""),
	template: flowCanvasTemplate.nullable().default(null),
});

export type FlowCanvasCreateInput = z.infer<typeof flowCanvasCreateInput>;

export const flowCanvasUpdateInput = z.object({
	id: z.string(),
	name: name.optional(),
	channel: z.string().trim().max(60).optional(),
});

export type FlowCanvasUpdateInput = z.infer<typeof flowCanvasUpdateInput>;

export const flowCanvasSaveInput = z.object({
	id: z.string(),
	document: flowCanvasDocument,
});

export const flowCanvasThumbnailInput = z.object({
	id: z.string(),
	thumbnailUrl: z.string().trim().min(1).max(2000),
});

export const flowCanvasOutput = z.object({
	id: z.string(),
	projectId: z.string(),
	projectName: z.string(),
	type: flowCanvasType,
	name: z.string(),
	channel: z.string().nullable(),
	document: flowCanvasDocument,
	completeness: z.number(),
	canEdit: z.boolean(),
	canExport: z.boolean(),
	updatedAt: z.string(),
});

export type FlowCanvas = z.infer<typeof flowCanvasOutput>;

export const flowCanvasSaveOutput = z.object({
	id: z.string(),
	completeness: z.number(),
	updatedAt: z.string(),
});

export const flowGuestLinkCreateInput = z.object({
	projectId: z.string(),
	canComment: z.boolean().default(false),
});

export const flowGuestLinkOutput = z.object({ token: z.string() });

export const flowGuestTokenInput = z.object({ token: z.string().min(1) });

export const flowGuestViewOutput = z.object({
	project: z.object({
		name: z.string(),
		description: z.string().nullable(),
		color: z.string().nullable(),
		logoUrl: z.string().nullable(),
		companyName: z.string().nullable(),
		canComment: z.boolean(),
	}),
	canvases: z.array(
		z.object({
			id: z.string(),
			type: flowCanvasType,
			name: z.string(),
			channel: z.string().nullable(),
			document: flowCanvasDocument,
			completeness: z.number(),
		}),
	),
	comments: z.array(flowGuestCommentOutput),
});

export type FlowGuestView = z.infer<typeof flowGuestViewOutput>;

export const flowGuestCommentInput = z.object({
	token: z.string().min(1),
	canvasId: z.string().nullable().default(null),
	nodeId: z.string().nullable().default(null),
	authorName: z.string().trim().min(1, "Falta el nombre.").max(80),
	body: z.string().trim().min(1).max(FLOW_LIMITS.commentLength),
});

export type FlowGuestCommentInput = z.infer<typeof flowGuestCommentInput>;

export const flowAssetCreateInput = z.object({
	projectId: z.string(),
	kind: flowAssetKind,
	title: name,
	url: z.string().trim().max(2000).default(""),
	file: flowFile.nullable().default(null),
	notes: longText.default(""),
	tags: tags.default([]),
});

export type FlowAssetCreateInput = z.infer<typeof flowAssetCreateInput>;

export const flowAssetUpdateInput = z.object({
	id: z.string(),
	kind: flowAssetKind.optional(),
	title: name.optional(),
	url: z.string().trim().max(2000).optional(),
	notes: longText.optional(),
	tags: tags.optional(),
});

export type FlowAssetUpdateInput = z.infer<typeof flowAssetUpdateInput>;

export const flowChecklistCreateInput = z.object({
	projectId: z.string(),
	title: name,
});

export const flowChecklistItemCreateInput = z.object({
	checklistId: z.string(),
	text: z.string().trim().min(1).max(500),
	parentId: z.string().nullable().default(null),
});

export type FlowChecklistItemCreateInput = z.infer<
	typeof flowChecklistItemCreateInput
>;

export const flowChecklistItemUpdateInput = z.object({
	id: z.string(),
	done: z.boolean().optional(),
	text: z.string().trim().min(1).max(500).optional(),
});

export type FlowChecklistItemUpdateInput = z.infer<
	typeof flowChecklistItemUpdateInput
>;

export const flowChecklistReorderInput = z.object({
	checklistId: z.string(),
	ids: z.array(z.string()).max(500),
});

export const flowChecklistsReorderInput = z.object({
	projectId: z.string(),
	ids: z.array(z.string()).max(100),
});

export const flowChatChannelOutput = z.object({
	id: z.string(),
	key: flowChannelKey,
	name: z.string(),
});

export const flowChatChannelListOutput = z.array(flowChatChannelOutput);

export const flowChatMessagesInput = z.object({
	channelId: z.string(),
	after: z.string().optional(),
});

export const flowChatMessageOutput = z.object({
	id: z.string(),
	channelId: z.string(),
	body: z.string(),
	fileUrl: z.string().nullable(),
	fileType: z.string().nullable(),
	fileName: z.string().nullable(),
	createdAt: z.string(),
	author: z.object({
		id: z.string(),
		name: z.string(),
		image: z.string().nullable(),
	}),
});

export type FlowChatMessage = z.infer<typeof flowChatMessageOutput>;

export const flowChatMessageListOutput = z.array(flowChatMessageOutput);

export const flowChatSendInput = z
	.object({
		channelId: z.string(),
		body: z.string().trim().max(FLOW_LIMITS.messageLength).default(""),
		file: flowFile
			.extend({ name: z.string().trim().max(200) })
			.nullable()
			.default(null),
	})
	.refine((value) => value.body.length > 0 || value.file !== null, {
		message: "Escribí algo o adjuntá un archivo.",
	});

export type FlowChatSendInput = z.infer<typeof flowChatSendInput>;
