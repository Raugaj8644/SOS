import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CERP — Community Emergency Response Platform',
  description: 'Real-time emergency coordination for communities, events, and organizations.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#faf8f2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // prevent zoom on SOS button press
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>

        {/* ── Background effect: soft mesh gradient + fine grain ──────────── */}
        <div aria-hidden className="bg-mesh" />
        <div aria-hidden className="bg-grain" />

        {/* Content sits above background effect */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: { maxWidth: '400px' },
            error: { duration: 6000 },
          }}
        />
      </body>
    </html>
  );
}
