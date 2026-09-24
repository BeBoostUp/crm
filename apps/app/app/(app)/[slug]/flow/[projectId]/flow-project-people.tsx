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
			<SelectTrigger className="w-28" aria-label="Role">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{ROLES.map((role) => (
					<SelectItem key={role} value={role}>
						{role.charAt(0) + role.slice(1).toLowerCase()}
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
			<h2 className="font-medium text-sm">People</h2>
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
									aria-label={`Remove ${member.name}`}
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
							<Badge variant="outline">{member.role.toLowerCase()}</Badge>
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
						<SelectTrigger className="min-w-40 flex-1" aria-label="Teammate">
							<SelectValue placeholder="Add a teammate" />
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
						Add
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
				toast.success("Client link revoked.");
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
				{project.guestLink.active ? "New client link" : "Share with client"}
			</Button>
			{project.guestLink.active ? (
				<Button
					variant="ghost"
					size="sm"
					disabled={revoke.isPending}
					onClick={() => revoke.mutate({ projectId: project.id })}
				>
					Revoke link
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
						<DialogTitle>Client link</DialogTitle>
						<DialogDescription>
							Read-only, no account needed. Internal notes stay hidden. Creating
							a new link revokes the previous one.
						</DialogDescription>
					</DialogHeader>
					<div className="flex gap-2">
						<Input readOnly value={link ?? ""} aria-label="Client link" />
						<Button
							onClick={() => {
								void navigator.clipboard.writeText(link ?? "");
								toast.success("Copied.");
							}}
						>
							<Icon icon={Copy} data-icon="inline-start" />
							Copy
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
