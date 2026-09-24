import type {
	FlowCanvasDocument,
	FlowCanvasType,
	FlowEdge,
	FlowNode,
	FlowNodeKind,
} from "@crm/validation/flow-canvas";

type DemoAsset = {
	kind: "AD" | "LANDING" | "EMAIL" | "RESOURCE";
	title: string;
	url: string;
	notes: string;
	tags: string[];
};

type DemoChecklist = {
	title: string;
	items: { text: string; done: boolean }[];
};

type DemoCanvas = {
	type: FlowCanvasType;
	name: string;
	channel: string;
	document: FlowCanvasDocument;
};

export type DemoProject = {
	name: string;
	company: string;
	description: string;
	canvases: DemoCanvas[];
	assets: DemoAsset[];
	checklists: DemoChecklist[];
};

function node(
	id: string,
	type: FlowNodeKind,
	x: number,
	y: number,
	data: Record<string, string>,
): FlowNode {
	return { id, type, position: { x, y }, data };
}

function edge(source: string, target: string): FlowEdge {
	return { id: `${source}-${target}`, source, target };
}

const implantsJourney: FlowCanvasDocument = {
	nodes: [
		node("c1", "campaign", 450, 0, {
			name: "Implantes · Captación de leads",
			objective: "Leads",
			budget: "CBO · 60 €/día",
			strategy:
				"Arrancar con dos conjuntos: intereses amplios y retargeting. Escalar +20 % cada 3 días si el CPL queda por debajo de 25 €.",
		}),
		node("a1", "adset", 150, 200, {
			name: "Intereses dental · 35-65",
			audience:
				"Mujeres y hombres 35-65, radio 25 km de Valencia. Intereses: salud dental, estética, implantes.",
			optimization: "Leads · formulario instantáneo",
			budget: "Dentro del CBO",
			budgetType: "CBO",
			notes: "Excluir clientes actuales (lista del CRM).",
		}),
		node("a2", "adset", 750, 200, {
			name: "Retargeting web 30 días",
			audience:
				"Visitantes de la web en los últimos 30 días + interacción con Instagram en 60 días.",
			optimization: "Leads · formulario instantáneo",
			budget: "Dentro del CBO",
			budgetType: "CBO",
		}),
		node("d1", "ad", 0, 400, {
			name: "Testimonio Laura (UGC)",
			creativeUrl: "https://placehold.co/1080x1350.png?text=UGC+Laura",
			copy: "«Tenía miedo al dentista y en 24 h salí con mi implante puesto.» Valoración gratuita esta semana.",
			description:
				"Implantes con sedación consciente. Financiación sin intereses.",
			cta: "Pedir valoración",
			tags: "#UGC #Testimonio #Hook3s",
			notes: "Grabado en vertical; pedir versión con subtítulos grandes.",
		}),
		node("d2", "ad", 300, 400, {
			name: "Antes y después · carrusel",
			creativeUrl: "https://placehold.co/1080x1080.png?text=Antes+%2F+Despues",
			copy: "Mirá el cambio en 3 semanas. Implantes de carga inmediata, sin esperar meses.",
			cta: "Ver casos",
			tags: "#Carrusel #PruebaSocial",
		}),
		node("d3", "ad", 600, 400, {
			name: "Oferta valoración gratuita",
			creativeUrl: "https://placehold.co/1080x1920.png?text=Reel+Oferta",
			description: "Reel 9:16 de 15 segundos.",
			tags: "#Reel #Oferta",
		}),
		node("d4", "ad", 900, 400, {
			name: "Recordatorio · última semana",
			copy: "Última semana con valoración y TAC gratis. Quedan pocas plazas.",
			cta: "Reservar",
		}),
		node("l1", "landing", 300, 600, {
			name: "Landing valoración gratuita",
			url: "https://acmedental.example/valoracion",
			notes:
				"Formulario de 3 campos + botón de WhatsApp. Pixel y CAPI activos.",
		}),
		node("l2", "landing", 750, 600, {
			name: "Landing retargeting",
		}),
		node("e1", "email", 300, 800, {
			subject: "Tu valoración gratuita: elegí día y hora",
			copy: "Hola {nombre}, gracias por pedir tu valoración. Reservá tu cita en dos clics y llegá con el TAC ya hecho.",
			cta: "Reservar cita",
		}),
	],
	edges: [
		edge("c1", "a1"),
		edge("c1", "a2"),
		edge("a1", "d1"),
		edge("a1", "d2"),
		edge("a2", "d3"),
		edge("a2", "d4"),
		edge("d1", "l1"),
		edge("d2", "l1"),
		edge("d3", "l2"),
		edge("d4", "l2"),
		edge("l1", "e1"),
	],
};

const searchMap: FlowCanvasDocument = {
	nodes: [
		node("c1", "campaign", 300, 0, {
			name: "Search · Implantes Valencia",
			objective: "Leads",
			budget: "ABO · 40 €/día",
		}),
		node("a1", "adset", 0, 200, {
			name: "Implantes dentales Valencia",
			audience:
				"Keywords: implantes dentales valencia, precio implante dental, clínica implantes valencia.",
			optimization: "Maximizar conversiones · CPA objetivo 30 €",
			budget: "25 €/día",
			budgetType: "ABO",
		}),
		node("a2", "adset", 600, 200, {
			name: "Competencia",
			audience:
				"Keywords de marca de competidores + «implantes» (concordancia de frase).",
			optimization: "Maximizar clics · CPC máx. 1,2 €",
			budget: "15 €/día",
			budgetType: "ABO",
		}),
	],
	edges: [edge("c1", "a1"), edge("c1", "a2")],
};

const anglesMap: FlowCanvasDocument = {
	nodes: [
		node("n0", "note", 450, 0, { label: "Ángulos para implantes" }),
		node("n1", "note", 0, 200, {
			label: "Miedo al dolor → sedación consciente + testimonio real",
		}),
		node("n2", "note", 300, 200, {
			label: "Precio → financiación 0 % en 24 cuotas",
		}),
		node("n3", "note", 600, 200, {
			label: "Tiempo → implante en 24 h, carga inmediata",
		}),
		node("n4", "note", 900, 200, {
			label: "Desconfianza → 1.200 pacientes, 4,9 ★ en Google",
		}),
		node("n5", "note", 300, 400, {
			label: "Hook: «¿Cuánto te cuesta no hacértelo?»",
		}),
	],
	edges: [
		edge("n0", "n1"),
		edge("n0", "n2"),
		edge("n0", "n3"),
		edge("n0", "n4"),
		edge("n2", "n5"),
	],
};

const gymJourney: FlowCanvasDocument = {
	nodes: [
		node("c1", "campaign", 300, 0, {
			name: "Reto 21 días · Enero",
			objective: "Mensajes",
			budget: "CBO · 30 €/día",
		}),
		node("a1", "adset", 300, 200, {
			name: "Zona norte · 25-45",
		}),
		node("d1", "ad", 150, 400, {
			name: "Reel resultados del reto",
		}),
		node("d2", "ad", 450, 400, {
			name: "Historia de Marta",
			creativeUrl: "https://placehold.co/1080x1920.png?text=Historia+Marta",
			copy: "Marta perdió 6 kg en 21 días entrenando 3 veces por semana. Empezá el lunes con nosotros.",
			cta: "Enviar mensaje",
			tags: "#Reel #Testimonio",
		}),
		node("l1", "landing", 300, 600, {
			name: "WhatsApp del gimnasio",
			url: "https://wa.me/34600000000",
		}),
	],
	edges: [
		edge("c1", "a1"),
		edge("a1", "d1"),
		edge("a1", "d2"),
		edge("d1", "l1"),
		edge("d2", "l1"),
	],
};

export const FLOW_DEMO_PROJECTS: readonly DemoProject[] = [
	{
		name: "Acme Dental · Captación implantes",
		company: "Acme Dental",
		description:
			"Campaña de leads para implantes dentales en Valencia. Meta como canal principal y Google Search de apoyo.",
		canvases: [
			{
				type: "JOURNEY",
				name: "Meta · Implantes dentales",
				channel: "Meta",
				document: implantsJourney,
			},
			{
				type: "CAMPAIGN",
				name: "Google · Búsqueda de marca y competencia",
				channel: "Google",
				document: searchMap,
			},
			{
				type: "MIND",
				name: "Ángulos y objeciones",
				channel: "",
				document: anglesMap,
			},
		],
		assets: [
			{
				kind: "AD",
				title: "Competidor · reel testimonio",
				url: "https://www.facebook.com/ads/library/",
				notes:
					"Hook fuerte en los primeros 2 segundos, subtítulos grandes. Copiar la estructura, no el mensaje.",
				tags: ["Competencia", "UGC"],
			},
			{
				kind: "LANDING",
				title: "Referencia · landing de valoración",
				url: "https://www.example.com/valoracion",
				notes: "Formulario arriba del pliegue y WhatsApp flotante.",
				tags: ["Landing", "High Ticket"],
			},
			{
				kind: "RESOURCE",
				title: "Guía de marca Acme Dental",
				url: "https://drive.google.com/",
				notes: "Logos, colores y tipografías.",
				tags: ["Marca"],
			},
		],
		checklists: [
			{
				title: "Pre-campaña",
				items: [
					{ text: "Pixel de Meta instalado y verificado", done: true },
					{ text: "Eventos CAPI: Lead y Schedule", done: true },
					{ text: "Formulario de la landing probado en móvil", done: false },
					{
						text: "Lista de exclusión de clientes actuales subida",
						done: false,
					},
				],
			},
			{
				title: "Creativos",
				items: [
					{ text: "3 hooks distintos para el UGC", done: true },
					{ text: "Versiones 9:16 y 1:1", done: false },
					{ text: "Subtítulos quemados", done: false },
				],
			},
			{
				title: "Lanzamiento",
				items: [
					{ text: "Aprobación del cliente (enlace enviado)", done: false },
					{ text: "Presupuesto cargado y límite de cuenta", done: false },
					{ text: "Revisión a las 48 h", done: false },
				],
			},
		],
	},
	{
		name: "Gimnasio Vital · Reto 21 días",
		company: "Gimnasio Vital",
		description:
			"Captación para el reto de 21 días de enero. Objetivo: conversaciones por WhatsApp.",
		canvases: [
			{
				type: "JOURNEY",
				name: "Meta · Reto 21 días",
				channel: "Meta",
				document: gymJourney,
			},
		],
		assets: [],
		checklists: [
			{
				title: "Pre-campaña",
				items: [
					{ text: "Número de WhatsApp Business verificado", done: true },
					{ text: "Respuestas rápidas cargadas", done: false },
				],
			},
		],
	},
];
