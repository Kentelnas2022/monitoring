import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Multifactors Sales Network Monitoring System',
  description:
    'Multifactors Sales Network Monitoring System - Enterprise real-time network infrastructure telemetry, live monitoring, and automated incident triage.',
  applicationName: 'Multifactors Sales Network Monitoring System',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden antialiased`}
      suppressHydrationWarning
    >
      <body 
        className="h-full flex flex-col bg-[#f8fafc] text-zinc-900 font-sans overflow-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
