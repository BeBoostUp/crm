import { Inject } from "@nestjs/common";
import {
	Ctx,
	Input,
	Mutation,
	Query,
	Router,
	UseMiddlewares,
} from "nestjs-trpc";
import type { z } from "zod";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	flowAssetCreateInput,
	flowAssetOutput,
	flowAssetUpdateInput,
	flowCanvasCreateInput,
	flowCanvasOutput,
	flowCanvasSaveInput,
	flowCanvasSaveOutput,
	flowCanvasSummaryOutput,
	flowCanvasThumbnailInput,
	flowCanvasUpdateInput,
	flowChatChannelListOutput,
	flowChatMessageListOutput,
	flowChatMessageOutput,
	flowChatMessagesInput,
	flowChatSendInput,
	flowChecklistCreateInput,
	flowChecklistItemCreateInput,
	flowChecklistItemUpdateInput,
	flowChecklistOutput,
	flowChecklistReorderInput,
	flowChecklistsReorderInput,
	flowDeleteOutput,
	flowGuestCommentInput,
	flowGuestCommentOutput,
	flowGuestLinkCreateInput,
	flowGuestLinkOutput,
	flowGuestTokenInput,
	flowGuestViewOutput,
	flowIdInput,
	flowMemberRemoveInput,
	flowMemberSetInput,
	flowProjectCreateInput,
	flowProjectIdInput,
	flowProjectListOutput,
	flowProjectOutput,
	flowProjectUpdateInput,
} from "./flow.contracts";
import { FlowService } from "./flow.service";

const TAGS = ["Flow"];

@Router({ alias: "flow" })
export class FlowRouter {
	constructor(@Inject(FlowService) private readonly flow: FlowService) {}

	@Query({
		output: flowProjectListOutput,
		meta: restMeta("GET", "/flow/projects", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async listProjects(@Ctx() ctx: AuthedTrpcContext) {
		return this.flow.listProjects(ctx.user.id);
	}

	@Mutation({
		output: flowProjectListOutput,
		meta: restMeta("POST", "/flow/demo", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async seedDemo(@Ctx() ctx: AuthedTrpcContext) {
		return this.flow.seedDemo(ctx.user.id);
	}

	@Query({
		input: flowIdInput,
		output: flowProjectOutput,
		meta: restMeta("GET", "/flow/projects/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async getProject(@Ctx() ctx: AuthedTrpcContext, @Input("id") id: string) {
		return this.flow.getProject(id, ctx.user.id);
	}

	@Mutation({
		input: flowProjectCreateInput,
		output: flowProjectOutput,
		meta: restMeta("POST", "/flow/projects", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async createProject(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowProjectCreateInput>,
	) {
		return this.flow.createProject(input, ctx.user.id);
	}

	@Mutation({
		input: flowProjectUpdateInput,
		output: flowProjectOutput,
		meta: restMeta("PATCH", "/flow/projects/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async updateProject(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowProjectUpdateInput>,
	) {
		return this.flow.updateProject(input, ctx.user.id);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/projects/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeProject(@Ctx() ctx: AuthedTrpcContext, @Input("id") id: string) {
		return this.flow.removeProject(id, ctx.user.id);
	}

	@Mutation({
		input: flowMemberSetInput,
		output: flowProjectOutput,
		meta: restMeta("PUT", "/flow/projects/{projectId}/members", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async setMember(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowMemberSetInput>,
	) {
		return this.flow.setMember(input, ctx.user.id);
	}

	@Mutation({
		input: flowMemberRemoveInput,
		output: flowProjectOutput,
		meta: restMeta(
			"DELETE",
			"/flow/projects/{projectId}/members/{userId}",
			TAGS,
		),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeMember(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("projectId") projectId: string,
		@Input("userId") userId: string,
	) {
		return this.flow.removeMember(projectId, userId, ctx.user.id);
	}

	@Mutation({
		input: flowCanvasCreateInput,
		output: flowCanvasSummaryOutput,
		meta: restMeta("POST", "/flow/canvases", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async createCanvas(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowCanvasCreateInput>,
	) {
		return this.flow.createCanvas(input, ctx.user.id);
	}

	@Query({
		input: flowIdInput,
		output: flowCanvasOutput,
		meta: restMeta("GET", "/flow/canvases/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async getCanvas(@Ctx() ctx: AuthedTrpcContext, @Input("id") id: string) {
		return this.flow.getCanvas(id, ctx.user.id);
	}

	@Mutation({
		input: flowCanvasSaveInput,
		output: flowCanvasSaveOutput,
		meta: restMeta("PUT", "/flow/canvases/{id}/document", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async saveCanvas(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowCanvasSaveInput>,
	) {
		return this.flow.saveCanvas(input.id, input.document, ctx.user.id);
	}

	@Mutation({
		input: flowCanvasThumbnailInput,
		output: flowDeleteOutput,
		meta: restMeta("PUT", "/flow/canvases/{id}/thumbnail", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async setCanvasThumbnail(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowCanvasThumbnailInput>,
	) {
		return this.flow.setCanvasThumbnail(
			input.id,
			input.thumbnailUrl,
			ctx.user.id,
		);
	}

	@Mutation({
		input: flowCanvasUpdateInput,
		output: flowCanvasSummaryOutput,
		meta: restMeta("PATCH", "/flow/canvases/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async updateCanvas(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowCanvasUpdateInput>,
	) {
		return this.flow.updateCanvas(input, ctx.user.id);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/canvases/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeCanvas(@Ctx() ctx: AuthedTrpcContext, @Input("id") id: string) {
		return this.flow.removeCanvas(id, ctx.user.id);
	}

	@Mutation({
		input: flowGuestLinkCreateInput,
		output: flowGuestLinkOutput,
		meta: restMeta("POST", "/flow/projects/{projectId}/guest-link", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async createGuestLink(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowGuestLinkCreateInput>,
	) {
		return this.flow.createGuestLink(
			input.projectId,
			input.canComment,
			ctx.user.id,
		);
	}

	@Mutation({
		input: flowProjectIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/projects/{projectId}/guest-link", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async revokeGuestLink(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("projectId") projectId: string,
	) {
		return this.flow.revokeGuestLink(projectId, ctx.user.id);
	}

	@Query({
		input: flowGuestTokenInput,
		output: flowGuestViewOutput,
		meta: restMeta("GET", "/flow/guest/{token}", TAGS, { protect: false }),
	})
	async guestView(@Input("token") token: string) {
		return this.flow.guestView(token);
	}

	@Mutation({
		input: flowGuestCommentInput,
		output: flowGuestCommentOutput,
		meta: restMeta("POST", "/flow/guest/{token}/comments", TAGS, {
			protect: false,
		}),
	})
	async guestComment(@Input() input: z.infer<typeof flowGuestCommentInput>) {
		return this.flow.guestComment(input);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/comments/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeGuestComment(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("id") id: string,
	) {
		return this.flow.removeGuestComment(id, ctx.user.id);
	}

	@Query({
		input: flowProjectIdInput,
		output: flowChatChannelListOutput,
		meta: restMeta("GET", "/flow/projects/{projectId}/channels", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async chatChannels(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("projectId") projectId: string,
	) {
		return this.flow.chatChannels(projectId, ctx.user.id);
	}

	@Query({
		input: flowChatMessagesInput,
		output: flowChatMessageListOutput,
		meta: restMeta("GET", "/flow/channels/{channelId}/messages", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async chatMessages(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowChatMessagesInput>,
	) {
		return this.flow.chatMessages(input.channelId, input.after, ctx.user.id);
	}

	@Mutation({
		input: flowChatSendInput,
		output: flowChatMessageOutput,
		meta: restMeta("POST", "/flow/channels/{channelId}/messages", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async chatSend(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowChatSendInput>,
	) {
		return this.flow.chatSend(input, ctx.user.id);
	}

	@Mutation({
		input: flowAssetCreateInput,
		output: flowAssetOutput,
		meta: restMeta("POST", "/flow/assets", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async createAsset(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowAssetCreateInput>,
	) {
		return this.flow.createAsset(input, ctx.user.id);
	}

	@Mutation({
		input: flowAssetUpdateInput,
		output: flowAssetOutput,
		meta: restMeta("PATCH", "/flow/assets/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async updateAsset(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowAssetUpdateInput>,
	) {
		return this.flow.updateAsset(input, ctx.user.id);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/assets/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeAsset(@Ctx() ctx: AuthedTrpcContext, @Input("id") id: string) {
		return this.flow.removeAsset(id, ctx.user.id);
	}

	@Mutation({
		input: flowChecklistCreateInput,
		output: flowChecklistOutput,
		meta: restMeta("POST", "/flow/checklists", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async createChecklist(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("projectId") projectId: string,
		@Input("title") title: string,
	) {
		return this.flow.createChecklist(projectId, title, ctx.user.id);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/checklists/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeChecklist(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("id") id: string,
	) {
		return this.flow.removeChecklist(id, ctx.user.id);
	}

	@Mutation({
		input: flowChecklistsReorderInput,
		output: flowDeleteOutput,
		meta: restMeta("PUT", "/flow/projects/{projectId}/checklists/order", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async reorderChecklists(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowChecklistsReorderInput>,
	) {
		return this.flow.reorderChecklists(input.projectId, input.ids, ctx.user.id);
	}

	@Mutation({
		input: flowChecklistItemCreateInput,
		output: flowChecklistOutput,
		meta: restMeta("POST", "/flow/checklists/{checklistId}/items", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async addChecklistItem(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowChecklistItemCreateInput>,
	) {
		return this.flow.addChecklistItem(input, ctx.user.id);
	}

	@Mutation({
		input: flowChecklistReorderInput,
		output: flowChecklistOutput,
		meta: restMeta("PUT", "/flow/checklists/{checklistId}/order", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async reorderChecklistItems(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowChecklistReorderInput>,
	) {
		return this.flow.reorderChecklistItems(
			input.checklistId,
			input.ids,
			ctx.user.id,
		);
	}

	@Mutation({
		input: flowChecklistItemUpdateInput,
		output: flowChecklistOutput,
		meta: restMeta("PATCH", "/flow/checklist-items/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async updateChecklistItem(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof flowChecklistItemUpdateInput>,
	) {
		return this.flow.updateChecklistItem(input, ctx.user.id);
	}

	@Mutation({
		input: flowIdInput,
		output: flowChecklistOutput,
		meta: restMeta("DELETE", "/flow/checklist-items/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeChecklistItem(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("id") id: string,
	) {
		return this.flow.removeChecklistItem(id, ctx.user.id);
	}
}
