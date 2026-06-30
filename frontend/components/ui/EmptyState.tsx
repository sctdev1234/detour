import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { cn } from '../../utils/cn';
import { LucideIcon } from 'lucide-react-native';

export interface EmptyStateProps extends ViewProps {
  icon: React.ElementType; // Accept LucideIcon component
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center p-8', className)} {...props}>
      <View className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-6">
        <Icon size={48} color="#a1a1aa" /> 
      </View>
      <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50 text-center mb-2">
        {title}
      </Text>
      {description && (
        <Text className="text-base text-zinc-500 dark:text-zinc-400 text-center mb-6">
          {description}
        </Text>
      )}
      {action && <View className="mt-2">{action}</View>}
    </View>
  );
}
