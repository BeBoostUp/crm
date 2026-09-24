import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { PageShellFallback } from "@/components/page-shell";
import { getServerTrpcClient } from "@/lib/trpc/server";
import { FlowGuestView } from "./flow-guest-view";

export const metadata: Metadata = {
	title: "Plan de campaña",
};

export default function GuestPage({ params }: PageProps<"/p/[token]">) {
	return (
		<Suspense fallback={<PageShellFallback />}>
			<Guest params={params} />
		</Suspense>
	);
}

async function Guest({ params }: Pick<PageProps<"/p/[token]">, "params">) {
	const { token } = await params;

	try {
		const data = await getServerTrpcClient().flow.guestView.query({ token });
		return <FlowGuestView data={data} />;
	} catch (error) {
		unstable_rethrow(error);
		notFound();
	}
}
