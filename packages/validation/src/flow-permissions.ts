import { z } from "zod";
import { parse } from "./index";

export const FLOW_CHANNEL_KEYS = [
	"GENERAL",
	"INTERNAL",
	"CREATIVE",
	"CLIENT",
] as const;

export type FlowChannelKey = (typeof FLOW_CHANNEL_KEYS)[number];

export const FLOW_CHANNEL_LABELS = {
	GENERAL: "General",
	INTERNAL: "Equipo interno",
	CREATIVE: "Creatividad",
	CLIENT: "Cliente",
} as const satisfies Record<FlowChannelKey, string>;

export const flowCanvasAccess = z.enum(["edit", "view", "none"]);

export type FlowCanvasAccess = z.infer<typeof flowCanvasAccess>;

export const flowMemberPermissions = z.object({
	canvases: z.record(z.string(), flowCanvasAccess).default({}),
	channels: z.array(z.enum(FLOW_CHANNEL_KEYS)).nullable().default(null),
	canUpload: z.boolean().nullable().default(null),
	canExport: z.boolean().nullable().default(null),
});

export type FlowMemberPermissions = z.infer<typeof flowMemberPermissions>;

export const EMPTY_FLOW_PERMISSIONS: FlowMemberPermissions = {
	canvases: {},
	channels: null,
	canUpload: null,
	canExport: null,
};

export function parseFlowMemberPermissions(
	value: unknown,
): FlowMemberPermissions {
	if (value === null || value === undefined) return EMPTY_FLOW_PERMISSIONS;
	return parse(flowMemberPermissions, value, "flow member permissions");
}

export const FLOW_LIMITS = {
	projects: 100,
	canvasesPerProject: 25,
	assetsPerProject: 300,
	membersPerProject: 25,
	messageLength: 4000,
	commentLength: 2000,
} as const;
