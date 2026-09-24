import type { FlowCanvasDocument } from "@crm/validation/flow-canvas";
import { edge, node } from "./flow-demo";

export const FLOW_TEMPLATE_KEYS = ["LEADS", "ECOMMERCE", "WEBINAR"] as const;

export type FlowTemplateKey = (typeof FLOW_TEMPLATE_KEYS)[number];

export const FLOW_TEMPLATE_LABELS = {
	LEADS: "Captación de leads",
	ECOMMERCE: "E-commerce",
	WEBINAR: "Webinar / lanzamiento",
} as const satisfies Record<FlowTemplateKey, string>;

const leads: FlowCanvasDocument = {
	nodes: [
		node("c1", "campaign", 300, 0, { objective: "Leads", budget: "CBO · " }),
		node("a1", "adset", 0, 200, { name: "Intereses", budgetType: "CBO" }),
		node("a2", "adset", 600, 200, { name: "Retargeting", budgetType: "CBO" }),
		node("d1", "ad", 0, 400, { name: "UGC testimonio" }),
		node("d2", "ad", 300, 400, { name: "Beneficios · carrusel" }),
		node("d3", "ad", 600, 400, { name: "Oferta · reel" }),
		node("l1", "landing", 300, 600, { name: "Landing con formulario" }),
		node("e1", "email", 300, 800, { subject: "Gracias, próximos pasos" }),
	],
	edges: [
		edge("c1", "a1"),
		edge("c1", "a2"),
		edge("a1", "d1"),
		edge("a1", "d2"),
		edge("a2", "d3"),
		edge("d1", "l1"),
		edge("d2", "l1"),
		edge("d3", "l1"),
		edge("l1", "e1"),
	],
};

const ecommerce: FlowCanvasDocument = {
	nodes: [
		node("c1", "campaign", 300, 0, { objective: "Ventas", budget: "CBO · " }),
		node("a1", "adset", 0, 200, {
			name: "Prospecting · amplio",
			budgetType: "CBO",
		}),
		node("a2", "adset", 600, 200, {
			name: "Retargeting · carrito y visitas",
			budgetType: "CBO",
		}),
		node("d1", "ad", 0, 400, { name: "Producto estrella · video" }),
		node("d2", "ad", 300, 400, { name: "Catálogo dinámico" }),
		node("d3", "ad", 600, 400, { name: "Descuento primera compra" }),
		node("l1", "landing", 150, 600, { name: "Ficha de producto" }),
		node("l2", "landing", 600, 600, { name: "Colección / oferta" }),
		node("e1", "email", 400, 800, { subject: "Dejaste algo en el carrito" }),
	],
	edges: [
		edge("c1", "a1"),
		edge("c1", "a2"),
		edge("a1", "d1"),
		edge("a1", "d2"),
		edge("a2", "d3"),
		edge("d1", "l1"),
		edge("d2", "l1"),
		edge("d3", "l2"),
		edge("l1", "e1"),
		edge("l2", "e1"),
	],
};

const webinar: FlowCanvasDocument = {
	nodes: [
		node("c1", "campaign", 300, 0, { objective: "Leads", budget: "CBO · " }),
		node("a1", "adset", 300, 200, {
			name: "Audiencia fría · intereses",
			budgetType: "CBO",
		}),
		node("d1", "ad", 0, 400, { name: "Invitación · cara a cámara" }),
		node("d2", "ad", 300, 400, { name: "Promesa · texto" }),
		node("d3", "ad", 600, 400, { name: "Prueba social" }),
		node("l1", "landing", 300, 600, { name: "Registro al webinar" }),
		node("e1", "email", 0, 800, { subject: "Confirmación y agenda" }),
		node("e2", "email", 300, 800, { subject: "Recordatorio · empieza en 1 h" }),
		node("e3", "email", 600, 800, { subject: "Replay y oferta" }),
	],
	edges: [
		edge("c1", "a1"),
		edge("a1", "d1"),
		edge("a1", "d2"),
		edge("a1", "d3"),
		edge("d1", "l1"),
		edge("d2", "l1"),
		edge("d3", "l1"),
		edge("l1", "e1"),
		edge("e1", "e2"),
		edge("e2", "e3"),
	],
};

export const FLOW_TEMPLATES = {
	LEADS: leads,
	ECOMMERCE: ecommerce,
	WEBINAR: webinar,
} as const satisfies Record<FlowTemplateKey, FlowCanvasDocument>;
