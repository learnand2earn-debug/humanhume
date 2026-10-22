import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, Public_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'HumanFlow AI — Automated Document Humanizer & Documentation Studio',
  description:
    'Autonomous AI document humanization, preservation verification, quality control, and legal/technical documentation drafting platform.',
  openGraph: {
    title: 'HumanFlow AI — Automated Document Humanizer & Documentation Studio',
    description:
      'Autonomous AI document humanization, preservation verification, quality control, and legal/technical documentation drafting platform.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HumanFlow AI — Automated Document Humanizer & Documentation Studio',
    description:
      'Autonomous AI document humanization, preservation verification, quality control, and legal/technical documentation drafting platform.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${publicSans.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200 font-sans min-h-screen"
      >
        {children}
      </body>
    </html>
  );
}
