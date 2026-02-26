import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Kubernetes Made Simple - Learn Kubernetes Interactively',
  description:
    'An interactive tutorial that teaches Kubernetes from the ground up. Learn orchestration, workloads, networking, storage, scheduling, and control-plane internals — no cluster required.',
  openGraph: {
    title: 'Kubernetes Made Simple',
    description:
      'An interactive tutorial that teaches Kubernetes from the ground up — no cluster required.',
    siteName: 'Kubernetes Made Simple',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kubernetes Made Simple',
    description:
      'An interactive tutorial that teaches Kubernetes from the ground up — no cluster required.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-text min-h-screen`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if('scrollRestoration' in history)history.scrollRestoration='manual';window.scrollTo(0,0);document.addEventListener('DOMContentLoaded',function(){window.scrollTo(0,0)});window.addEventListener('load',function(){window.scrollTo(0,0)})}catch(e){}})();`,
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
