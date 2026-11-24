import type { Metadata, Viewport } from "next";
import { Newsreader, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/ui/Footer";
import { SmoothScroll, Cursor } from "@/components/ui/Experience";
import { RevealObserver } from "@/components/ui/Reveal";
import { Concierge } from "@/components/concierge/Concierge";
import { SITE, SHOWROOMS } from "@/lib/site";
import { asset } from "@/lib/asset";
import { FooterGate } from "@/components/ui/FooterGate";

const display = Newsreader({ subsets: ["latin"], weight: ["300", "400"], style: ["normal", "italic"], variable: "--font-newsreader", display: "swap" });
const sans = Inter_Tight({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-inter-tight", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url + "/"),
  title: { default: "UnipanelSA | Luxury European Surfaces", template: "%s | UnipanelSA" },
  description: SITE.description,
  icons: { icon: asset("/brand/LOGO-Black-circle.png") },
  openGraph: { type: "website", siteName: "UnipanelSA", locale: "en_ZA", images: [{ url: asset("/inspiration/2-1.webp"), width: 1600, height: 1108 }] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0f0f0e", width: "device-width", initialScale: 1 };

const orgSchema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE.url}/#org`, name: SITE.name, url: SITE.url, logo: `${SITE.url}/brand/LOGO-Black-circle.png`, sameAs: [SITE.instagram, SITE.liveSite], memberOf: { "@type": "Organization", name: "Kitchen Specialists Association (KSA)" } },
    ...SHOWROOMS.map((s) => ({
      "@type": "HomeGoodsStore",
      "@id": `${SITE.url}/showrooms/#${s.id}`,
      name: `UnipanelSA ${s.city} Showroom`,
      parentOrganization: { "@id": `${SITE.url}/#org` },
      telephone: s.phone,
      email: s.email,
      address: { "@type": "PostalAddress", streetAddress: s.street, addressLocality: s.suburb, postalCode: s.postcode, addressRegion: s.region, addressCountry: "ZA" },
      openingHoursSpecification: Object.entries(s.hours)
        .filter(([, h]) => h)
        .map(([d, h]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(d)], opens: h![0], closes: h![1] })),
    })),
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <Nav />
        <main id="main">{children}</main>
        <FooterGate>
          <Footer />
        </FooterGate>
        <Concierge />
        <Cursor />
        <SmoothScroll />
        <RevealObserver />
      </body>
    </html>
  );
}
