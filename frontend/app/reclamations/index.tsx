import { useRouter } from 'expo-router';
import { AlertCircle, ChevronLeft, Plus } from 'lucide-react-native';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { Reclamation, useReclamationStore } from '../../store/useReclamationStore';

export default function ReclamationsListScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { getReclamationsByReporter } = useReclamationStore();

    const myReclamations = user ? getReclamationsByReporter(user.id) : [];

    const renderItem = ({ item }: { item: Reclamation }) => {
        const getStatusColor = (status: string) => {
            switch (status) {
                case 'resolved': return '#4CD964';
                case 'investigating': return '#FF9500';
                case 'dismissed': return '#8E8E93';
                default: return theme.primary; // pending
            }
        };

        return (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.type, { color: theme.text }]}>{item.type.toUpperCase().replace('_', ' ')}</Text>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={[styles.subject, { color: theme.text }]}>{item.subject}</Text>
                <Text style={[styles.date, { color: theme.icon }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Support & Reclamations</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={myReclamations}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <AlertCircle size={48} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.icon }]}>No reclamations found</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/reclamations/new')}
            >
                <Plus size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingTop: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    list: {
        padding: 24,
        gap: 16,
    },
    card: {
        padding: 16,
        borderRadius: 16,
        gap: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    type: {
        fontSize: 12,
        fontWeight: '700',
        opacity: 0.6,
    },
    subject: {
        fontSize: 16,
        fontWeight: '600',
    },
    date: {
        fontSize: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    empty: {
        alignItems: 'center',
        marginTop: 100,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    }
});
