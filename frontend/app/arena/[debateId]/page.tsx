import { DebateArena } from "@/components/arena/DebateArena";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = {
  title: "Live Debate — Decision Arena",
};

export default async function DebatePage({
  params,
}: {
  params: Promise<{ debateId: string }>;
}) {
  const { debateId } = await params;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <main className="pt-16">
        <DebateArena debateId={debateId} />
      </main>
    </div>
  );
}
