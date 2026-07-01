import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';
import Header from '../../components/Header';
import { BarChart, Clock, CheckCircle2, XCircle, Award } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';

export default function StatsScreen() {
    const { stats, isLoading, error, fetchStats } = useAnalyticsStore();
    const { user } = useAuthStore();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
            <Header title="My Performance" showBack />
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {isLoading && !stats ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : error ? (
                    <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
                ) : (
                    <>
                        <View style={[styles.headerCard, { backgroundColor: theme.surfaceHighlight }]}>
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                                <Text style={styles.avatarText}>{user?.fullName?.[0] || 'D'}</Text>
                            </View>
                            <View style={styles.headerInfo}>
                                <Text style={[styles.nameText, { color: theme.text }]}>{user?.fullName || 'Driver'}</Text>
                                <Text style={[styles.memberSince, { color: theme.textSecondary }]}>
                                    Member since {stats?.memberSince ? new Date(stats.memberSince).getFullYear() : '2026'}
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Metrics</Text>
                        
                        <View style={styles.grid}>
                            <View style={[styles.gridItem, { backgroundColor: theme.surfaceHighlight }]}>
                                <Award color={theme.primary} size={24} />
                                <Text style={[styles.gridValue, { color: theme.text }]}>{stats?.acceptanceRate?.toFixed(1) || '100'}%</Text>
                                <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Acceptance</Text>
                            </View>
                            
                            <View style={[styles.gridItem, { backgroundColor: theme.surfaceHighlight }]}>
                                <CheckCircle2 color={theme.success} size={24} />
                                <Text style={[styles.gridValue, { color: theme.text }]}>{stats?.completionRate?.toFixed(1) || '100'}%</Text>
                                <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Completion</Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: theme.surfaceHighlight }]}>
                                <Clock color="#EAB308" size={24} />
                                <Text style={[styles.gridValue, { color: theme.text }]}>{stats?.hoursOnline?.toFixed(1) || '0'}</Text>
                                <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Hours Online</Text>
                            </View>
                            
                            <View style={[styles.gridItem, { backgroundColor: theme.surfaceHighlight }]}>
                                <BarChart color={theme.secondary || theme.primary} size={24} />
                                <Text style={[styles.gridValue, { color: theme.text }]}>{stats?.tripsCompleted || '0'}</Text>
                                <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Total Trips</Text>
                            </View>
                        </View>

                        <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
                            <Text style={styles.summaryTitle}>Total Lifetime Earnings</Text>
                            <Text style={styles.summaryValue}>{stats?.earningsTotal?.toFixed(2) || '0.00'} MAD</Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16 },
    headerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        marginBottom: 32,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    headerInfo: { flex: 1 },
    nameText: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    memberSince: { fontSize: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    gridItem: {
        width: '48%',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    gridValue: { fontSize: 24, fontWeight: '700', marginTop: 12, marginBottom: 4 },
    gridLabel: { fontSize: 14 },
    summaryCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    summaryTitle: { color: '#fff', fontSize: 16, opacity: 0.9, marginBottom: 8 },
    summaryValue: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
    errorText: { marginTop: 20, textAlign: 'center' },
});
