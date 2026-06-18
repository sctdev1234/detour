import { useFocusEffect, useRouter } from 'expo-router';
import { 
    AlertCircle, 
    Plus, 
    Trash2, 
    ShieldAlert, 
    Frown, 
    Package, 
    Wrench, 
    HelpCircle 
} from 'lucide-react-native';
import React from 'react';
import { 
    ActivityIndicator, 
    Alert, 
    FlatList, 
    StyleSheet, 
    Text, 
    TouchableOpacity, 
    useColorScheme, 
    View 
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { 
    Reclamation, 
    useReclamations, 
    useMarkReclamationRead, 
    useDeleteReclamation 
} from '../../hooks/api/useReclamationQueries';
import { useAuthStore } from '../../store/useAuthStore';

export default function ReclamationsListScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();

    const { data: myReclamations, isLoading, refetch } = useReclamations();
    const { mutate: markRead } = useMarkReclamationRead();
    const { mutate: deleteReclamation } = useDeleteReclamation();

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch])
    );

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Ticket',
            'Are you sure you want to delete this ticket? It will be removed permanently.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive', 
                    onPress: () => deleteReclamation(id) 
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved': return '#4CD964';
            case 'investigating': return '#FF9500';
            case 'dismissed': return '#8E8E93';
            default: return theme.primary; // pending
        }
    };

    const getTypeIcon = (type: string, color: string) => {
        switch (type) {
            case 'accident':
                return <ShieldAlert size={20} color={color} />;
            case 'behaving':
                return <Frown size={20} color={color} />;
            case 'lost_item':
                return <Package size={20} color={color} />;
            case 'technical':
                return <Wrench size={20} color={color} />;
            default:
                return <HelpCircle size={20} color={color} />;
        }
    };

    const renderItem = ({ item, index }: { item: Reclamation; index: number }) => {
        const currentUserId = user?.id || (user as any)?._id;
        const unreadCount = item.messages?.filter(m => {
            const senderId = typeof m.senderId === 'string' ? m.senderId : (m.senderId as any)._id;
            return senderId !== currentUserId && !m.read;
        }).length || 0;

        const statusColor = getStatusColor(item.status);

        return (
            <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.surface }]}
                    onPress={() => {
                        markRead(item.id);
                        router.push(`/reclamations/${item.id}`);
                    }}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardLayout}>
                        {/* Type Icon Container */}
                        <View style={[styles.iconContainer, { backgroundColor: statusColor + '12' }]}>
                            {getTypeIcon(item.type, statusColor)}
                        </View>

                        {/* Content */}
                        <View style={styles.cardContent}>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.type, { color: theme.icon }]} numberOfLines={1}>
                                    #{item.id.substring(item.id.length - 6).toUpperCase()} • {item.type.replace('_', ' ').toUpperCase()}
                                </Text>
                                
                                <View style={styles.badgeRow}>
                                    {unreadCount > 0 && (
                                        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                                            <Text style={[styles.badgeText, { color: '#fff' }]}>{unreadCount} new</Text>
                                        </View>
                                    )}
                                    <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                                        <Text style={[styles.badgeText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={[styles.subject, { color: theme.text }]} numberOfLines={1}>
                                {item.subject}
                            </Text>

                            <View style={styles.cardFooter}>
                                <Text style={[styles.date, { color: theme.icon }]}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </Text>

                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleDelete(item.id);
                                    }}
                                    style={[styles.deleteButton, { backgroundColor: theme.background }]}
                                    activeOpacity={0.6}
                                >
                                    <Trash2 size={15} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Support Tickets</Text>
            </View>

            {isLoading ? (
                <View style={styles.empty}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={myReclamations || []}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => renderItem({ item, index })}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <AlertCircle size={48} color={theme.border} />
                            <Text style={[styles.emptyText, { color: theme.icon }]}>No support tickets found</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/reclamations/new')}
                activeOpacity={0.85}
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
        paddingHorizontal: 24,
        paddingTop: 80, // Offset for the custom global header
        paddingBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    list: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 120,
        gap: 16,
    },
    card: {
        borderRadius: 24,
        padding: 16,
        elevation: 2,
        boxShadow: '0px 8px 24px rgba(0,0,0,0.02)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    cardLayout: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        gap: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    type: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    subject: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginRight: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    date: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.6,
    },
    deleteButton: {
        width: 30,
        height: 30,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.1)',
    },
    empty: {
        alignItems: 'center',
        marginTop: 140,
        gap: 16,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        boxShadow: '0px 12px 24px rgba(0,0,0,0.15)',
    }
});
