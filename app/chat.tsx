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
            addMessage(requestId, user.uid, inputText.trim());
            setInputText('');
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.senderId === user?.uid;

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
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    myMessageWrapper: {
        justifyContent: 'flex-end',
    },
    theirMessageWrapper: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    myBubble: {
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputArea: {
        padding: 12,
        borderTopWidth: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingHorizontal: 12,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
