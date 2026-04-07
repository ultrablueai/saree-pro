import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaBoot } from "@/components/PwaBoot";
import { LocalizationProvider } from "@/hooks/useLocalization";
import { appConfig } from "@/lib/app-config";
import { getRequestI18n } from "@/lib/i18n-server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
  applicationName: appConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appConfig.name,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/saree-pro-icon.svg",
    apple: "/saree-pro-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#c85935",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, direction } = await getRequestI18n();

  return (
    <html
      lang={locale}
      dir={direction}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--color-background)] text-[var(--color-ink)]">
        <LocalizationProvider defaultLang={locale === "ar" || locale === "tr" ? locale : "en"}>
          <PwaBoot />
          {children}
        </LocalizationProvider>
      </body>
    </html>
  );
}
