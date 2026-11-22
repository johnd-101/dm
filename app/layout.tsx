import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AdminHub - Supabase + Auth", description: "Admin Dashboard with Users & DMs + Supabase Auth" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
