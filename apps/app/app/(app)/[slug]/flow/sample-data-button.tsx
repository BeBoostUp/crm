"use client";

import { Button } from "@crm/ui/components/button";
import { Spinner } from "@crm/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCrmCache } from "@/lib/trpc/cache";
import { useTRPC } from "@/lib/trpc/client";

export function SampleDataButton() {
	const trpc = useTRPC();
	const cache = useCrmCache();
	const seed = useMutation(
		trpc.flow.seedDemo.mutationOptions({
			onSuccess: async () => {
				await cache.flow();
				toast.success("Sample projects loaded.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Button
			variant="outline"
			disabled={seed.isPending}
			onClick={() => seed.mutate()}
		>
			{seed.isPending ? <Spinner /> : null}
			Load sample data
		</Button>
	);
}
