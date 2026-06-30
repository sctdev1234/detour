import React, { useState } from 'react';
import { TextInput, View, Text, TextInputProps, TouchableOpacity } from 'react-native';
import { cn } from '../../utils/cn';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  className,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-4">
      {label && (
        <Text className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </Text>
      )}
      
      <View
        className={cn(
          'flex-row items-center border rounded-2xl bg-zinc-50 dark:bg-zinc-900 px-4 py-3',
          isFocused ? 'border-primary dark:border-primary-dark' : 'border-zinc-200 dark:border-zinc-800',
          error && 'border-destructive dark:border-destructive-dark',
          className
        )}
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        
        <TextInput
          className="flex-1 text-base text-zinc-900 dark:text-zinc-100"
          placeholderTextColor="#a1a1aa" // zinc-400
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress} className="ml-3">
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text className="mt-1 text-sm text-destructive dark:text-destructive-dark">
          {error}
        </Text>
      )}
    </View>
  );
}
