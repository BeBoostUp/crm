"use client";

import Close from "@carbon/icons-react/es/Close";
import Copy from "@carbon/icons-react/es/Copy";
import Settings from "@carbon/icons-react/es/Settings";
import Share from "@carbon/icons-react/es/Share";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Checkbox } from "@crm/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@crm/ui/components/field";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { PersonAvatar } from "@crm/ui/components/person-avatar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@crm/ui/components/sheet";
import {
	FLOW_CHANNEL_KEYS,
	FLOW_CHANNEL_LABELS,
	type FlowCanvasAccess,
	type FlowChannelKey,
	type FlowMemberPermissions,
} from "@crm/validation/flow-permissions";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type FlowProject = RouterOutputs["flow"]["getProject"];

type FlowMember = FlowProject["members"][number];

type FlowRole = FlowProject["role"];

const ROLES = [
	"ADMIN",
	"EDITOR",
	"VIEWER",
] as const satisfies readonly FlowRole[];

const ROLE_LABELS = {
	ADMIN: "Admin",
	EDITOR: "Editor",
	VIEWER: "Solo lectura",
} as const satisfies Record<FlowRole, string>;

const ACCESS_LABELS = {
	inherit: "Según el rol",
	edit: "Editar",
	view: "Solo ver",
	none: "Sin acceso",
} as const;

type AccessChoice = keyof typeof ACCESS_LABELS;

const TRISTATE = {
	inherit: "Según el rol",
	yes: "Sí",
	no: "No",
} as const;

type Tristate = keyof typeof TRISTATE;

function toTristate(value: boolean | null): Tristate {
	if (value === null) return "inherit";
	return value ? "yes" : "no";
}

function fromTristate(value: Tristate): boolean | null {
	if (value === "inherit") return null;
	return value === "yes";
}

function RoleSelect({
	value,
	onValueChange,
}: {
	value: FlowRole;
	onValueChange: (value: FlowRole) => void;
}) {
	return (
		<Select
			value={value}
			onValueChange={(next) => onValueChange(next as FlowRole)}
		>
			<SelectTrigger className="w-32" aria-label="Rol">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{ROLES.map((role) => (
					<SelectItem key={role} value={role}>
						{ROLE_LABELS[role]}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function MemberPermissionsSheet({
	project,
	member,
	onClose,
}: {
	project: FlowProject;
	member: FlowMember | null;
	onClose: () => void;
}) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const prefix = useId();
	const [draft, setDraft] = useState<FlowMemberPermissions | null>(null);
	const permissions = draft ?? member?.permissions ?? null;

	const save = useMutation(
		trpc.flow.setMember.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				toast.success("Permisos guardados.");
				setDraft(null);
				onClose();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const update = (next: Partial<FlowMemberPermissions>): void => {
		if (!permissions) return;
		setDraft({ ...permissions, ...next });
	};

	const allChannels = permissions?.channels === null;

	return (
		<Sheet
			open={member !== null}
			onOpenChange={(open) => {
				if (!open) {
					setDraft(null);
					onClose();
				}
			}}
		>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Permisos de {member?.name}</SheetTitle>
					<SheetDescription>
						Qué puede ver y hacer en este proyecto. «Según el rol» usa lo que
						corresponde a {member ? ROLE_LABELS[member.role] : ""}.
					</SheetDescription>
				</SheetHeader>

				{member && permissions ? (
					<div className="flex-1 space-y-6 overflow-y-auto px-4">
						<FieldGroup>
							<p className="font-medium text-sm">Lienzos</p>
							{project.canvases.map((canvas) => {
								const id = `${prefix}-canvas-${canvas.id}`;
								const current: AccessChoice =
									permissions.canvases[canvas.id] ?? "inherit";
								return (
									<Field key={canvas.id}>
										<FieldLabel htmlFor={id}>{canvas.name}</FieldLabel>
										<Select
											value={current}
											onValueChange={(value) => {
												const next = { ...permissions.canvases };
												if (value === "inherit") delete next[canvas.id];
												else next[canvas.id] = value as FlowCanvasAccess;
												update({ canvases: next });
											}}
										>
											<SelectTrigger id={id} className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(ACCESS_LABELS).map(([value, label]) => (
													<SelectItem key={value} value={value}>
														{label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								);
							})}
						</FieldGroup>

						<FieldGroup>
							<p className="font-medium text-sm">Canales de chat</p>
							<label
								htmlFor={`${prefix}-all-channels`}
								className="flex items-center gap-2 text-sm"
							>
								<Checkbox
									id={`${prefix}-all-channels`}
									checked={allChannels}
									onCheckedChange={(checked) =>
										update({ channels: checked === true ? null : [] })
									}
								/>
								Todos los canales
							</label>
							{allChannels
								? null
								: FLOW_CHANNEL_KEYS.map((key) => (
										<label
											key={key}
											htmlFor={`${prefix}-channel-${key}`}
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												id={`${prefix}-channel-${key}`}
												checked={permissions.channels?.includes(key) ?? false}
												onCheckedChange={(checked) => {
													const set = new Set<FlowChannelKey>(
														permissions.channels ?? [],
													);
													if (checked === true) set.add(key);
													else set.delete(key);
													update({ channels: [...set] });
												}}
											/>
											{FLOW_CHANNEL_LABELS[key]}
										</label>
									))}
						</FieldGroup>

						<FieldGroup>
							<Field>
								<FieldLabel htmlFor={`${prefix}-upload`}>
									Subir archivos a la AdLibrary
								</FieldLabel>
								<Select
									value={toTristate(permissions.canUpload)}
									onValueChange={(value) =>
										update({ canUpload: fromTristate(value as Tristate) })
									}
								>
									<SelectTrigger id={`${prefix}-upload`} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(TRISTATE).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor={`${prefix}-export`}>
									Exportar PDF
								</FieldLabel>
								<Select
									value={toTristate(permissions.canExport)}
									onValueChange={(value) =>
										update({ canExport: fromTristate(value as Tristate) })
									}
								>
									<SelectTrigger id={`${prefix}-export`} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(TRISTATE).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						</FieldGroup>
					</div>
				) : null}

				<SheetFooter>
					<Button
						disabled={!member || !draft || save.isPending}
						onClick={() => {
							if (!member || !draft) return;
							save.mutate({
								projectId: project.id,
								userId: member.userId,
								role: member.role,
								permissions: draft,
							});
						}}
					>
						Guardar permisos
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export function FlowProjectPeople({ project }: { project: FlowProject }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const { data: users = [] } = useQuery(trpc.users.list.queryOptions());
	const [userId, setUserId] = useState("");
	const [role, setRole] = useState<FlowRole>("EDITOR");
	const [editing, setEditing] = useState<FlowMember | null>(null);

	const setMember = useMutation(
		trpc.flow.setMember.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				setUserId("");
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const removeMember = useMutation(
		trpc.flow.removeMember.mutationOptions({
			onSuccess: () => cache.flow(),
			onError: (error) => toast.error(error.message),
		}),
	);

	const isAdmin = project.role === "ADMIN";
	const available = users.filter(
		(user) => !project.members.some((member) => member.userId === user.id),
	);

	return (
		<section className="space-y-3">
			<h2 className="font-medium text-sm">Equipo</h2>
			<ul className="space-y-2">
				{project.members.map((member) => (
					<li key={member.userId} className="flex items-center gap-2">
						<PersonAvatar
							src={member.image}
							name={member.name}
							email={member.email}
						/>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm">{member.name}</p>
							<p className="truncate text-muted-foreground text-xs">
								{member.email}
							</p>
						</div>
						{isAdmin ? (
							<>
								<RoleSelect
									value={member.role}
									onValueChange={(next) =>
										setMember.mutate({
											projectId: project.id,
											userId: member.userId,
											role: next,
										})
									}
								/>
								{member.role !== "ADMIN" ? (
									<Button
										variant="ghost"
										size="icon"
										aria-label={`Permisos de ${member.name}`}
										onClick={() => setEditing(member)}
									>
										<Icon icon={Settings} />
									</Button>
								) : null}
								<Button
									variant="ghost"
									size="icon"
									aria-label={`Quitar a ${member.name}`}
									onClick={() =>
										removeMember.mutate({
											projectId: project.id,
											userId: member.userId,
										})
									}
								>
									<Icon icon={Close} />
								</Button>
							</>
						) : (
							<Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
						)}
					</li>
				))}
			</ul>

			{isAdmin && available.length > 0 ? (
				<form
					className="flex flex-wrap gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						setMember.mutate({ projectId: project.id, userId, role });
					}}
				>
					<Select value={userId} onValueChange={setUserId}>
						<SelectTrigger className="min-w-40 flex-1" aria-label="Integrante">
							<SelectValue placeholder="Sumar a alguien del equipo" />
						</SelectTrigger>
						<SelectContent>
							{available.map((user) => (
								<SelectItem key={user.id} value={user.id}>
									{user.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<RoleSelect value={role} onValueChange={setRole} />
					<Button type="submit" disabled={!userId || setMember.isPending}>
						Agregar
					</Button>
				</form>
			) : null}

			{isAdmin ? (
				<MemberPermissionsSheet
					project={project}
					member={editing}
					onClose={() => setEditing(null)}
				/>
			) : null}
		</section>
	);
}

export function FlowGuestLink({ project }: { project: FlowProject }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const [link, setLink] = useState<string | null>(null);
	const commentId = useId();
	const [canComment, setCanComment] = useState(project.guestLink.canComment);

	const create = useMutation(
		trpc.flow.createGuestLink.mutationOptions({
			onSuccess: async ({ token }) => {
				setLink(`${window.location.origin}/p/${token}`);
				await cache.flow();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const revoke = useMutation(
		trpc.flow.revokeGuestLink.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				toast.success("Enlace del cliente revocado.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (project.role !== "ADMIN") return null;

	return (
		<>
			<label
				htmlFor={commentId}
				className="flex items-center gap-2 text-muted-foreground text-xs"
			>
				<Checkbox
					id={commentId}
					checked={canComment}
					onCheckedChange={(checked) => setCanComment(checked === true)}
				/>
				El cliente puede comentar
			</label>
			<Button
				variant="outline"
				size="sm"
				disabled={create.isPending}
				onClick={() => create.mutate({ projectId: project.id, canComment })}
			>
				<Icon icon={Share} data-icon="inline-start" />
				{project.guestLink.active
					? "Nuevo enlace para el cliente"
					: "Compartir con el cliente"}
			</Button>
			{project.guestLink.active ? (
				<Button
					variant="ghost"
					size="sm"
					disabled={revoke.isPending}
					onClick={() => revoke.mutate({ projectId: project.id })}
				>
					Revocar enlace
				</Button>
			) : null}

			<Dialog
				open={link !== null}
				onOpenChange={(open) => {
					if (!open) setLink(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Enlace para el cliente</DialogTitle>
						<DialogDescription>
							Solo lectura, sin cuenta. Las notas internas quedan ocultas. Crear
							un enlace nuevo revoca el anterior.
						</DialogDescription>
					</DialogHeader>
					<div className="flex gap-2">
						<Input
							readOnly
							value={link ?? ""}
							aria-label="Enlace para el cliente"
						/>
						<Button
							onClick={() => {
								void navigator.clipboard.writeText(link ?? "");
								toast.success("Copiado.");
							}}
						>
							<Icon icon={Copy} data-icon="inline-start" />
							Copiar
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
