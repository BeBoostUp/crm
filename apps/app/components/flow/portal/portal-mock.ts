export type MilestoneStatus =
	| "pendiente"
	| "en curso"
	| "entregado"
	| "aprobado";

export const PORTAL_MOCK = {
	milestones: [
		{
			id: "m1",
			title: "Kick-off y plan de campaña",
			due: "02 oct",
			status: "aprobado" as MilestoneStatus,
			deliverables: [
				"Customer journey Meta",
				"Mapa de campañas Google",
				"Ángulos y objeciones",
			],
			approvedBy: "Laura (cliente) · 03 oct",
		},
		{
			id: "m2",
			title: "Creativos y landing",
			due: "09 oct",
			status: "entregado" as MilestoneStatus,
			deliverables: [
				"4 anuncios (UGC, carrusel, 2 reels)",
				"Landing de valoración",
				"Email de confirmación",
			],
			approvedBy: null,
		},
		{
			id: "m3",
			title: "Lanzamiento",
			due: "14 oct",
			status: "en curso" as MilestoneStatus,
			deliverables: [
				"Campañas activas en Meta y Google",
				"Pixel + CAPI verificados",
			],
			approvedBy: null,
		},
		{
			id: "m4",
			title: "Optimización semana 1-2",
			due: "28 oct",
			status: "pendiente" as MilestoneStatus,
			deliverables: ["Informe de CPA por cita", "Nuevos creativos según datos"],
			approvedBy: null,
		},
	],
	kpis: [
		{
			label: "Inversión",
			value: "3.240 €",
			delta: "+12 % vs. semana anterior",
		},
		{ label: "Leads", value: "186", delta: "17,4 € por lead" },
		{ label: "Citas agendadas", value: "71", delta: "38 % de los leads" },
		{ label: "Citas asistidas", value: "44", delta: "CPA 73,6 €" },
	],
	weeks: [
		{ label: "S1", spend: 620, leads: 31, visits: 6 },
		{ label: "S2", spend: 780, leads: 44, visits: 10 },
		{ label: "S3", spend: 890, leads: 52, visits: 13 },
		{ label: "S4", spend: 950, leads: 59, visits: 15 },
	],
	proposal: {
		title: "Propuesta · Captación implantes Q4",
		price: "4.500 € / mes",
		setup: "1.500 € de puesta en marcha",
		scope: [
			"Estrategia y mapas de campaña (Meta + Google)",
			"Producción de 4 creativos al mes",
			"Landing y automatización de citas",
			"Atribución server-side y resumen ejecutivo semanal",
		],
		status: "aceptada" as const,
		acceptedAt: "30 sep",
	},
	invoices: [
		{
			number: "F-2026-041",
			date: "01 oct",
			amount: "1.500 €",
			concept: "Puesta en marcha",
			status: "pagada" as const,
		},
		{
			number: "F-2026-047",
			date: "01 oct",
			amount: "4.500 €",
			concept: "Octubre",
			status: "enviada" as const,
		},
		{
			number: "F-2026-052",
			date: "01 nov",
			amount: "4.500 €",
			concept: "Noviembre",
			status: "borrador" as const,
		},
	],
	events: [
		{
			at: "hoy 10:42",
			type: "Cita asistida",
			source: "meta · ugc_laura",
			utm: "spring_leads / adset_intereses",
			meta: "enviado",
			google: "—",
		},
		{
			at: "hoy 09:15",
			type: "Cita agendada",
			source: "google · search_marca",
			utm: "search_marca / implantes_madrid",
			meta: "—",
			google: "enviado",
		},
		{
			at: "ayer 18:03",
			type: "Lead",
			source: "meta · antes_despues",
			utm: "spring_leads / retargeting",
			meta: "enviado",
			google: "—",
		},
		{
			at: "ayer 12:30",
			type: "Cita asistida",
			source: "meta · reel_oferta",
			utm: "spring_leads / retargeting",
			meta: "reintentando",
			google: "—",
		},
	],
	attribution: {
		pixel: "1234567890",
		capi: "conectado · último evento hace 3 min",
		utms: [
			"utm_source",
			"utm_medium",
			"utm_campaign",
			"utm_content",
			"utm_term",
			"fbclid",
			"gclid",
			"landing",
		],
		reconciliation: "cada noche 03:00 · 0 duplicados · 2 huecos corregidos",
	},
	sources: [
		{
			title: "Reunión mensual · 20 sep",
			kind: "Transcripción",
			minutes: 54,
			status: "procesada",
		},
		{
			title: "Clase: cómo elegir implante",
			kind: "Grabación",
			minutes: 38,
			status: "procesada",
		},
		{
			title: "Notas del equipo médico",
			kind: "Documento",
			minutes: 0,
			status: "pendiente",
		},
	],
	pieces: [
		{
			channel: "LinkedIn",
			title: "3 mitos sobre los implantes en 24 h",
			status: "aprobado",
			style: "Dra. Pérez · cercano",
		},
		{
			channel: "Newsletter",
			title: "Lo que nadie te cuenta del precio",
			status: "borrador",
			style: "Clínica · didáctico",
		},
		{
			channel: "Instagram",
			title: "Antes y después: 3 semanas",
			status: "publicado",
			style: "Clínica · visual",
		},
		{
			channel: "Podcast",
			title: "Guion · El miedo al dentista",
			status: "borrador",
			style: "Dra. Pérez · conversacional",
		},
	],
	docs: [
		{ title: "Brief del proyecto", updated: "28 sep", by: "Thiago" },
		{ title: "Guía de marca y tono", updated: "29 sep", by: "Laura (cliente)" },
		{
			title: "Setup técnico: pixel, CAPI, landing",
			updated: "03 oct",
			by: "Miguel",
		},
	],
	decisions: [
		{
			date: "03 oct",
			title: "Optimizar a cita asistida en vez de lead",
			why: "El CPL era bueno pero el 60 % de los leads no llegaba a la clínica.",
			by: "Thiago",
		},
		{
			date: "07 oct",
			title: "Pausar el carrusel antes/después",
			why: "CTR 0,6 % frente al 1,9 % del UGC.",
			by: "Miguel",
		},
	],
	vault: [
		{
			name: "Meta Business Manager",
			user: "ads@acmedental.example",
			updated: "28 sep",
		},
		{ name: "Google Ads", user: "ads@acmedental.example", updated: "28 sep" },
		{ name: "WordPress (landing)", user: "editor", updated: "02 oct" },
	],
} as const;

export const PORTAL_MOCK_2 = {
	onboarding: {
		progress: 62,
		questions: [
			{
				q: "¿Cuál es el objetivo principal de la campaña?",
				a: "Citas de valoración para implantes",
				done: true,
			},
			{
				q: "¿Ticket medio y margen por tratamiento?",
				a: "2.400 € · 55 %",
				done: true,
			},
			{ q: "¿Zona de captación?", a: "Valencia y 25 km", done: true },
			{ q: "Casos de éxito y testimonios disponibles", a: "", done: false },
		],
		assets: [
			{ name: "Meta Business Manager (acceso socio)", status: "recibido" },
			{ name: "Pixel / Dataset de Meta", status: "recibido" },
			{ name: "Google Ads (acceso administrador)", status: "pendiente" },
			{ name: "GA4 y dominio de la landing", status: "pendiente" },
			{ name: "Acceso al CRM de la clínica", status: "recibido" },
		],
		welcome:
			"Hola Laura, bienvenida a FlowAds. Desde este portal vas a ver tu plan, entregar los accesos que te pedimos y seguir cada hito. Primer paso: completar 4 preguntas (5 min).",
		sops: [
			"SOP · Publicar una campaña en Meta",
			"SOP · Revisar CAPI cada lunes",
			"SOP · Reporte semanal al cliente",
		],
	},
	tiers: [
		{
			name: "Self-service",
			price: "149 € / mes",
			for: "El cliente opera con plantillas, checklist y soporte IA; clase semanal grupal.",
			features: [
				"Plantillas de embudo",
				"AdLibrary y checklists",
				"Soporte IA con contexto",
				"Sin gestión 1:1",
			],
		},
		{
			name: "Full-service",
			price: "desde 3.000 € / mes",
			for: "La agencia opera; el cliente ve el portal, aprueba hitos y recibe el resumen ejecutivo.",
			features: [
				"Todo lo anterior",
				"Equipo asignado",
				"Atribución server-side",
				"Contenido derivado de reuniones",
			],
		},
	],
	support: {
		thread: [
			{
				who: "Laura (cliente)",
				text: "¿En qué fase estamos y qué falta de mi parte?",
			},
			{
				who: "Asistente FlowAds",
				text: "Estamos en «Lanzamiento» (hito 3 de 4). De tu parte faltan 2 accesos: Google Ads y GA4. El resto está recibido. ¿Te mando el paso a paso?",
			},
			{
				who: "Laura (cliente)",
				text: "Sí, y quiero cambiar el horario de atención del formulario.",
			},
			{
				who: "Asistente FlowAds",
				text: "Abrí el ticket #14 «Horario del formulario» para el equipo. Si me das el acceso al CRM lo cambio yo ahora.",
			},
		],
		tickets: [
			{
				id: "#14",
				title: "Horario del formulario",
				status: "abierto",
				owner: "Miguel",
			},
			{
				id: "#12",
				title: "Logo en la landing pixelado",
				status: "resuelto",
				owner: "Diseño",
			},
		],
	},
	eventMap: [
		{
			node: "Landing valoración",
			event: "Scroll 50 % · Vídeo 25 %",
			received: "1.204 / 1.204",
		},
		{ node: "Formulario", event: "Lead", received: "186 / 186" },
		{
			node: "CRM · agenda",
			event: "Cita reservada · Cualificado",
			received: "71 / 73",
		},
		{ node: "Clínica", event: "Cita asistida", received: "44 / 44" },
		{ node: "Cobro", event: "Venta · Cobro", received: "12 / 12" },
	],
	templates: [
		{
			name: "Captación de leads · Meta",
			version: "v3",
			instances: 14,
			pending: 5,
		},
		{ name: "E-commerce · catálogo", version: "v2", instances: 6, pending: 0 },
		{ name: "Webinar / lanzamiento", version: "v4", instances: 9, pending: 9 },
	],
	meetings: [
		{
			title: "Reunión mensual · 20 sep",
			folder: "Cliente",
			tasks: ["Pausar carrusel antes/después", "Pedir 2 testimonios en vídeo"],
		},
		{
			title: "Sync equipo · 23 sep",
			folder: "Equipo",
			tasks: ["Subir versión 9:16 del UGC"],
		},
	],
	starterKit: [
		{ text: "Leer el brief y la guía de marca", done: true },
		{ text: "Revisar el mapa de eventos y el SOP de CAPI", done: true },
		{ text: "Acceso a Business Manager y Google Ads", done: false },
		{ text: "Primera revisión de campaña con el account", done: false },
	],
} as const;
