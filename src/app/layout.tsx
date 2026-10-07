import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "Musubi.ai | AI-Powered Book Discovery",
  description: "Find your next perfect read using AI. Describe what you're in the mood for and get verified recommendations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${dmSans.variable} h-dvh antialiased`}>
        {children}
      </body>
    </html>
  );
}
