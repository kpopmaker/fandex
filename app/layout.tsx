import type { Metadata } from 'next';
import './globals.css';
import Navbar from './components/Navbar';

export const metadata: Metadata = {
  title: 'FANDEX',
  description: 'K-pop artist stock-style market index platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (() => {
      try {
        const theme = window.localStorage.getItem('fandex-theme') === 'night' ? 'night' : 'day';
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.toggle('dark', theme === 'night');
      } catch {
        document.documentElement.dataset.theme = 'day';
        document.documentElement.classList.remove('dark');
      }
    })();
  `;

  return (
    <html lang="ko" data-theme="day" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
