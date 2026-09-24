import { upload } from "@vercel/blob/client";

export const FLOW_UPLOAD = {
	imageMaxBytes: 5 * 1024 * 1024,
	videoMaxBytes: 30 * 1024 * 1024,
	pdfMaxBytes: 10 * 1024 * 1024,
	imageMaxSide: 1920,
	imageQuality: 0.82,
	accept:
		"image/png,image/jpeg,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,video/webm",
} as const;

export type FlowUploadKind = "asset" | "logo" | "thumbnail";

export type FlowUploaded = {
	url: string;
	contentType: string;
	size: number;
	name: string;
};

export function flowFileLimit(contentType: string): number {
	if (contentType.startsWith("video/")) return FLOW_UPLOAD.videoMaxBytes;
	if (contentType === "application/pdf") return FLOW_UPLOAD.pdfMaxBytes;
	return FLOW_UPLOAD.imageMaxBytes;
}

export async function compressImage(file: File): Promise<File> {
	if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(
		1,
		FLOW_UPLOAD.imageMaxSide / Math.max(bitmap.width, bitmap.height),
	);
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/webp", FLOW_UPLOAD.imageQuality),
	);
	if (!blob || blob.size >= file.size) return file;
	return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
		type: "image/webp",
	});
}

export async function uploadFlowFile(
	file: File,
	projectId: string,
	kind: FlowUploadKind,
): Promise<FlowUploaded> {
	const prepared = kind === "thumbnail" ? file : await compressImage(file);
	const limit = flowFileLimit(prepared.type);
	if (prepared.size > limit) {
		throw new Error(
			`El archivo pesa ${(prepared.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${Math.round(limit / 1024 / 1024)} MB.`,
		);
	}
	const result = await upload(
		`flow/${projectId}/${kind}/${prepared.name}`,
		prepared,
		{
			access: "public",
			handleUploadUrl: "/api/flow/upload",
			clientPayload: JSON.stringify({
				projectId,
				kind,
				contentType: prepared.type,
			}),
		},
	);
	return {
		url: result.url,
		contentType: result.contentType,
		size: prepared.size,
		name: prepared.name,
	};
}

export async function dataUrlToFile(
	dataUrl: string,
	name: string,
): Promise<File> {
	const blob = await (await fetch(dataUrl)).blob();
	return new File([blob], name, { type: blob.type || "image/png" });
}

export function formatBytes(size: number | null): string {
	if (size === null) return "";
	if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
	return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
