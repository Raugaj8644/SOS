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
  themeColor: '#ef4444',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // prevent zoom on SOS button press
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>

        {/* ── Global Scan Line (background decoration) ─────────────────── */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 40,
            pointerEvents: 'none',
            zIndex: 0,
            background: 'linear-gradient(to bottom, transparent 0%, rgba(220,38,38,0.08) 40%, rgba(220,38,38,0.15) 50%, rgba(220,38,38,0.08) 60%, transparent 100%)',
            animation: 'scan-line 4s linear infinite',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 1.5,
            background: 'linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.35) 15%, rgba(220,38,38,0.55) 50%, rgba(220,38,38,0.35) 85%, transparent 100%)',
            boxShadow: '0 0 6px rgba(220,38,38,0.2)',
          }} />
        </div>

        {/* Content sits above scan line */}
        <div style={{ position: 'relative', zIndex: 1 }}>
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
