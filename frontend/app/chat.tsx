import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { Message, useChatStore } from '../store/useChatStore';

export default function ChatScreen() {
    const { requestId, recipientName } = useLocalSearchParams<{ requestId: string; recipientName: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { conversations, addMessage } = useChatStore();

    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const messages = conversations[requestId]?.messages || [];

    const handleSend = () => {
        if (inputText.trim() && user) {
            addMessage(requestId, user.id, inputText.trim());
            setInputText('');
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.senderId === user?.id;

        return (
            <View style={[
                styles.messageWrapper,
                isMe ? styles.myMessageWrapper : styles.theirMessageWrapper
            ]}>
                <View style={[
                    styles.messageBubble,
                    { backgroundColor: isMe ? theme.primary : theme.surface },
                    isMe ? styles.myBubble : styles.theirBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        { color: isMe ? '#fff' : theme.text }
                    ]}>
                        {item.text}
                    </Text>
                    <Text style={[
                        styles.timestamp,
                        { color: isMe ? '#ffffffb0' : theme.icon }
                    ]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: theme.background }]}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{recipientName || 'Chat'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={[styles.inputArea, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Type a message..."
                        placeholderTextColor={theme.icon}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: theme.primary }]}
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                    >
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 100,
        paddingTop: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        elevation: 2,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    listContent: {
        padding: 20,
        gap: 16,
        paddingBottom: 20,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    myMessageWrapper: {
        justifyContent: 'flex-end',
    },
    theirMessageWrapper: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '75%',
        padding: 16,
        borderRadius: 24,
        elevation: 1,
        boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
    },
    myBubble: {
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0.3,
    },
    timestamp: {
        fontSize: 11,
        marginTop: 6,
        alignSelf: 'flex-end',
        opacity: 0.8,
        fontWeight: '500',
    },
    inputArea: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1,
        elevation: 10,
        boxShadow: '0px -4px 20px rgba(0,0,0,0.05)',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 56,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 120,
        paddingHorizontal: 12,
        lineHeight: 22,
        paddingVertical: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        elevation: 2,
        boxShadow: '0px 2px 6px rgba(0,0,0,0.1)',
    },
});

