"use client";

import Attachment from "@carbon/icons-react/es/Attachment";
import Launch from "@carbon/icons-react/es/Launch";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { PersonAvatar } from "@crm/ui/components/person-avatar";
import { Spinner } from "@crm/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import { Textarea } from "@crm/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment, useRef, useState } from "react";
import { toast } from "sonner";
import { FLOW_UPLOAD, uploadFlowFile } from "@/components/flow/flow-upload";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

const POLL_MS = 5_000;

const MENTION = /(@[\p{L}\p{N}_.-]+)/u;

type FlowProject = RouterOutputs["flow"]["getProject"];

type FlowChatMessage = RouterOutputs["flow"]["chatMessages"][number];

function Body({ text }: { text: string }) {
	let offset = 0;
	const parts = text.split(MENTION).map((part) => {
		const key = offset;
		offset += part.length + 1;
		return { key, part };
	});
	return (
		<p className="whitespace-pre-wrap text-sm">
			{parts.map(({ key, part }) =>
				MENTION.test(part) ? (
					<span key={key} className="font-medium text-link">
						{part}
					</span>
				) : (
					<Fragment key={key}>{part}</Fragment>
				),
			)}
		</p>
	);
}

function Message({ message }: { message: FlowChatMessage }) {
	const time = new Date(message.createdAt).toLocaleString("es", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
	const isImage = message.fileType?.startsWith("image/") ?? false;

	return (
		<li className="flex gap-2">
			<PersonAvatar src={message.author.image} name={message.author.name} />
			<div className="min-w-0 flex-1">
				<p className="text-xs">
					<span className="font-medium">{message.author.name}</span>
					<span className="text-muted-foreground"> · {time}</span>
				</p>
				{message.body ? <Body text={message.body} /> : null}
				{message.fileUrl ? (
					isImage ? (
						<a href={message.fileUrl} target="_blank" rel="noreferrer">
							<img
								src={message.fileUrl}
								alt={message.fileName ?? ""}
								className="mt-1 max-h-48 rounded-md border"
							/>
						</a>
					) : (
						<a
							href={message.fileUrl}
							target="_blank"
							rel="noreferrer"
							className="text-link text-xs underline-offset-4 hover:underline"
						>
							<Icon icon={Launch} data-icon="inline-start" />
							{message.fileName ?? "Archivo"}
						</a>
					)
				) : null}
			</div>
		</li>
	);
}

export function FlowProjectChat({ project }: { project: FlowProject }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const fileInput = useRef<HTMLInputElement>(null);
	const [channelId, setChannelId] = useState("");
	const [body, setBody] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [sending, setSending] = useState(false);

	const channels = useQuery(
		trpc.flow.chatChannels.queryOptions({ projectId: project.id }),
	);
	const activeId = channelId || channels.data?.[0]?.id || "";
	const messages = useQuery({
		...trpc.flow.chatMessages.queryOptions({ channelId: activeId }),
		enabled: activeId !== "",
		refetchInterval: POLL_MS,
	});
	const send = useMutation(
		trpc.flow.chatSend.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setBody("");
				setFile(null);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const submit = async (): Promise<void> => {
		if (!activeId || (!body.trim() && !file)) return;
		let uploaded = null;
		if (file) {
			setSending(true);
			try {
				uploaded = await uploadFlowFile(file, project.id, "asset");
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "No se pudo adjuntar.",
				);
				setSending(false);
				return;
			}
			setSending(false);
		}
		send.mutate({
			channelId: activeId,
			body: body.trim(),
			file: uploaded
				? {
						url: uploaded.url,
						type: uploaded.contentType,
						size: uploaded.size,
						name: uploaded.name,
					}
				: null,
		});
	};

	if (channels.data && channels.data.length === 0) return null;

	return (
		<section className="mt-8 space-y-3">
			<div className="flex flex-wrap items-center gap-3">
				<h2 className="font-medium text-sm">Chat del proyecto</h2>
				{channels.data ? (
					<Tabs value={activeId} onValueChange={setChannelId}>
						<TabsList>
							{channels.data.map((channel) => (
								<TabsTrigger key={channel.id} value={channel.id}>
									{channel.name}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				) : null}
				<span className="text-muted-foreground text-xs">
					Se actualiza cada {POLL_MS / 1000} s · mencioná con @nombre
				</span>
			</div>

			<div className="flex h-80 flex-col-reverse overflow-y-auto rounded-md border bg-card p-3">
				<ul className="space-y-3">
					{(messages.data ?? []).map((message) => (
						<Message key={message.id} message={message} />
					))}
					{messages.data?.length === 0 ? (
						<li className="text-muted-foreground text-sm">
							Todavía no hay mensajes en este canal.
						</li>
					) : null}
				</ul>
			</div>

			<form
				className="flex flex-wrap items-end gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
			>
				<Textarea
					value={body}
					onChange={(event) => setBody(event.target.value)}
					placeholder="Escribí un mensaje…"
					aria-label="Mensaje"
					rows={2}
					className="min-w-60 flex-1"
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							void submit();
						}
					}}
				/>
				<input
					ref={fileInput}
					type="file"
					accept={FLOW_UPLOAD.accept}
					className="hidden"
					onChange={(event) => setFile(event.target.files?.[0] ?? null)}
				/>
				<Button
					type="button"
					variant={file ? "default" : "outline"}
					size="sm"
					disabled={!project.me.canUpload}
					onClick={() => fileInput.current?.click()}
				>
					<Icon icon={Attachment} data-icon="inline-start" />
					{file ? file.name : "Adjuntar"}
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={sending || send.isPending || (!body.trim() && !file)}
				>
					{sending || send.isPending ? <Spinner /> : null}
					Enviar
				</Button>
			</form>
		</section>
	);
}
