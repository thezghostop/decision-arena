import { Navbar } from "@/components/layout/Navbar";
import { DebateHistory } from "@/components/arena/DebateHistory";

export const metadata = {
  title: "My Debates — Decision Arena",
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <DebateHistory />
      </main>
    </div>
  );
}
