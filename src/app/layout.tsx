import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Hind_Siliguri,
  Inter,
  Montserrat,
  Poppins,
} from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

// Bangla. Not a replacement for the Latin faces — it sits BEHIND them in every
// font stack (see globals.css), so the browser draws English in Montserrat and
// switches to this only for Bengali characters. Without it Bangla fell back to
// whatever the OS had (Bangla Sangam on a Mac, Nirmala UI on Windows) and
// looked different on every machine. Bengali subset only: the Latin glyphs
// would never be used.
const hindSiliguri = Hind_Siliguri({
  variable: "--font-bangla",
  weight: ["400", "500", "600", "700"],
  subsets: ["bengali"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TechNest Pharma",
    template: "%s · TechNest Pharma",
  },
  description:
    "Smart sourcing. Stronger healthcare. Searchable catalogue of pharmaceutical raw-material suppliers, products, and offers.",
  icons: { icon: "/logo-mark.png", apple: "/logo-mark.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${poppins.variable} ${montserrat.variable} ${hindSiliguri.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
