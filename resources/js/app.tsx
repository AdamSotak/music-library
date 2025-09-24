/** biome-ignore-all lint/suspicious/noExplicitAny: Not typed */

import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";

createInertiaApp({
	resolve: (name) => {
		const pages = (import.meta as any).glob("./pages/**/*.tsx", {
			eager: true,
		}) as Record<string, { default: React.ComponentType<any> }>;
		const page = pages[`./pages/${name}.tsx`];
		if (!page) {
			throw new Error(`Page not found: ${name}`);
		}
		return page.default;
	},
	setup({ el, App, props }) {
		createRoot(el).render(<App {...props} />);
	},
});
