import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { APP_VERSION, APP_VERSION_LABEL, BUILD_ID } from "@/lib/version";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-sans-thai",
  subsets: ["latin", "thai"],
  weight: ["400", "600"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
  themeColor: "#faf8f5",
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
      className={`${ibmPlexSansThai.variable} ${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          suppressHydrationWarning
        />
        <meta name="generator" content={APP_VERSION_LABEL} />
        <meta name="app-version" content={`v${APP_VERSION}`} />
        <meta name="build-id" content={BUILD_ID} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
