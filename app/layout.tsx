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
      <body className="bg-[#0A0A0A] text-white font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
