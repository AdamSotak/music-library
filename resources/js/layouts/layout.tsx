import Navbar from "@/components/navbar"

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-w-screen min-h-screen bg-black">
			<Navbar />
			{children}
		</div>
	)
}
