import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CareerFlow WC | Southern Suburbs Career Dashboard',
  description:
    'Private Western Cape Southern Suburbs career discovery dashboard for High School English & Life Orientation, NPOs, and Admin/L&D.',
};

/**
 * Root Layout conforming to Google Antigravity dark glassmorphism design standards.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
