import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
          <UtensilsCrossed size={28} />
          <span>MealPrepAI</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/">Meal Generator</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/profile">Profile</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
