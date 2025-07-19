'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';
import { DeleteAccountDialog } from '@/components/profile/DeleteAccountDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User, Settings, Shield, Trash2, Plus, X } from 'lucide-react';
import type { DietaryPreferences } from '@/types/database.types';

const dietTypes = [
  { value: 'vegetarian', label: '素食主义' },
  { value: 'vegan', label: '纯素食主义' },
  { value: 'keto', label: '生酮饮食' },
  { value: 'paleo', label: '原始人饮食' },
  { value: 'mediterranean', label: '地中海饮食' }
] as const;

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, updateProfile, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [dietType, setDietType] = useState<string>('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [calorieTarget, setCalorieTarget] = useState<string>('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newDislike, setNewDislike] = useState('');
  
  // Loading states
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Dialog states
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setDietType(user.dietaryPreferences?.dietType || 'none');
      setAllergies(user.dietaryPreferences?.allergies || []);
      setDislikes(user.dietaryPreferences?.dislikes || []);
      setCalorieTarget(user.dietaryPreferences?.calorieTarget?.toString() || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const dietaryPreferences: DietaryPreferences = {
        dietType: dietType && dietType !== 'none' ? dietType as 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean' : undefined,
        allergies: allergies.length > 0 ? allergies : undefined,
        dislikes: dislikes.length > 0 ? dislikes : undefined,
        calorieTarget: calorieTarget ? parseInt(calorieTarget) : undefined
      };

      const result = await updateProfile({
        displayName: displayName.trim() || undefined,
        email: email.trim(),
        dietaryPreferences
      });

      if (result.success) {
        toast({
          title: "个人资料已更新",
          description: "您的个人资料已成功更新。",
        });
      } else {
        toast({
          title: "更新失败",
          description: result.error || "更新个人资料时出现错误。",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "更新失败",
        description: "网络错误，请重试。",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const addDislike = () => {
    if (newDislike.trim() && !dislikes.includes(newDislike.trim())) {
      setDislikes([...dislikes, newDislike.trim()]);
      setNewDislike('');
    }
  };

  const removeDislike = (dislike: string) => {
    setDislikes(dislikes.filter(d => d !== dislike));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">个人资料</h1>
        <p className="text-gray-600">管理您的账户信息和饮食偏好</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            基本信息
          </TabsTrigger>
          <TabsTrigger value="dietary" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            饮食偏好
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            账户安全
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>
                更新您的个人基本信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={user?.username || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">用户名无法修改</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayName">显示名称</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="输入您的显示名称"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">邮箱地址</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入您的邮箱地址"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <p><strong>注册时间:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '未知'}</p>
                </div>
                <div>
                  <p><strong>最后更新:</strong> {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('zh-CN') : '未知'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dietary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>饮食偏好</CardTitle>
              <CardDescription>
                设置您的饮食偏好以获得个性化的膳食推荐
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dietType">饮食类型</Label>
                <Select value={dietType} onValueChange={setDietType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择您的饮食类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无特殊饮食</SelectItem>
                    {dietTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calorieTarget">每日卡路里目标</Label>
                <Input
                  id="calorieTarget"
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(e.target.value)}
                  placeholder="例如: 2000"
                  min="1000"
                  max="5000"
                />
                <p className="text-xs text-gray-500">留空表示无特定目标</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>过敏原</Label>
                  <p className="text-sm text-gray-500 mb-3">添加您需要避免的过敏原</p>
                  
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      placeholder="输入过敏原，如：花生、牛奶等"
                      onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                    />
                    <Button onClick={addAllergy} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {allergies.map((allergy) => (
                      <Badge key={allergy} variant="destructive" className="flex items-center gap-1">
                        {allergy}
                        <button
                          onClick={() => removeAllergy(allergy)}
                          className="ml-1 hover:bg-red-700 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>不喜欢的食物</Label>
                  <p className="text-sm text-gray-500 mb-3">添加您不喜欢的食物</p>
                  
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newDislike}
                      onChange={(e) => setNewDislike(e.target.value)}
                      placeholder="输入不喜欢的食物，如：香菜、胡萝卜等"
                      onKeyPress={(e) => e.key === 'Enter' && addDislike()}
                    />
                    <Button onClick={addDislike} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {dislikes.map((dislike) => (
                      <Badge key={dislike} variant="secondary" className="flex items-center gap-1">
                        {dislike}
                        <button
                          onClick={() => removeDislike(dislike)}
                          className="ml-1 hover:bg-gray-400 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>账户安全</CardTitle>
              <CardDescription>
                管理您的账户安全设置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">修改密码</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  为了您的账户安全，建议定期更换密码。
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsChangePasswordDialogOpen(true)}
                >
                  修改密码
                </Button>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">删除账户</h4>
                <p className="text-sm text-red-700 mb-3">
                  删除账户将永久删除您的所有数据，此操作无法撤销。
                </p>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setIsDeleteAccountDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除账户
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-6">
        <Button 
          onClick={handleUpdateProfile}
          disabled={isUpdating}
          className="min-w-[120px]"
        >
          {isUpdating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              更新中...
            </>
          ) : (
            '保存更改'
          )}
        </Button>
      </div>

      {/* Dialogs */}
      <ChangePasswordDialog
        isOpen={isChangePasswordDialogOpen}
        onClose={() => setIsChangePasswordDialogOpen(false)}
      />
      
      <DeleteAccountDialog
        isOpen={isDeleteAccountDialogOpen}
        onClose={() => setIsDeleteAccountDialogOpen(false)}
      />
    </div>
  );
}