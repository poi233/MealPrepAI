
import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/Header';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { MealPlanProvider } from '@/contexts/MealPlanContext';
import { PlanListProvider } from '@/contexts/PlanListContext'; 

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
      {/* Next.js automatically manages the <head> tag and its contents. */}
      <body className="antialiased font-sans">
        <UserProfileProvider>
          <PlanListProvider> 
            <MealPlanProvider>
              <Header />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
              <Toaster />
            </MealPlanProvider>
          </PlanListProvider> 
        </UserProfileProvider>
      </body>
    </html>
  );
}

