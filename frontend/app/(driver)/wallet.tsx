import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';
import Header from '../../components/Header';
import { Wallet, TrendingUp, History, Download } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WalletScreen() {
    const { wallet, isLoading, error, fetchWallet, withdraw } = useFinanceStore();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useEffect(() => {
        fetchWallet();
    }, []);

    const handleWithdraw = () => {
        if (wallet && wallet.balance > 0) {
            // Withdraw full balance for simplicity, or we could prompt for amount
            withdraw(wallet.balance);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
            <Header />
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {isLoading && !wallet ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
                            <View style={styles.balanceHeader}>
                                <Wallet color="#fff" size={24} />
                                <Text style={styles.balanceTitle}>Available Balance</Text>
                            </View>
                            <Text style={styles.balanceAmount}>{wallet?.balance?.toFixed(2) || '0.00'} MAD</Text>
                            
                            <TouchableOpacity 
                                style={[
                                    styles.withdrawBtn, 
                                    (!wallet || wallet.balance <= 0 || isLoading) && styles.withdrawBtnDisabled
                                ]}
                                onPress={handleWithdraw}
                                disabled={!wallet || wallet.balance <= 0 || isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color={theme.primary} />
                                ) : (
                                    <>
                                        <Download color={theme.primary} size={18} />
                                        <Text style={[styles.withdrawText, { color: theme.primary }]}>Withdraw Funds</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={[styles.statBox, { backgroundColor: theme.surfaceHighlight }]}>
                                <TrendingUp color={theme.success} size={20} />
                                <Text style={[styles.statValue, { color: theme.text }]}>{wallet?.earningsToday?.toFixed(2) || '0.00'} MAD</Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Today's Earnings</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: theme.surfaceHighlight }]}>
                                <History color={theme.textSecondary} size={20} />
                                <Text style={[styles.statValue, { color: theme.text }]}>{wallet?.earningsTotal?.toFixed(2) || '0.00'} MAD</Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Earnings</Text>
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
                        
                        {error ? (
                            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
                        ) : wallet?.transactions?.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>No transactions yet.</Text>
                            </View>
                        ) : (
                            wallet?.transactions?.map((tx, index) => (
                                <View key={index} style={[styles.txItem, { borderBottomColor: theme.border }]}>
                                    <View style={styles.txLeft}>
                                        <Text style={[styles.txType, { color: theme.text }]}>{tx.category.replace('_', ' ').toUpperCase()}</Text>
                                        <Text style={[styles.txDate, { color: theme.textSecondary }]}>
                                            {new Date(tx.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.txRight}>
                                        <Text style={[
                                            styles.txAmount, 
                                            { color: tx.type === 'CREDIT' ? theme.success : theme.text }
                                        ]}>
                                            {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toFixed(2)} MAD
                                        </Text>
                                        <Text style={[styles.txStatus, { color: theme.textSecondary }]}>{tx.status}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16 },
    balanceCard: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    balanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    balanceTitle: { color: '#fff', fontSize: 16, marginLeft: 8, opacity: 0.9 },
    balanceAmount: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginBottom: 24 },
    withdrawBtn: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        width: '100%',
        justifyContent: 'center',
    },
    withdrawBtnDisabled: { opacity: 0.6 },
    withdrawText: { fontWeight: '600', fontSize: 16, marginLeft: 8 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    statBox: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    statValue: { fontSize: 20, fontWeight: '700', marginTop: 8, marginBottom: 4 },
    statLabel: { fontSize: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
    errorText: { marginTop: 20, textAlign: 'center' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateText: { fontSize: 16 },
    txItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    txLeft: { flex: 1 },
    txType: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    txDate: { fontSize: 12 },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    txStatus: { fontSize: 12, textTransform: 'capitalize' },
});
