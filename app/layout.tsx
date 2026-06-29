import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sip Switch — Find your perfect non-alcoholic drink",
  description:
    "Tell us what you love about drinking. We find the NA version that actually satisfies.",
  openGraph: {
    title: "Sip Switch — Find your perfect non-alcoholic drink",
    description:
      "Tell us what you love about drinking. We find the NA version that actually satisfies.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          .step-enter { animation: stepIn 0.22s ease-out both; }
          .result-enter { animation: resultIn 0.35s ease-out both; }
          @keyframes stepIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes resultIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .progress-bar { transition: width 0.3s ease; }
          .cta-pulse { box-shadow: 0 0 0 0 rgba(200,169,110,0.4); animation: pulse 2.5s infinite; }
          @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(200,169,110,0.4); } 70% { box-shadow: 0 0 0 12px rgba(200,169,110,0); } 100% { box-shadow: 0 0 0 0 rgba(200,169,110,0); } }
        `}</style>
      </head>
      <body className="bg-[#0A0A0A] text-white font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
