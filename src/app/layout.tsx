import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSE ModelOps | AI Lifecycle Control Plane",
  description: "Register AI versions, score evaluation evidence against release gates, and review operational quality signals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
