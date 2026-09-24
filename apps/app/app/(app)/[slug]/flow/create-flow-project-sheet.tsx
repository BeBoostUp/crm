"use client";

import Add from "@carbon/icons-react/es/Add";
import { Button } from "@crm/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@crm/ui/components/field";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@crm/ui/components/sheet";
import { Spinner } from "@crm/ui/components/spinner";
import { Textarea } from "@crm/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import { type ComponentProps, Suspense, useId, useState } from "react";
import { toast } from "sonner";
import { CompanyPicker } from "@/components/crm/company-picker";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";
import { useWorkspaceUrl } from "@/lib/use-workspace-url";

const FORM = "create-flow-project";

function NewProjectButton(props: ComponentProps<typeof Button>) {
	return (
		<Button {...props}>
			<Icon icon={Add} data-icon="inline-start" />
			Nuevo proyecto
		</Button>
	);
}

export function CreateFlowProjectSheet() {
	return (
		<Suspense fallback={<NewProjectButton disabled />}>
			<CreateFlowProjectForm />
		</Suspense>
	);
}

function CreateFlowProjectForm() {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const router = useRouter();
	const url = useWorkspaceUrl();

	const nameId = useId();
	const companyId = useId();
	const descriptionId = useId();

	const [open, setOpen] = useQueryState(
		SEARCH_PARAM.dialog.create,
		parseAsBoolean.withDefault(false),
	);
	const [name, setName] = useState("");
	const [company, setCompany] = useState("");
	const [description, setDescription] = useState("");

	const create = useMutation(
		trpc.flow.createProject.mutationOptions({
			onSuccess: async (project) => {
				await cache.flow();
				await setOpen(null);
				setName("");
				setCompany("");
				setDescription("");
				router.push(url(`/flow/${project.id}`));
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Sheet open={open} onOpenChange={(next) => setOpen(next || null)}>
			<SheetTrigger asChild>
				<NewProjectButton />
			</SheetTrigger>

			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Nuevo proyecto</SheetTitle>
					<SheetDescription>
						Un proyecto por cliente o marca. Adentro viven los lienzos, las
						referencias y las checklists.
					</SheetDescription>
				</SheetHeader>

				<form
					id={FORM}
					className="flex-1 overflow-y-auto px-4"
					onSubmit={(event) => {
						event.preventDefault();
						create.mutate({
							name: name.trim(),
							companyId: company || null,
							description: description.trim(),
						});
					}}
				>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor={nameId}>Nombre</FieldLabel>
							<Input
								id={nameId}
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder="Lanzamiento primavera · Acme"
								maxLength={120}
								autoComplete="off"
								required
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor={companyId}>Empresa cliente</FieldLabel>
							<CompanyPicker
								id={companyId}
								value={company}
								onValueChange={setCompany}
								placeholder="Elegí una empresa"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor={descriptionId}>Descripción</FieldLabel>
							<Textarea
								id={descriptionId}
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								placeholder="De qué va esta campaña."
								rows={3}
								maxLength={2000}
							/>
						</Field>
					</FieldGroup>
				</form>

				<SheetFooter>
					<Button
						type="submit"
						form={FORM}
						disabled={!name.trim() || create.isPending}
					>
						{create.isPending ? <Spinner /> : null}
						Crear proyecto
					</Button>
					<SheetClose asChild>
						<Button variant="outline">Cancelar</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
