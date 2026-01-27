import { Star, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../constants/theme';

interface RatingModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => void;
    title?: string;
    recipientName?: string;
}

export default function RatingModal({ visible, onClose, onSubmit, title, recipientName }: RatingModalProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const handleRating = (r: number) => {
        setRating(r);
    };

    const handleSubmit = () => {
        if (rating > 0) {
            onSubmit(rating, comment);
            setRating(0);
            setComment('');
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: theme.surface }]}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <X size={24} color={theme.icon} />
                    </TouchableOpacity>

                    <Text style={[styles.title, { color: theme.text }]}>{title || 'Rate your Trip'}</Text>
                    {recipientName && (
                        <Text style={[styles.subtitle, { color: theme.icon }]}>How was your trip with {recipientName}?</Text>
                    )}

                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <TouchableOpacity key={i} onPress={() => handleRating(i)}>
                                <Star
                                    size={40}
                                    fill={i <= rating ? theme.primary : 'transparent'}
                                    color={i <= rating ? theme.primary : theme.border}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                        placeholder="Write a comment (optional)..."
                        placeholderTextColor={theme.icon}
                        multiline
                        numberOfLines={4}
                        value={comment}
                        onChangeText={setComment}
                    />

                    <TouchableOpacity
                        style={[styles.submitButton, { backgroundColor: theme.primary, opacity: rating > 0 ? 1 : 0.5 }]}
                        onPress={handleSubmit}
                        disabled={rating === 0}
                    >
                        <Text style={styles.submitText}>Submit Rating</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        gap: 16,
    },
    closeButton: {
        alignSelf: 'flex-end',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginVertical: 16,
    },
    input: {
        width: '100%',
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        textAlignVertical: 'top',
        height: 100,
    },
    submitButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    submitText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
