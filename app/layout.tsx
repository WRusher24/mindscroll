import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MindScroll — learn something new in every swipe", template: "%s · MindScroll" },
  description: "An infinite-scroll micro-learning feed of the best educational articles, with a distraction-free reader, highlights and notes.",
  applicationName: "MindScroll",
  appleWebApp: { capable: true, title: "MindScroll", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
