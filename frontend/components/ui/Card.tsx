import React from 'react';
import { View, ViewProps, Text, TextProps } from 'react-native';
import { cn } from '../../utils/cn';

export interface CardProps extends ViewProps {
  elevated?: boolean;
}

export function Card({ className, elevated = false, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'bg-surface dark:bg-surface-dark rounded-3xl p-5',
        elevated && 'shadow-xl shadow-zinc-200 dark:shadow-none',
        'border border-zinc-100 dark:border-zinc-800',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps) {
  return <View className={cn('flex flex-row items-center p-6 pt-0', className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: TextProps & { children: React.ReactNode }) {
  return (
    <Text
      className={cn('text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2', className)}
      {...props}
    >
      {children}
    </Text>
  );
}

export function CardDescription({ className, children, ...props }: TextProps & { children: React.ReactNode }) {
  return (
    <Text
      className={cn('text-sm text-zinc-500 dark:text-zinc-400 mb-4', className)}
      {...props}
    >
      {children}
    </Text>
  );
}
