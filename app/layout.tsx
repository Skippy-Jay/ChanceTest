import type { Metadata, Viewport } from 'next'
import './globals.css'
import AnalyticsProvider from '@/components/AnalyticsProvider'
export const metadata: Metadata = {
  title: 'Chance — Curated Stumble Feed',
  description: 'Rediscover the internet. One click at a time.',
}
export const viewport: Viewport = {
  maximumScale: 5,
  userScalable: true,
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: '#07070c', colorScheme: 'dark' }}>
      <head>
        <meta name="theme-color" content="#07070c" />
        <meta name="msapplication-navbutton-color" content="#07070c" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background:#07070c!important;color-scheme:dark;margin:0;padding:0}*{-webkit-tap-highlight-color:transparent}' }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#07070c', color: '#A8B2BD', fontFamily: "'Outfit', sans-serif", colorScheme: 'dark' }}>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  )
}
