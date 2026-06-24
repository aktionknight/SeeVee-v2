import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-4">
        Welcome to SeeVee
      </h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-[600px]">
        Automate your cold outreach, find the best jobs, and get AI-tailored resume reviews.
      </p>
      <div className="flex gap-4">
        <Link 
          href="/login" 
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Get Started with Google
        </Link>
      </div>
    </div>
  )
}
