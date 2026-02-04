import { useUIStore } from '@/store/useUIStore';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, CreditCard, DollarSign, History } from 'lucide-react-native';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { Transaction, useFinanceStore } from '../../store/useFinanceStore';

export default function WalletScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { user } = useAuthStore();
    const { getWallet, wallets, transactions, subscribe } = useFinanceStore();
    const { showConfirm } = useUIStore();

    // Force re-render when store updates
    const wallet = user ? (wallets[user.id] || getWallet(user.id)) : null;
    const myTransactions = user ? transactions.filter(t => t.userId === user.id) : [];

    {/* Transactions List */ }
    const renderTransaction = ({ item }: { item: Transaction }) => {
        const isPositive = item.amount > 0;
        return (
            <View style={[styles.transactionCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.iconContainer, { backgroundColor: isPositive ? '#E8F5E9' : '#FFEBEE' }]}>
                    {isPositive ?
                        <ArrowDownLeft size={20} color="#4CD964" /> :
                        <ArrowUpRight size={20} color="#FF3B30" />
                    }
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionDesc, { color: theme.text }]}>{item.description}</Text>
                    <Text style={[styles.transactionDate, { color: theme.icon }]}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
                <Text style={[
                    styles.transactionAmount,
                    { color: isPositive ? '#4CD964' : theme.text }
                ]}>
                    {isPositive ? '+' : ''}{item.amount.toFixed(2)} DZD
                </Text>
            </View>
        );
    };

    const handleSubscribe = () => {
        showConfirm(
            'Upgrade to Pro',
            'Subscribe for 29.99 DZD/month to unlock exclusive features.',
            () => {
                if (user) subscribe(user.id);
            },
            () => { },
            'Subscribe',
            'Cancel'
        );
    };

    if (!user || !wallet) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>My Wallet</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.balanceAmount}>{wallet.balance.toFixed(2)} DZD</Text>
                <View style={[styles.statusBadge, { backgroundColor: wallet.subscriptionStatus === 'pro' ? '#FFD700' : '#E0E0E0' }]}>
                    <Text style={[styles.statusText, { color: wallet.subscriptionStatus === 'pro' ? '#000' : '#666' }]}>
                        {wallet.subscriptionStatus === 'pro' ? 'PRO MEMBER' : 'FREE PLAN'}
                    </Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface }]}
                    onPress={handleSubscribe}
                    disabled={wallet.subscriptionStatus === 'pro'}
                >
                    <View style={[styles.actionIcon, { backgroundColor: theme.primary + '20' }]}>
                        <CreditCard size={24} color={theme.primary} />
                    </View>
                    <Text style={[styles.actionText, { color: theme.text }]}>Subscription</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.surface }]}>
                    <View style={[styles.actionIcon, { backgroundColor: '#4CD96420' }]}>
                        <DollarSign size={24} color="#4CD964" />
                    </View>
                    <Text style={[styles.actionText, { color: theme.text }]}>Cashout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.historySection}>
                <View style={styles.sectionHeader}>
                    <History size={20} color={theme.text} />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
                </View>

                <FlatList
                    data={myTransactions}
                    keyExtractor={item => item.id}
                    renderItem={renderTransaction}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            </View>
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
    balanceCard: {
        backgroundColor: '#2A2D3E', // Dark card
        margin: 24,
        marginTop: 0,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        gap: 8,
    },
    balanceLabel: {
        color: '#rgba(255,255,255,0.7)',
        fontSize: 14,
    },
    balanceAmount: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 16,
    },
    actionButton: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontWeight: '600',
        fontSize: 14,
    },
    historySection: {
        flex: 1,
        marginTop: 24,
        backgroundColor: '#fff', // Or theme dependent
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    list: {
        gap: 16,
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionInfo: {
        flex: 1,
    },
    transactionDesc: {
        fontSize: 16,
        fontWeight: '600',
    },
    transactionDate: {
        fontSize: 12,
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '700',
    }
});
