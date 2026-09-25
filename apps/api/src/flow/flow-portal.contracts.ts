import { z } from "zod";

export const milestoneStatus = z.enum([
	"PENDING",
	"IN_PROGRESS",
	"DELIVERED",
	"APPROVED",
]);

export type MilestoneStatus = z.infer<typeof milestoneStatus>;

export const deliverable = z.object({
	label: z.string().trim().min(1).max(200),
	url: z.string().trim().max(2000).default(""),
});

export const deliverables = z.array(deliverable).max(30);

export const milestoneOutput = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	dueAt: z.string().nullable(),
	position: z.number(),
	status: milestoneStatus,
	deliverables,
	approvedAt: z.string().nullable(),
	approvedBy: z.string().nullable(),
});

export type Milestone = z.infer<typeof milestoneOutput>;

export const milestoneListOutput = z.array(milestoneOutput);

export const milestoneCreateInput = z.object({
	projectId: z.string(),
	title: z.string().trim().min(1).max(160),
	description: z.string().trim().max(2000).default(""),
	dueAt: z.string().datetime().nullable().default(null),
	deliverables: deliverables.default([]),
});

export type MilestoneCreateInput = z.infer<typeof milestoneCreateInput>;

export const milestoneUpdateInput = z.object({
	id: z.string(),
	title: z.string().trim().min(1).max(160).optional(),
	description: z.string().trim().max(2000).optional(),
	dueAt: z.string().datetime().nullable().optional(),
	status: milestoneStatus.optional(),
	deliverables: deliverables.optional(),
});

export type MilestoneUpdateInput = z.infer<typeof milestoneUpdateInput>;

export const metricOutput = z.object({
	id: z.string(),
	weekStart: z.string(),
	spend: z.number(),
	leads: z.number(),
	booked: z.number(),
	attended: z.number(),
	sales: z.number(),
	notes: z.string().nullable(),
});

export type Metric = z.infer<typeof metricOutput>;

export const metricListOutput = z.array(metricOutput);

export const metricUpsertInput = z.object({
	projectId: z.string(),
	weekStart: z.string().date(),
	spend: z.number().nonnegative(),
	leads: z.number().int().nonnegative(),
	booked: z.number().int().nonnegative(),
	attended: z.number().int().nonnegative(),
	sales: z.number().int().nonnegative().default(0),
	notes: z.string().trim().max(2000).default(""),
});

export type MetricUpsertInput = z.infer<typeof metricUpsertInput>;

export const onboardingKind = z.enum(["QUESTION", "ASSET"]);

export const onboardingItemOutput = z.object({
	id: z.string(),
	kind: onboardingKind,
	label: z.string(),
	answer: z.string().nullable(),
	done: z.boolean(),
	position: z.number(),
});

export type OnboardingItem = z.infer<typeof onboardingItemOutput>;

export const onboardingListOutput = z.array(onboardingItemOutput);

export const onboardingCreateInput = z.object({
	projectId: z.string(),
	kind: onboardingKind,
	label: z.string().trim().min(1).max(300),
});

export const onboardingAnswerInput = z.object({
	id: z.string(),
	answer: z.string().trim().max(4000).default(""),
	done: z.boolean().optional(),
});

export const decisionOutput = z.object({
	id: z.string(),
	title: z.string(),
	why: z.string(),
	author: z.string(),
	decidedAt: z.string(),
});

export const decisionListOutput = z.array(decisionOutput);

export const decisionCreateInput = z.object({
	projectId: z.string(),
	title: z.string().trim().min(1).max(200),
	why: z.string().trim().min(1).max(4000),
});

export const ticketStatus = z.enum(["OPEN", "RESOLVED"]);

export const ticketOutput = z.object({
	id: z.string(),
	title: z.string(),
	body: z.string().nullable(),
	author: z.string(),
	status: ticketStatus,
	createdAt: z.string(),
});

export const ticketListOutput = z.array(ticketOutput);

export const ticketCreateInput = z.object({
	projectId: z.string(),
	title: z.string().trim().min(1).max(200),
	body: z.string().trim().max(4000).default(""),
});

export const ticketUpdateInput = z.object({
	id: z.string(),
	status: ticketStatus,
});

export const secretOutput = z.object({
	id: z.string(),
	name: z.string(),
	username: z.string().nullable(),
	updatedAt: z.string(),
});

export const secretListOutput = z.array(secretOutput);

export const secretSetInput = z.object({
	projectId: z.string(),
	name: z.string().trim().min(1).max(120),
	username: z.string().trim().max(200).default(""),
	value: z.string().min(1).max(4000),
});

export const secretRevealOutput = z.object({ value: z.string() });

export const portalOutput = z.object({
	milestones: milestoneListOutput,
	metrics: metricListOutput,
	onboarding: onboardingListOutput,
	decisions: decisionListOutput,
	tickets: ticketListOutput,
	secrets: secretListOutput,
});

export type Portal = z.infer<typeof portalOutput>;

export const guestPortalOutput = z.object({
	milestones: milestoneListOutput,
	metrics: metricListOutput,
	onboarding: onboardingListOutput,
	tickets: ticketListOutput,
});

export type GuestPortal = z.infer<typeof guestPortalOutput>;

export const guestApproveInput = z.object({
	token: z.string().min(1),
	milestoneId: z.string(),
	name: z.string().trim().min(1).max(80),
});

export const guestAnswerInput = z.object({
	token: z.string().min(1),
	itemId: z.string(),
	answer: z.string().trim().max(4000).default(""),
});

export const guestTicketInput = z.object({
	token: z.string().min(1),
	name: z.string().trim().min(1).max(80),
	title: z.string().trim().min(1).max(200),
	body: z.string().trim().max(4000).default(""),
});

export const flowDeleteOutput = z.object({ id: z.string() });

export const flowIdInput = z.object({ id: z.string() });

export const flowProjectIdInput = z.object({ projectId: z.string() });

export const flowTokenInput = z.object({ token: z.string().min(1) });
