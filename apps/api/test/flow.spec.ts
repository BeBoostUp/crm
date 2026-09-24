import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { FlowService } from "../src/flow/flow.service";

const suffix = crypto.randomUUID();
const adminId = `flow-admin-${suffix}`;
const outsiderId = `flow-outsider-${suffix}`;
const service = new FlowService(db);
let projectId = "";

beforeAll(async () => {
	await db.user.createMany({
		data: [
			{ id: adminId, name: "Flow Admin", email: `${adminId}@example.test` },
			{
				id: outsiderId,
				name: "Flow Outsider",
				email: `${outsiderId}@example.test`,
			},
		],
	});
});

afterAll(async () => {
	await db.flowProject.deleteMany({ where: { createdById: adminId } });
	await db.user.deleteMany({ where: { id: { in: [adminId, outsiderId] } } });
});

describe("FlowService", () => {
	it("makes the creator an admin and hides the project from outsiders", async () => {
		const project = await service.createProject(
			{ name: "Launch", companyId: null, description: "" },
			adminId,
		);
		projectId = project.id;

		expect(project.role).toBe("ADMIN");
		expect(project.members.map((member) => member.userId)).toEqual([adminId]);
		await expect(service.getProject(projectId, outsiderId)).rejects.toThrow(
			/No flow project/,
		);
		expect(await service.listProjects(outsiderId)).toEqual([]);
	});

	it("scores completeness when a canvas is saved", async () => {
		const canvas = await service.createCanvas(
			{ projectId, type: "JOURNEY", name: "Meta", channel: "" },
			adminId,
		);
		const saved = await service.saveCanvas(
			canvas.id,
			{
				nodes: [
					{
						id: "c1",
						type: "campaign",
						position: { x: 0, y: 0 },
						data: { name: "Summer", objective: "Leads", strategy: "secret" },
					},
					{
						id: "l1",
						type: "landing",
						position: { x: 0, y: 200 },
						data: { name: "Home" },
					},
				],
				edges: [{ id: "e1", source: "c1", target: "l1" }],
			},
			adminId,
		);

		expect(saved.completeness).toBe(50);
		const read = await service.getCanvas(canvas.id, adminId);
		expect(read.document.nodes).toHaveLength(2);
		expect(read.canEdit).toBe(true);
	});

	it("shares read-only through a guest link without internal notes", async () => {
		const { token } = await service.createGuestLink(projectId, adminId);
		const view = await service.guestView(token);

		expect(view.project.name).toBe("Launch");
		const campaign = view.canvases[0]?.document.nodes.find(
			(node) => node.id === "c1",
		);
		expect(campaign?.data.objective).toBe("Leads");
		expect(campaign?.data.strategy).toBeUndefined();

		await service.revokeGuestLink(projectId, adminId);
		await expect(service.guestView(token)).rejects.toThrow(/no longer active/);
	});

	it("seeds the demo projects once", async () => {
		const first = await service.seedDemo(outsiderId);
		const second = await service.seedDemo(outsiderId);

		expect(first.length).toBe(2);
		expect(second.length).toBe(2);
		expect(first.every((project) => project.role === "ADMIN")).toBe(true);
		expect(
			first.find((project) => project.name.startsWith("Acme"))?.completeness,
		).toBeGreaterThan(0);
		await db.flowProject.deleteMany({ where: { createdById: outsiderId } });
		await db.company.deleteMany({ where: { ownerId: outsiderId } });
	});

	it("keeps viewers out of edits and protects the last admin", async () => {
		await service.setMember(projectId, outsiderId, "VIEWER", adminId);

		await expect(
			service.createChecklist(projectId, "Pre-launch", outsiderId),
		).rejects.toThrow(/Viewers/);
		await expect(
			service.setMember(projectId, adminId, "EDITOR", adminId),
		).rejects.toThrow(/at least one admin/);
	});
});
