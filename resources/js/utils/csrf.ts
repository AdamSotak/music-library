export function getCsrfToken(): string | undefined {
	if (typeof document === "undefined") return undefined
	const el = document.querySelector(
		'meta[name="csrf-token"]',
	) as HTMLMetaElement | null
	return el?.content
}

function getXsrfCookie(): string | undefined {
	if (typeof document === "undefined") return undefined
	const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)
	if (!match) return undefined
	try {
		return decodeURIComponent(match[1])
	} catch {
		return match[1]
	}
}

export function csrfFetch(
	input: RequestInfo | URL,
	init: RequestInit = {},
): Promise<Response> {
	const token = getCsrfToken() ?? getXsrfCookie()
	const headers = new Headers(init.headers ?? {})

	if (!headers.has("X-CSRF-TOKEN")) {
		headers.set("X-CSRF-TOKEN", token ?? "")
	}
	if (!headers.has("X-Requested-With")) {
		headers.set("X-Requested-With", "XMLHttpRequest")
	}

	return fetch(input, {
		credentials: "same-origin",
		...init,
		headers,
	})
}
