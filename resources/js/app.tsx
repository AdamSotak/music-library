/** biome-ignore-all lint/suspicious/noExplicitAny: Not typed */

import { createInertiaApp } from "@inertiajs/react"
import { createRoot } from "react-dom/client"
import Layout from "./layouts/layout"

createInertiaApp({
	resolve: (name) => {
		const pages = (import.meta as any).glob("./pages/**/*.tsx", {
			eager: true,
		})
		const page = pages[`./pages/${name}.tsx`]
		if (!page) {
			throw new Error(`Page not found: ${name}`)
		}

		const layoutIgnore = ["Login", "Signup"]
		if (layoutIgnore.includes(page.default.name)) {
			return page.default
		}

		page.default.layout =
			page.default.layout ||
			((page: React.ReactNode) => <Layout>{page}</Layout>)
		return page.default
	},
	setup({ el, App, props }) {
		createRoot(el).render(<App {...props} />)
	},
})
