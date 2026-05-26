import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { APP_VERSION, APP_VERSION_LABEL, BUILD_ID } from "@/lib/version";

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
  generator: APP_VERSION_LABEL,
  other: {
    "app-version": APP_VERSION,
    "build-id": BUILD_ID,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('wordhtml-theme');
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          suppressHydrationWarning
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
