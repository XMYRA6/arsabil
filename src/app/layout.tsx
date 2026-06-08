import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNavbar } from "@/components/layout/BottomNavbar";
import { Footer } from "@/components/layout/Footer";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1f6feb",
};

export const metadata: Metadata = {
  title: "ArsaBil — Arsa Payı ve Kat Karşılığı Fizibilite Motoru",
  description: "Arsa sahipleri ve müteahhitler için akıllı fizibilite analizi. Arsa payı, inşaat maliyeti ve kâr analizini bilimsel verilerle saniyeler içinde yapın.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ArsaBil",
  },
  icons: {
    icon: [
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('arsabil-theme');var valid=['dark','light','sky','mint','sand'];if(t&&valid.indexOf(t)!==-1){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','dark');}}catch(e){document.documentElement.setAttribute('data-theme','dark');}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <Toaster position="bottom-right" />
          <ServiceWorkerRegister />
          <InstallPrompt />
          <Navbar />
          <main style={{ minHeight: "calc(100vh - 70px)", paddingBottom: "var(--mobile-nav-pb, 0px)" }}>
            {children}
          </main>
          <div className="desktop-footer">
            <Footer />
          </div>
          <BottomNavbar />
        </AuthProvider>
      </body>
    </html>
  );
}
