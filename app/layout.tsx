import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HumanFlow AI — Autonomous Document Humanizer & Quality Guard',
  description:
    'Autonomous AI document humanization with zero factual alteration. Protects citations, numbers, formulas, and formatting while achieving undetectable quality scores.',
  icons: {
    icon: '/favicon.ico',
  },
};

import ClientShieldProvider from '@/components/ClientShieldProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#060913] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        <ClientShieldProvider />
        {children}
      </body>
    </html>
  );
}
