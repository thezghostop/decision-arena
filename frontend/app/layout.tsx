import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decision Arena — AI-Powered Decision Intelligence",
  description:
    "Multiple expert AI agents debate your decisions, exposing blind spots through structured adversarial deliberation.",
  keywords: ["AI", "decision making", "debate", "multi-agent", "strategy"],
  openGraph: {
    title: "Decision Arena",
    description: "Don't just decide. Decide better.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <I18nProvider>
        <html lang="en" className="dark">
          <body>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#111118",
                  border: "1px solid #1e1e2e",
                  color: "#e2e8f0",
                },
              }}
            />
          </body>
        </html>
      </I18nProvider>
    </ClerkProvider>
  );
}
