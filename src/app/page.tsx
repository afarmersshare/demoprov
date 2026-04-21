import { FarmsExplorer } from "@/components/farms/farms-explorer";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Provender — Louisville Demo
          </h1>
          <p className="mt-2 text-zinc-600">
            60 fictional farms across Louisville metro and surrounding
            Kentucky / Southern Indiana counties. Switch lenses to see the same
            data through different questions.
          </p>
        </header>
        <FarmsExplorer />
      </div>
    </main>
  );
}
