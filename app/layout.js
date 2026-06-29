import '../styles/globals.css';

export const metadata = {
  title: 'Self Tape Casting',
  description: 'The Musical Theater Audition Platform',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#1a1a2e',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-stc-bg">
        {children}
      </body>
    </html>
  );
}
