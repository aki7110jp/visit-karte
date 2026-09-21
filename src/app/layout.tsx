import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { SessionProvider } from 'next-auth/react';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '訪問カルテ',
  description: 'むさしの灯クリニック',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={geist.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
