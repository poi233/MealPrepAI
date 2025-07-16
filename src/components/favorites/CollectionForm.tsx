/**
 * @fileOverview Form component for creating and editing collections
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import type { FavoriteCollection } from '@/types/favorites.types';

interface CollectionFormProps {
  initialData?: FavoriteCollection;
  onSubmit: (data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    tags?: string[];
  }) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

const PRESET_COLORS = [
  '#4DB6AC', // Teal (default)
  '#FF7043', // Deep Orange
  '#66BB6A', // Green
  '#42A5F5', // Blue
  '#AB47BC', // Purple
  '#FFA726', // Orange
  '#EF5350', // Red
  '#26A69A', // Teal Dark
];

const PRESET_ICONS = [
  'heart',
  'star',
  'bookmark',
  'folder',
  'tag',
  'coffee',
  'utensils',
  'chef-hat',
];

export function CollectionForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isEditing = false 
}: CollectionFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [color, setColor] = useState(initialData?.color || '#4DB6AC');
  const [icon, setIcon] = useState(initialData?.icon || 'heart');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
        tags,
      });
    } catch (error) {
      console.error('Failed to submit collection form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">收藏夹名称 *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入收藏夹名称"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">描述</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="添加收藏夹描述（可选）"
            rows={2}
          />
        </div>

        {/* Color Selection */}
        <div className="space-y-2">
          <Label>颜色主题</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                onClick={() => setColor(presetColor)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  color === presetColor 
                    ? 'border-gray-900 scale-110' 
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ backgroundColor: presetColor }}
                aria-label={`选择颜色 ${presetColor}`}
              />
            ))}
          </div>
        </div>

        {/* Icon Selection */}
        <div className="space-y-2">
          <Label>图标</Label>
          <div className="flex flex-wrap gap-1">
            {PRESET_ICONS.map((presetIcon) => (
              <button
                key={presetIcon}
                type="button"
                onClick={() => setIcon(presetIcon)}
                className={`p-1 text-xs rounded border transition-all ${
                  icon === presetIcon
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-300 hover:border-gray-500'
                }`}
              >
                {presetIcon}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>标签</Label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="添加标签"
              className="text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              size="sm"
              disabled={!newTag.trim() || tags.includes(newTag.trim())}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>预览</Label>
          <div 
            className="p-3 rounded-lg border-2 flex items-center gap-3"
            style={{ borderColor: color }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium text-sm"
              style={{ backgroundColor: color }}
            >
              {icon.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{name || '收藏夹名称'}</h3>
              {description && (
                <p className="text-xs text-gray-600 truncate">{description}</p>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onCancel} size="sm">
            取消
          </Button>
          <Button 
            type="submit" 
            disabled={!name.trim() || isSubmitting}
            className="bg-teal-600 hover:bg-teal-700"
            size="sm"
          >
            {isSubmitting ? '保存中...' : (isEditing ? '更新收藏夹' : '创建收藏夹')}
          </Button>
        </div>
      </form>
    </div>
  );
}