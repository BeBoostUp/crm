import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { FlowService } from "../src/flow/flow.service";
import { FlowPortalService } from "../src/flow/flow-portal.service";

const suffix = crypto.randomUUID();
const adminId = `portal-admin-${suffix}`;
const editorId = `portal-editor-${suffix}`;
const flow = new FlowService(db);
const service = new FlowPortalService(db, flow);
let projectId = "";
let token = "";

beforeAll(async () => {
	process.env.FLOW_VAULT_KEY ??= `test-vault-${suffix}`;
	await db.user.createMany({
		data: [
			{ id: adminId, name: "Portal Admin", email: `${adminId}@example.test` },
			{
				id: editorId,
				name: "Portal Editor",
				email: `${editorId}@example.test`,
			},
		],
	});
	const project = await flow.createProject(
		{ name: "Portal", companyId: null, description: "" },
		adminId,
	);
	projectId = project.id;
	await flow.setMember(
		{
			projectId,
			userId: editorId,
			role: "EDITOR",
			permissions: {
				canvases: {},
				channels: null,
				canUpload: null,
				canExport: null,
			},
		},
		adminId,
	);
	token = (await flow.createGuestLink(projectId, false, adminId)).token;
});

afterAll(async () => {
	await db.flowProject.deleteMany({ where: { createdById: adminId } });
	await db.user.deleteMany({ where: { id: { in: [adminId, editorId] } } });
});

describe("FlowPortalService", () => {
	it("creates default milestones and onboarding once, hides secrets from editors", async () => {
		const first = await service.portal(projectId, adminId);
		const again = await service.portal(projectId, editorId);

		expect(first.milestones).toHaveLength(4);
		expect(
			first.onboarding.filter((item) => item.kind === "ASSET"),
		).toHaveLength(5);
		expect(again.milestones.map((item) => item.id)).toEqual(
			first.milestones.map((item) => item.id),
		);
		expect(again.secrets).toEqual([]);
		await expect(service.portal(projectId, `nobody-${suffix}`)).rejects.toThrow(
			/No existe el proyecto/,
		);
	});

	it("lets the client approve only delivered milestones", async () => {
		const [pending, next] = (await service.portal(projectId, adminId))
			.milestones;
		if (!pending || !next) throw new Error("defaults missing");
		await service.updateMilestone(
			{ id: pending.id, status: "DELIVERED" },
			editorId,
		);

		await expect(
			service.guestApprove(token, next.id, "Cliente"),
		).rejects.toThrow(/Solo se aprueban hitos entregados/);
		const approved = await service.guestApprove(token, pending.id, "Cliente");
		expect(approved.status).toBe("APPROVED");
		expect(approved.approvedBy).toBe("Cliente");

		const reopened = await service.updateMilestone(
			{ id: pending.id, status: "IN_PROGRESS" },
			adminId,
		);
		expect(reopened.approvedBy).toBeNull();
	});

	it("upserts one metric row per week", async () => {
		const base = {
			projectId,
			weekStart: "2026-09-21",
			spend: 400,
			leads: 20,
			booked: 10,
			attended: 6,
			sales: 1,
			notes: "",
		};
		await service.upsertMetric(base, editorId);
		await service.upsertMetric({ ...base, attended: 7 }, editorId);

		const guest = await service.guestPortal(token);
		expect(guest.metrics).toHaveLength(1);
		expect(guest.metrics[0]?.attended).toBe(7);
		expect(guest.metrics[0]?.weekStart).toBe("2026-09-21");
	});

	it("records client answers, asset deliveries and tickets through the guest link", async () => {
		const { onboarding } = await service.guestPortal(token);
		const question = onboarding.find((item) => item.kind === "QUESTION");
		const asset = onboarding.find((item) => item.kind === "ASSET");
		if (!question || !asset) throw new Error("defaults missing");

		const answered = await service.guestAnswer(
			token,
			question.id,
			"Clínica dental",
		);
		expect(answered).toMatchObject({ answer: "Clínica dental", done: true });
		const delivered = await service.guestAnswer(token, asset.id, "secret");
		expect(delivered).toMatchObject({ answer: null, done: true });

		const opened = await service.guestTicket(token, "Ana", "Landing caída", "");
		expect(opened).toMatchObject({ author: "Ana", status: "OPEN", body: null });
		const resolved = await service.updateTicket(
			opened.id,
			"RESOLVED",
			editorId,
		);
		expect(resolved.status).toBe("RESOLVED");

		await flow.revokeGuestLink(projectId, adminId);
		await expect(service.guestPortal(token)).rejects.toThrow(
			/ya no está activo/,
		);
	});

	it("keeps vault secrets encrypted and admin-only", async () => {
		const stored = await service.setSecret(
			projectId,
			"Meta Business",
			"ads@cliente.test",
			"p4ssw0rd",
			adminId,
		);
		const raw = await db.flowSecret.findUniqueOrThrow({
			where: { id: stored.id },
		});
		expect(raw.ciphertext).not.toContain("p4ssw0rd");
		expect(await service.revealSecret(stored.id, adminId)).toEqual({
			value: "p4ssw0rd",
		});
		await expect(service.revealSecret(stored.id, editorId)).rejects.toThrow();
		await expect(
			service.setSecret(projectId, "X", "", "y", editorId),
		).rejects.toThrow();

		const decision = await service.createDecision(
			projectId,
			"Optimizar a cita asistida",
			"El CPA por lead engañaba",
			editorId,
		);
		expect(decision.author).toBe("Portal Editor");
	});
});
