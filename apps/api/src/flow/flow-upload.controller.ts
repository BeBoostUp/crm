import type { IncomingMessage } from "node:http";
import { type auth, SESSION_COOKIE_NAME } from "@crm/auth";
import {
	BadRequestException,
	Controller,
	Post,
	Req,
	ServiceUnavailableException,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { z } from "zod";
import { FlowService } from "./flow.service";

type CrmSession = UserSession<typeof auth>;

const MB = 1024 * 1024;

const UPLOAD_LIMITS = {
	image: 5 * MB,
	pdf: 10 * MB,
	video: 30 * MB,
	thumbnail: 2 * MB,
	body: 64 * 1024,
} as const;

const ALLOWED_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
	"application/pdf",
	"video/mp4",
	"video/quicktime",
	"video/webm",
];

const clientPayload = z.object({
	projectId: z.string().min(1),
	kind: z.enum(["asset", "logo", "thumbnail"]),
	contentType: z.string().min(1),
});

type ClientPayload = z.infer<typeof clientPayload>;

const preParsed = z.object({ body: z.json().nullable().catch(null) });

function limitFor(payload: ClientPayload): number {
	if (payload.kind === "thumbnail") return UPLOAD_LIMITS.thumbnail;
	if (payload.contentType.startsWith("video/")) return UPLOAD_LIMITS.video;
	if (payload.contentType === "application/pdf") return UPLOAD_LIMITS.pdf;
	return UPLOAD_LIMITS.image;
}

function readBody(request: IncomingMessage): Promise<string | null> {
	const existing = preParsed.parse(request).body;
	if (existing !== null) return Promise.resolve(JSON.stringify(existing));

	return new Promise((resolve) => {
		const chunks: Buffer[] = [];
		let size = 0;
		request.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > UPLOAD_LIMITS.body) {
				request.destroy();
				resolve(null);
				return;
			}
			chunks.push(chunk);
		});
		request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		request.on("error", () => resolve(null));
	});
}

@ApiTags("Flow")
@ApiCookieAuth(SESSION_COOKIE_NAME)
@Controller("api/flow")
export class FlowUploadController {
	constructor(private readonly flow: FlowService) {}

	@Post("upload")
	@ApiOperation({ summary: "Token handshake for direct browser uploads" })
	async upload(
		@Req() request: IncomingMessage,
		@Session() session: CrmSession,
	) {
		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			throw new ServiceUnavailableException(
				"La subida de archivos no está configurada.",
			);
		}
		const raw = await readBody(request);
		if (!raw) throw new BadRequestException("Cuerpo de la petición inválido.");
		const body: HandleUploadBody = JSON.parse(raw);

		return handleUpload({
			body,
			request,
			onBeforeGenerateToken: async (_pathname, payload) => {
				const parsed = clientPayload.parse(JSON.parse(payload ?? "{}"));
				if (!ALLOWED_TYPES.includes(parsed.contentType)) {
					throw new BadRequestException("Tipo de archivo no permitido.");
				}
				await this.flow.assertUploader(parsed.projectId, session.user.id);

				return {
					allowedContentTypes: [parsed.contentType],
					maximumSizeInBytes: limitFor(parsed),
					addRandomSuffix: true,
					tokenPayload: JSON.stringify({
						userId: session.user.id,
						projectId: parsed.projectId,
					}),
				};
			},
			onUploadCompleted: async () => {},
		});
	}
}
