import "./globals.css";
import { Poppins, Inter } from "next/font/google";

const display = Poppins({ subsets:["latin"], weight:["600","700"], variable:"--font-display" });
const body = Inter({ subsets:["latin"], variable:"--font-body" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-sans bg-hero`}>{children}</body>
    </html>
  );
}
