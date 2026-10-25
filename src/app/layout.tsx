import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../styles/tokens-arazi.css";
import { TemaKoru } from "@/components/ui/TemaKoru";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";
import { Toaster } from "react-hot-toast";


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1f6feb",
};

export const metadata: Metadata = {
  title: "ArsaBil — Arsa Payı ve Kat Karşılığı Fizibilite Motoru",
  description: "Arsa sahipleri ve müteahhitler için akıllı fizibilite analizi. Arsa payı, inşaat maliyeti ve kâr analizini bilimsel verilerle saniyeler içinde yap.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ArsaBil",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Tema, ilk boyamadan ÖNCE eşzamanlı uygulanır: sunucu varsayılanı açık (data-theme="light"),
            kayıtlı tercih koyuysa bu betik boyamadan önce koyuya çevirir. Böylece sayfa yenilenirken
            önce koyu lacivert, sonra açık tema görünmez. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('arsabil-theme');document.documentElement.setAttribute('data-theme',(t==='dark'||t==='light')?t:'light');}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <TemaKoru />
        <AuthProvider>
          <Toaster position="top-center" containerStyle={{ top: 'calc(12px + env(safe-area-inset-top, 0px))' }} />
          <ServiceWorkerRegister />
          <InstallPrompt />
          <UpdateBanner />
          <SiteChrome>{children}</SiteChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
