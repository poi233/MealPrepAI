import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import '@/components/ui/globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/Header';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { PlanListProvider } from '@/contexts/PlanListContext';
import { Providers } from '@/contexts/Providers'; 

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
});

export const metadata: Metadata = {
  title: '膳食规划AI',
  description: '通过AI生成每周膳食计划',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={openSans.variable}>
      <body className="antialiased font-sans">
        <Providers>
          <UserProfileProvider>
            <PlanListProvider> 
              <Header />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
              <Toaster />
            </PlanListProvider> 
          </UserProfileProvider>
        </Providers>
      </body>
    </html>
  );
}