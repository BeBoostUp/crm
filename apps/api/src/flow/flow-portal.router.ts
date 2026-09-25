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
	decisionCreateInput,
	decisionOutput,
	flowDeleteOutput,
	flowIdInput,
	flowProjectIdInput,
	flowTokenInput,
	guestAnswerInput,
	guestApproveInput,
	guestPortalOutput,
	guestTicketInput,
	metricOutput,
	metricUpsertInput,
	milestoneCreateInput,
	milestoneOutput,
	milestoneUpdateInput,
	onboardingAnswerInput,
	onboardingCreateInput,
	onboardingItemOutput,
	portalOutput,
	secretOutput,
	secretRevealOutput,
	secretSetInput,
	ticketCreateInput,
	ticketOutput,
	ticketUpdateInput,
} from "./flow-portal.contracts";
import { FlowPortalService } from "./flow-portal.service";

const TAGS = ["Flow portal"];

@Router({ alias: "flowPortal" })
export class FlowPortalRouter {
	constructor(
		@Inject(FlowPortalService) private readonly portal: FlowPortalService,
	) {}

	@Query({
		input: flowProjectIdInput,
		output: portalOutput,
		meta: restMeta("GET", "/flow/projects/{projectId}/portal", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async get(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("projectId") projectId: string,
	) {
		return this.portal.portal(projectId, ctx.user.id);
	}

	@Mutation({
		input: milestoneCreateInput,
		output: milestoneOutput,
		meta: restMeta("POST", "/flow/milestones", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async createMilestone(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof milestoneCreateInput>,
	) {
		return this.portal.createMilestone(input, ctx.user.id);
	}

	@Mutation({
		input: milestoneUpdateInput,
		output: milestoneOutput,
		meta: restMeta("PATCH", "/flow/milestones/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async updateMilestone(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof milestoneUpdateInput>,
	) {
		return this.portal.updateMilestone(input, ctx.user.id);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/milestones/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeMilestone(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("id") id: string,
	) {
		return this.portal.removeMilestone(id, ctx.user.id);
	}

	@Mutation({
		input: metricUpsertInput,
		output: metricOutput,
		meta: restMeta("PUT", "/flow/projects/{projectId}/metrics", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async upsertMetric(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof metricUpsertInput>,
	) {
		return this.portal.upsertMetric(input, ctx.user.id);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/metrics/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeMetric(@Ctx() ctx: AuthedTrpcContext, @Input("id") id: string) {
		return this.portal.removeMetric(id, ctx.user.id);
	}

	@Mutation({
		input: onboardingCreateInput,
		output: onboardingItemOutput,
		meta: restMeta("POST", "/flow/onboarding", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async createOnboardingItem(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof onboardingCreateInput>,
	) {
		return this.portal.createOnboardingItem(
			input.projectId,
			input.kind,
			input.label,
			ctx.user.id,
		);
	}

	@Mutation({
		input: onboardingAnswerInput,
		output: onboardingItemOutput,
		meta: restMeta("PATCH", "/flow/onboarding/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async answerOnboardingItem(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof onboardingAnswerInput>,
	) {
		return this.portal.answerOnboardingItem(
			input.id,
			input.answer,
			input.done,
			ctx.user.id,
		);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/onboarding/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeOnboardingItem(
		@Ctx() ctx: AuthedTrpcContext,
		@Input("id") id: string,
	) {
		return this.portal.removeOnboardingItem(id, ctx.user.id);
	}

	@Mutation({
		input: decisionCreateInput,
		output: decisionOutput,
		meta: restMeta("POST", "/flow/decisions", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async createDecision(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof decisionCreateInput>,
	) {
		return this.portal.createDecision(
			input.projectId,
			input.title,
			input.why,
			ctx.user.id,
		);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/decisions/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeDecision(@Ctx() ctx: AuthedTrpcContext, @Input("id") id: string) {
		return this.portal.removeDecision(id, ctx.user.id);
	}

	@Mutation({
		input: ticketCreateInput,
		output: ticketOutput,
		meta: restMeta("POST", "/flow/tickets", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async createTicket(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof ticketCreateInput>,
	) {
		return this.portal.createTicket(
			input.projectId,
			input.title,
			input.body,
			ctx.user.id,
		);
	}

	@Mutation({
		input: ticketUpdateInput,
		output: ticketOutput,
		meta: restMeta("PATCH", "/flow/tickets/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async updateTicket(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof ticketUpdateInput>,
	) {
		return this.portal.updateTicket(input.id, input.status, ctx.user.id);
	}

	@Mutation({
		input: secretSetInput,
		output: secretOutput,
		meta: restMeta("PUT", "/flow/projects/{projectId}/secrets", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async setSecret(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof secretSetInput>,
	) {
		return this.portal.setSecret(
			input.projectId,
			input.name,
			input.username,
			input.value,
			ctx.user.id,
		);
	}

	@Query({
		input: flowIdInput,
		output: secretRevealOutput,
		meta: restMeta("GET", "/flow/secrets/{id}/reveal", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async revealSecret(@Ctx() ctx: AuthedTrpcContext, @Input("id") id: string) {
		return this.portal.revealSecret(id, ctx.user.id);
	}

	@Mutation({
		input: flowIdInput,
		output: flowDeleteOutput,
		meta: restMeta("DELETE", "/flow/secrets/{id}", TAGS),
	})
	@UseMiddlewares(AuthMiddleware)
	async removeSecret(@Ctx() ctx: AuthedTrpcContext, @Input("id") id: string) {
		return this.portal.removeSecret(id, ctx.user.id);
	}

	@Query({
		input: flowTokenInput,
		output: guestPortalOutput,
		meta: restMeta("GET", "/flow/guest/{token}/portal", TAGS, {
			protect: false,
		}),
	})
	async guestPortal(@Input("token") token: string) {
		return this.portal.guestPortal(token);
	}

	@Mutation({
		input: guestApproveInput,
		output: milestoneOutput,
		meta: restMeta("POST", "/flow/guest/{token}/approve", TAGS, {
			protect: false,
		}),
	})
	async guestApprove(@Input() input: z.infer<typeof guestApproveInput>) {
		return this.portal.guestApprove(input.token, input.milestoneId, input.name);
	}

	@Mutation({
		input: guestAnswerInput,
		output: onboardingItemOutput,
		meta: restMeta("POST", "/flow/guest/{token}/onboarding", TAGS, {
			protect: false,
		}),
	})
	async guestAnswer(@Input() input: z.infer<typeof guestAnswerInput>) {
		return this.portal.guestAnswer(input.token, input.itemId, input.answer);
	}

	@Mutation({
		input: guestTicketInput,
		output: ticketOutput,
		meta: restMeta("POST", "/flow/guest/{token}/tickets", TAGS, {
			protect: false,
		}),
	})
	async guestTicket(@Input() input: z.infer<typeof guestTicketInput>) {
		return this.portal.guestTicket(
			input.token,
			input.name,
			input.title,
			input.body,
		);
	}
}
