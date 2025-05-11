
import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/Header';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { MealPlanProvider } from '@/contexts/MealPlanContext';
import { PlanListProvider } from '@/contexts/PlanListContext'; // Add import

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
});

export const metadata: Metadata = {
  title: 'MealPrepAI',
  description: 'Generate weekly meal plans with AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={openSans.variable}>
      <body className="antialiased font-sans">
        <UserProfileProvider>
          <PlanListProvider> {/* Add Provider */}
            <MealPlanProvider>
              <Header />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
              <Toaster />
            </MealPlanProvider>
          </PlanListProvider> {/* Close Provider */}
        </UserProfileProvider>
      </body>
    </html>
  );
}
