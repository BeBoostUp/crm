"use client";

import Close from "@carbon/icons-react/es/Close";
import Copy from "@carbon/icons-react/es/Copy";
import Share from "@carbon/icons-react/es/Share";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type FlowProject = RouterOutputs["flow"]["getProject"];

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

export function FlowProjectPeople({ project }: { project: FlowProject }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const { data: users = [] } = useQuery(trpc.users.list.queryOptions());
	const [userId, setUserId] = useState("");
	const [role, setRole] = useState<FlowRole>("EDITOR");

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
		</section>
	);
}

export function FlowGuestLink({ project }: { project: FlowProject }) {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const [link, setLink] = useState<string | null>(null);

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
			<Button
				variant="outline"
				size="sm"
				disabled={create.isPending}
				onClick={() => create.mutate({ projectId: project.id })}
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
