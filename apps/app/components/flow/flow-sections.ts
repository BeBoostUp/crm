export const FLOW_SECTIONS = {
	onboarding: "Onboarding",
	hitos: "Hitos",
	resumen: "Resumen ejecutivo",
	facturacion: "Propuesta y facturación",
	atribucion: "Atribución",
	contenido: "Contenido",
	soporte: "Soporte",
	docs: "Documentación",
	plantillas: "Plantillas y equipo",
} as const;

export type FlowSection = keyof typeof FLOW_SECTIONS;

export function isFlowSection(value: string): value is FlowSection {
	return Object.hasOwn(FLOW_SECTIONS, value);
}

export const PROJECT_PLACEHOLDER = "{project}";

export function currentFlowProjectId(pathname: string): string | null {
	return pathname.match(/\/flow\/([^/]+)/)?.[1] ?? null;
}
