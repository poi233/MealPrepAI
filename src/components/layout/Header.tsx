
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Heart, FolderHeart, Menu, X, User, LogOut, ChefHat } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';


export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "已退出登录",
        description: "您已成功退出登录。",
      });
    } catch (error) {
      toast({
        title: "退出登录失败",
        description: "请重试。",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <header className="bg-gradient-to-r from-teal-50 to-blue-50 border-b border-teal-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 text-2xl md:text-3xl font-bold text-teal-700 hover:text-teal-800 transition-colors">
              <div className="p-2 bg-teal-600 rounded-xl text-white">
                <UtensilsCrossed size={32} />
              </div>
              <span className="hidden sm:block">膳食规划AI</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-3">
              {isAuthenticated && (
                <>
                  <Link href="/dashboard/recipes">
                    <Button
                      variant="ghost"
                      className="text-teal-700 hover:bg-teal-100 h-10 px-4 font-medium"
                    >
                      <ChefHat className="mr-2 h-4 w-4" />
                      我的食谱
                    </Button>
                  </Link>

                  <Link href="/dashboard/favorites">
                    <Button
                      variant="ghost"
                      className="text-teal-700 hover:bg-teal-100 h-10 px-4 font-medium"
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      我的收藏
                    </Button>
                  </Link>

                  <Link href="/collections">
                    <Button
                      variant="ghost"
                      className="text-teal-700 hover:bg-teal-100 h-10 px-4 font-medium"
                    >
                      <FolderHeart className="mr-2 h-4 w-4" />
                      收藏夹管理
                    </Button>
                  </Link>
                </>
              )}

              {/* User Menu or Login/Register */}
              {isAuthLoading ? (
                <div className="h-10 w-10 animate-pulse bg-teal-200 rounded-full"></div>
              ) : isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-10 px-3 text-teal-700 hover:bg-teal-100">
                      <User className="mr-2 h-4 w-4" />
                      <span className="max-w-[120px] truncate">
                        {user.displayName || user.username}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>个人资料</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-600"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>退出登录</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" asChild className="text-teal-700 hover:bg-teal-100">
                    <Link href="/auth/login">登录</Link>
                  </Button>
                  <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
                    <Link href="/auth/register">注册</Link>
                  </Button>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-teal-700 hover:bg-teal-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="lg:hidden mt-4 pt-4 border-t border-teal-200">
              <nav className="flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    {/* User info section for mobile */}
                    <div className="px-3 py-2 bg-teal-50 rounded-lg mx-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-teal-900 truncate">
                            {user?.displayName || user?.username}
                          </p>
                          <p className="text-xs text-teal-600 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Link href="/dashboard/recipes" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-teal-700 hover:bg-teal-100 h-12"
                      >
                        <ChefHat className="mr-3 h-5 w-5" />
                        我的食谱
                      </Button>
                    </Link>

                    <Link href="/dashboard/favorites" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-teal-700 hover:bg-teal-100 h-12"
                      >
                        <Heart className="mr-3 h-5 w-5" />
                        我的收藏
                      </Button>
                    </Link>

                    <Link href="/collections" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-teal-700 hover:bg-teal-100 h-12"
                      >
                        <FolderHeart className="mr-3 h-5 w-5" />
                        收藏夹管理
                      </Button>
                    </Link>

                    <Link href="/dashboard/profile" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-teal-700 hover:bg-teal-100 h-12"
                      >
                        <User className="mr-3 h-5 w-5" />
                        个人资料
                      </Button>
                    </Link>



                    {/* Logout button for mobile */}
                    <div className="px-3 py-2 border-t border-teal-200 mt-2">
                      <Button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:bg-red-50 h-12"
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        退出登录
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Login/Register buttons for mobile when not authenticated */
                  <div className="px-3 py-2 space-y-2">
                    <Button
                      asChild
                      variant="ghost"
                      className="w-full text-teal-700 hover:bg-teal-100 h-12"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link href="/auth/login">登录</Link>
                    </Button>
                    <Button
                      asChild
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link href="/auth/register">注册</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

    </>
  );
}

