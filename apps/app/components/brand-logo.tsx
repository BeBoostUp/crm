import Image from "next/image";
import type { ComponentProps } from "react";

export function BrandLogo({
	className,
	...props
}: Omit<ComponentProps<typeof Image>, "src" | "alt" | "width" | "height">) {
	return (
		<Image
			src="/brand/logo.png"
			alt="La Ratonería"
			width={64}
			height={64}
			className={className}
			priority
			{...props}
		/>
	);
}
