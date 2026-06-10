import { Navbar } from "@/components/layout/Navbar";
import { ArenaSetup } from "@/components/arena/ArenaSetup";

export const metadata = {
  title: "New Debate — Decision Arena",
};

export default function ArenaPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <ArenaSetup />
      </main>
    </div>
  );
}
