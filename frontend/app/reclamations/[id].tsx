import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ChevronLeft, Send, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { Colors } from '../../constants/theme';
import { reclamationKeys, useAddMessage, useReclamation } from '../../hooks/api/useReclamationQueries';
import api from '../../services/api';
import SocketService from '../../services/socket';
import { useAuthStore } from '../../store/useAuthStore';

export default function ReclamationDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Hooks
    const { data: reclamation, isLoading } = useReclamation(id);
    const { mutate: sendMessage, isPending: isSending } = useAddMessage(id);

    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const messages = reclamation?.messages || [];

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    // Socket Connection
    useEffect(() => {
        if (!id) return;

        const socket = SocketService.connect();
        socket.emit('join_reclamation', id);

        socket.on('new_message', (newMessage) => {
            // Update query data directly
            queryClient.setQueryData(reclamationKeys.detail(id), (oldData: any) => {
                if (!oldData) return oldData;

                // Check if message already exists to avoid duplicates
                const exists = oldData.messages?.some((m: any) => m._id === newMessage._id);
                if (exists) return oldData;

                return {
                    ...oldData,
                    messages: [...(oldData.messages || []), newMessage]
                };
            });
        });

        return () => {
            socket.emit('leave_reclamation', id);
            socket.off('new_message');
        };
    }, [id]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() && !selectedImage) return;

        let imageUrl = null;

        if (selectedImage) {
            try {
                const formData = new FormData();
                if (Platform.OS === 'web') {
                    const response = await fetch(selectedImage);
                    const blob = await response.blob();
                    formData.append('image', blob, 'chat_image.jpg');
                } else {
                    formData.append('image', {
                        uri: selectedImage,
                        name: 'chat_image.jpg',
                        type: 'image/jpeg',
                    } as any);
                }

                // Assuming generic upload route exists at /upload (mapped to /api/upload provided by axios instance baseURL)
                // Actually axios instance has baseURL /api. So post to '/upload'.
                // Checking services/api.ts logic... usually baseURL includes /api
                // So api.post('/upload') -> /api/upload.
                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    transformRequest: (data, headers) => {
                        return data; // Prevent axios from transforming FormData
                    },
                });
                imageUrl = uploadRes.data.url;
            } catch (error) {
                console.error('Image upload failed:', error);
                alert('Failed to upload image');
                return;
            }
        }

        sendMessage({ text: inputText.trim(), image: imageUrl }, {
            onSuccess: () => {
                setInputText('');
                setSelectedImage(null);
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved': return '#4CD964';
            case 'investigating': return '#FF9500';
            case 'dismissed': return '#8E8E93';
            default: return theme.primary; // pending
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const senderId = typeof item.senderId === 'string' ? item.senderId : item.senderId._id;
        console.log('[DEBUG] renderMessage:', { senderId, userId: user?.id, isMe: senderId === user?.id });
        const isMe = senderId === user?.id;
        const senderName = typeof item.senderId === 'object' ? item.senderId.fullName : 'Support';
        const senderPhoto = typeof item.senderId === 'object' ? item.senderId.photoURL : null;

        return (
            <View style={[
                styles.messageWrapper,
                isMe ? styles.myMessageWrapper : styles.theirMessageWrapper
            ]}>
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        {senderPhoto ? (
                            <Image source={{ uri: senderPhoto }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: theme.surface }]}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.text }}>{senderName.charAt(0)}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={[
                    styles.messageBubble,
                    { backgroundColor: isMe ? theme.primary : theme.surface },
                    isMe ? styles.myBubble : styles.theirBubble
                ]}>
                    {!isMe && <Text style={[styles.senderName, { color: theme.primary }]}>{senderName}</Text>}
                    {item.image && (
                        <Image
                            source={{ uri: item.image }}
                            style={{ width: 200, height: 150, borderRadius: 12, marginBottom: 5 }}
                            contentFit="cover"
                        />
                    )}
                    <Text style={[
                        styles.messageText,
                        { color: isMe ? '#fff' : theme.text }
                    ]}>
                        {item.text}
                    </Text>
                    <Text style={[
                        styles.timestamp,
                        { color: isMe ? 'rgba(255,255,255,0.7)' : theme.icon }
                    ]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    const renderHeader = () => (
        <View style={styles.listHeader}>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.type, { color: theme.text }]}>
                        {reclamation?.type.toUpperCase().replace('_', ' ')}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(reclamation?.status || 'pending') + '20' }]}>
                        <Text style={[styles.badgeText, { color: getStatusColor(reclamation?.status || 'pending') }]}>
                            {reclamation?.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.subject, { color: theme.text }]}>{reclamation?.subject}</Text>
                <Text style={[styles.description, { color: theme.text }]}>{reclamation?.description}</Text>

                {reclamation?.evidenceUrls && reclamation.evidenceUrls.length > 0 && (
                    <View style={styles.evidenceContainer}>
                        {reclamation.evidenceUrls.map((url, index) => (
                            <Image
                                key={index}
                                source={{ uri: url }}
                                style={styles.evidenceImage}
                                contentFit="cover"
                            />
                        ))}
                    </View>
                )}
                <Text style={[styles.date, { color: theme.icon }]}>
                    Ticket #{reclamation?.id.substring(reclamation.id.length - 6).toUpperCase()} • {new Date(reclamation?.createdAt || Date.now()).toLocaleDateString()}
                </Text>
            </View>

            <View style={styles.divider}>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
                <Text style={[styles.dividerText, { color: theme.icon, backgroundColor: theme.background }]}>Messages</Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: theme.background }]}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={[styles.header, { backgroundColor: theme.background }]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.surface }]}
                    onPress={() => router.back()}
                >
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Reclamation Details</Text>
                <View style={{ width: 44 }} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item._id || Math.random().toString()}
                renderItem={renderMessage}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={[styles.inputArea, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                {selectedImage && (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                        <TouchableOpacity style={styles.removePreview} onPress={() => setSelectedImage(null)}>
                            <X size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
                    <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
                        <Camera size={24} color={theme.primary} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Type a message..."
                        placeholderTextColor={theme.icon}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: theme.primary, opacity: (!inputText.trim() && !selectedImage || isSending) ? 0.5 : 1 }]}
                        onPress={handleSend}
                        disabled={(!inputText.trim() && !selectedImage) || isSending}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Send size={20} color="#fff" />
                        )}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 16,
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    listContent: {
        padding: 20,
        paddingBottom: 20,
    },
    listHeader: {
        marginBottom: 24,
    },
    card: {
        padding: 20,
        borderRadius: 24,
        gap: 12,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    type: {
        fontSize: 12,
        fontWeight: '800',
        opacity: 0.6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    subject: {
        fontSize: 18,
        fontWeight: '700',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        opacity: 0.8,
    },
    evidenceContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    evidenceImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
    },
    date: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.5,
        marginTop: 4,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    line: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        opacity: 0.5,
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: '600',
        zIndex: 1,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
    },
    myMessageWrapper: {
        justifyContent: 'flex-end',
    },
    theirMessageWrapper: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        marginRight: 8,
        marginBottom: 4,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    messageBubble: {
        maxWidth: '75%',
        padding: 16,
        borderRadius: 20,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    myBubble: {
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        borderBottomLeftRadius: 4,
    },
    senderName: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputArea: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 52,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    input: {
        flex: 1,
        fontSize: 15,
        maxHeight: 100,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    previewContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    previewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    removePreview: {
        position: 'absolute',
        top: -5,
        left: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 10,
        padding: 2,
    },
    attachButton: {
        paddingRight: 10,
    },
});
