import type { Metadata } from 'next';
import './globals.css';
import SiteFooter from './components/market/SiteFooter';
import SiteHeader from './components/market/SiteHeader';

export const metadata: Metadata = {
  title: 'FANDEX | K-pop 종합지수',
  description: 'K-pop 그룹을 주식처럼 보여주는 FANDEX 지수와 랭킹',
};

const themeScript = `
  (() => {
    try {
      const saved = window.localStorage.getItem('fandex-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = saved === 'night' || saved === 'day' ? saved : (prefersDark ? 'night' : 'day');
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle('dark', theme === 'night');
    } catch {
      document.documentElement.dataset.theme = 'day';
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="day" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
