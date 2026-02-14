import { useRouter } from 'expo-router';
import { AlertCircle, Plus } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { Reclamation, useReclamations } from '../../hooks/api/useReclamationQueries';

export default function ReclamationsListScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const { data: myReclamations, isLoading } = useReclamations();

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
            <View style={[styles.header, { justifyContent: 'center', paddingTop: 80, paddingBottom: 10 }]}>
                <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Support</Text>
            </View>

            {isLoading ? (
                <View style={styles.empty}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={myReclamations || []}
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
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/reclamations/new')}
            >
                <Plus size={28} color="#fff" />
            </TouchableOpacity>
        </View>
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
        paddingTop: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    list: {
        padding: 24,
        gap: 20,
        paddingBottom: 100,
    },
    card: {
        padding: 24,
        borderRadius: 24,
        gap: 12,
        elevation: 2,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    type: {
        fontSize: 13,
        fontWeight: '800',
        opacity: 0.6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    subject: {
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 26,
    },
    date: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 4,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    empty: {
        alignItems: 'center',
        marginTop: 120,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.6,
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.25)',
    }
});

