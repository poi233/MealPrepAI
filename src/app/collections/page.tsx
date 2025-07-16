/**
 * @fileOverview Collections page - displays and manages user's meal collections
 */

'use client';

import { CollectionManager } from '@/components/favorites/CollectionManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CollectionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">收藏夹管理</h1>
          <p className="text-gray-600 mt-1">组织和管理您的收藏菜谱</p>
        </div>
      </div>

      {/* Collection Manager */}
      <CollectionManager />
    </div>
  );
}