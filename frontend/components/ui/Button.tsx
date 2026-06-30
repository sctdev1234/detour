import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { cn } from '../../utils/cn';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  label?: string;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', isLoading = false, label, icon, leftIcon, rightIcon, className, onPress, children, ...props }: ButtonProps) {
  const handlePress = (e: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) onPress(e);
  };

  const baseStyles = 'flex-row items-center justify-center rounded-full active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-primary dark:bg-primary-dark',
    secondary: 'bg-zinc-200 dark:bg-zinc-800',
    ghost: 'bg-transparent',
    destructive: 'bg-destructive dark:bg-destructive-dark',
  };

  const textVariants = {
    primary: 'text-white dark:text-zinc-900',
    secondary: 'text-zinc-900 dark:text-zinc-100',
    ghost: 'text-zinc-900 dark:text-zinc-100',
    destructive: 'text-white dark:text-zinc-900',
  };

  const sizes = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4',
  };

  const textSizes = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-lg font-bold',
  };

  const renderIcon = icon || leftIcon;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={isLoading || props.disabled}
      className={cn(baseStyles, variants[variant], sizes[size], (isLoading || props.disabled) && 'opacity-50', className)}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? '#18181b' : '#ffffff'} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {renderIcon}
          {children ? (
             typeof children === 'string' ? <Text className={cn('text-center', textVariants[variant], textSizes[size])}>{children}</Text> : children
          ) : (
            label && <Text className={cn('text-center', textVariants[variant], textSizes[size])}>{label}</Text>
          )}
          {rightIcon}
        </View>
      )}
    </TouchableOpacity>
  );
}
