import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@crm/db";
import { FlowService } from "../src/flow/flow.service";

const suffix = crypto.randomUUID();
const adminId = `flow-admin-${suffix}`;
const outsiderId = `flow-outsider-${suffix}`;
const service = new FlowService(db);
let projectId = "";
let canvasId = "";

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
		expect(project.me.canUpload).toBe(true);
		await expect(service.getProject(projectId, outsiderId)).rejects.toThrow(
			/No existe el proyecto/,
		);
		expect(await service.listProjects(outsiderId)).toEqual([]);
	});

	it("scores completeness when a canvas is saved", async () => {
		const canvas = await service.createCanvas(
			{ projectId, type: "JOURNEY", name: "Meta", channel: "", template: null },
			adminId,
		);
		canvasId = canvas.id;
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

	it("builds a canvas from a template", async () => {
		const canvas = await service.createCanvas(
			{
				projectId,
				type: "JOURNEY",
				name: "Plantilla",
				channel: "Meta",
				template: "LEADS",
			},
			adminId,
		);
		expect(canvas.nodeCount).toBeGreaterThan(5);
		expect(canvas.completeness).toBeLessThan(100);
	});

	it("shares read-only through a guest link, with comments when allowed", async () => {
		const { token } = await service.createGuestLink(projectId, true, adminId);
		const view = await service.guestView(token);

		expect(view.project.name).toBe("Launch");
		expect(view.project.canComment).toBe(true);
		const campaign = view.canvases[0]?.document.nodes.find(
			(node) => node.id === "c1",
		);
		expect(campaign?.data.objective).toBe("Leads");
		expect(campaign?.data.strategy).toBeUndefined();

		const posted = await service.guestComment({
			token,
			canvasId,
			nodeId: "c1",
			authorName: "Cliente",
			body: "Me gusta el ángulo.",
		});
		expect(posted.canvasId).toBe(canvasId);
		const project = await service.getProject(projectId, adminId);
		expect(project.comments.map((entry) => entry.body)).toContain(
			"Me gusta el ángulo.",
		);

		await service.revokeGuestLink(projectId, adminId);
		await expect(service.guestView(token)).rejects.toThrow(/ya no está activo/);
	});

	it("applies per-canvas permissions and protects the last admin", async () => {
		await service.setMember(
			{
				projectId,
				userId: outsiderId,
				role: "EDITOR",
				permissions: {
					canvases: { [canvasId]: "view" },
					channels: ["GENERAL"],
					canUpload: false,
					canExport: null,
				},
			},
			adminId,
		);

		const canvas = await service.getCanvas(canvasId, outsiderId);
		expect(canvas.canEdit).toBe(false);
		await expect(
			service.saveCanvas(canvasId, { nodes: [], edges: [] }, outsiderId),
		).rejects.toThrow(/permiso para editar/);
		await expect(service.assertUploader(projectId, outsiderId)).rejects.toThrow(
			/subir archivos/,
		);

		const channels = await service.chatChannels(projectId, outsiderId);
		expect(channels.map((channel) => channel.key)).toEqual(["GENERAL"]);
		const general = channels[0];
		if (!general) throw new Error("expected a channel");
		await service.chatSend(
			{ channelId: general.id, body: "Hola equipo", file: null },
			outsiderId,
		);
		const messages = await service.chatMessages(general.id, undefined, adminId);
		expect(messages.at(-1)?.body).toBe("Hola equipo");

		await expect(
			service.setMember(
				{ projectId, userId: adminId, role: "EDITOR" },
				adminId,
			),
		).rejects.toThrow(/al menos un admin/);
	});

	it("nests subtasks and reorders items", async () => {
		const list = await service.createChecklist(
			projectId,
			"Pre-lanzamiento",
			adminId,
		);
		const withParent = await service.addChecklistItem(
			{ checklistId: list.id, text: "Pixel", parentId: null },
			adminId,
		);
		const parent = withParent.items[0];
		if (!parent) throw new Error("expected an item");
		const withChild = await service.addChecklistItem(
			{
				checklistId: list.id,
				text: "Verificar evento Lead",
				parentId: parent.id,
			},
			adminId,
		);
		expect(
			withChild.items.find((item) => item.parentId === parent.id),
		).toBeDefined();
		await expect(
			service.addChecklistItem(
				{
					checklistId: list.id,
					text: "Nieta",
					parentId:
						withChild.items.find((item) => item.parentId === parent.id)?.id ??
						"",
				},
				adminId,
			),
		).rejects.toThrow(/un nivel/);

		const second = await service.addChecklistItem(
			{ checklistId: list.id, text: "CAPI", parentId: null },
			adminId,
		);
		const ids = second.items.map((item) => item.id).reverse();
		const reordered = await service.reorderChecklistItems(
			list.id,
			ids,
			adminId,
		);
		expect(reordered.items.map((item) => item.id)).toEqual(ids);
	});

	it("seeds the demo projects once", async () => {
		const first = await service.seedDemo(outsiderId);
		const second = await service.seedDemo(outsiderId);

		const demo = (list: typeof first) =>
			list.filter((project) => /Acme Dental|Gimnasio Vital/.test(project.name));
		expect(demo(first).length).toBe(2);
		expect(demo(second).length).toBe(2);
		await db.flowProject.deleteMany({ where: { createdById: outsiderId } });
		await db.company.deleteMany({ where: { ownerId: outsiderId } });
	});
});
