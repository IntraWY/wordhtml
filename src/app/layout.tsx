import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "wordhtml — Clean HTML from Word, in your browser",
    template: "%s · wordhtml",
  },
  description:
    "Convert Word documents to clean, semantic HTML — and back. 100% in your browser, no uploads. Eight cleaning options, A4 preview, export as HTML, ZIP, or .docx.",
  applicationName: "wordhtml",
  authors: [{ name: "wordhtml" }],
  keywords: [
    "word to html",
    "html to word",
    "docx converter",
    "html cleaner",
    "wysiwyg editor",
  ],
  openGraph: {
    title: "wordhtml — Clean HTML from Word, in your browser",
    description:
      "Convert Word documents to clean, semantic HTML — and back. 100% in your browser.",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
