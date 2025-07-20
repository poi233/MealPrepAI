'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { DjangoAuthService } from '@/lib/django-auth';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (confirmText !== '删除我的账户') {
      toast({
        title: "确认文本不正确",
        description: "请输入 '删除我的账户' 来确认删除操作。",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await DjangoAuthService.deleteAccount();
      
      toast({
        title: "账户已删除",
        description: "您的账户和所有相关数据已被永久删除。",
      });
      await logout();
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除账户时出现错误。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            删除账户
          </DialogTitle>
          <DialogDescription className="text-left space-y-2">
            <p className="font-medium text-red-800">
              ⚠️ 这是一个不可逆的操作！
            </p>
            <p>
              删除账户将永久删除以下数据：
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>您的个人资料和账户信息</li>
              <li>所有保存的膳食计划</li>
              <li>收藏的食谱</li>
              <li>创建的收藏夹</li>
              <li>所有相关的用户数据</li>
            </ul>
            <p className="font-medium">
              此操作无法撤销，请谨慎考虑。
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirmText">
              请输入 <span className="font-mono bg-gray-100 px-1 rounded">删除我的账户</span> 来确认：
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="删除我的账户"
              required
            />
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              <strong>当前账户：</strong> {user?.username} ({user?.email})
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button 
              type="submit" 
              variant="destructive" 
              disabled={isLoading || confirmText !== '删除我的账户'}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  删除中...
                </>
              ) : (
                '永久删除账户'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}