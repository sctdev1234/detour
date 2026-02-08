import { useUIStore } from '@/store/useUIStore';
import { LinearGradient } from 'expo-linear-gradient';
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
            <LinearGradient
                colors={[theme.primary, theme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={[styles.title, { color: '#fff' }]}>My Wallet</Text>
                <View style={{ width: 44 }} />
            </LinearGradient>

            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.balanceAmount}>{wallet.balance.toFixed(2)} DZD</Text>
                <View style={[styles.statusBadge, { backgroundColor: wallet.subscriptionStatus === 'pro' ? '#FFD700' : 'rgba(255,255,255,0.2)' }]}>
                    <Text style={[styles.statusText, { color: wallet.subscriptionStatus === 'pro' ? '#000' : '#fff' }]}>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 20,
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
    balanceCard: {
        backgroundColor: '#2A2D3E', // Keep dark card for contrast
        marginHorizontal: 24,
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        gap: 8,
        elevation: 8,
        boxShadow: '0px 8px 24px rgba(42, 45, 62, 0.4)',
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    balanceAmount: {
        color: '#fff',
        fontSize: 42,
        fontWeight: '800',
        letterSpacing: -1,
    },
    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 16,
        marginTop: 32,
    },
    actionButton: {
        flex: 1,
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        gap: 12,
        elevation: 4,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.05)',
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontWeight: '700',
        fontSize: 15,
    },
    historySection: {
        flex: 1,
        marginTop: 32,
        backgroundColor: '#fff',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 24,
        boxShadow: '0px -4px 24px rgba(0,0,0,0.03)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        paddingLeft: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    list: {
        gap: 16,
        paddingBottom: 40,
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        borderRadius: 20,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionInfo: {
        flex: 1,
        gap: 4,
    },
    transactionDesc: {
        fontSize: 16,
        fontWeight: '700',
    },
    transactionDate: {
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.6,
    },
    transactionAmount: {
        fontSize: 17,
        fontWeight: '800',
    }
});

