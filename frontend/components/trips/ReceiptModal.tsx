import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { CheckCircle2, ChevronRight, Download, MapPin, Navigation, Shield, Star, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClientTrip } from '../../types';

type Props = {
    visible: boolean;
    trip: ClientTrip | null;
    theme: any;
    isDark: boolean;
    onClose: () => void;
    onDownloadReceipt?: () => void;
};

export default function ReceiptModal({ visible, trip, theme, isDark, onClose, onDownloadReceipt }: Props) {
    const insets = useSafeAreaInsets();
    const [rating, setRating] = useState(0);

    if (!trip) return null;

    const surfaceBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';

    // Mock fare breakdown if not provided by backend
    const baseFare = (trip.price * 0.7).toFixed(2);
    const distanceFare = (trip.price * 0.2).toFixed(2);
    const serviceFee = (trip.price * 0.1).toFixed(2);
    const totalFare = trip.price.toFixed(2);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { backgroundColor: surfaceBg, paddingTop: insets.top + 16 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                            <X size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.text }]}>Your Receipt</Text>
                        <View style={{ width: 24 }} /> {/* Spacer */}
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* Status Icon */}
                        <View style={styles.statusWrap}>
                            <View style={[styles.statusIconWrap, { backgroundColor: '#10B98120' }]}>
                                <CheckCircle2 size={48} color="#10B981" />
                            </View>
                            <Text style={[styles.statusTitle, { color: theme.text }]}>Trip Completed</Text>
                            <Text style={[styles.statusDate, { color: theme.textSecondary }]}>
                                {trip.createdAt ? new Date(trip.createdAt as any).toLocaleDateString('en-US', {
                                    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                }) : ''}
                            </Text>
                        </View>

                        {/* Driver & Rating */}
                        {trip.driver && (
                            <View style={[styles.driverCard, { backgroundColor: inputBg }]}>
                                <Image source={{ uri: trip.driver.photoURL }} style={styles.driverAvatar} contentFit="cover" />
                                <View style={styles.driverInfo}>
                                    <Text style={[styles.driverName, { color: theme.text }]}>How was your ride with {trip.driver.fullName}?</Text>
                                    <View style={styles.ratingRow}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                                                <Star
                                                    size={32}
                                                    color={star <= rating ? '#F59E0B' : (isDark ? '#48484A' : '#D1D5DB')}
                                                    fill={star <= rating ? '#F59E0B' : 'transparent'}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Total & Breakdown */}
                        <View style={[styles.fareCard, { backgroundColor: inputBg }]}>
                            <View style={styles.totalRow}>
                                <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
                                <Text style={[styles.totalAmount, { color: theme.text }]}>{totalFare} MAD</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />
                            <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Base Fare</Text>
                                <Text style={[styles.breakdownValue, { color: theme.text }]}>{baseFare} MAD</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Distance</Text>
                                <Text style={[styles.breakdownValue, { color: theme.text }]}>{distanceFare} MAD</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>Service Fee</Text>
                                <Text style={[styles.breakdownValue, { color: theme.text }]}>{serviceFee} MAD</Text>
                            </View>
                        </View>

                        {/* Route Summary */}
                        <View style={styles.routeContainer}>
                            <View style={styles.routePoint}>
                                <View style={[styles.routeDot, { backgroundColor: theme.primary }]} />
                                <View style={styles.routeTextWrap}>
                                    <Text style={[styles.routeTime, { color: theme.textSecondary }]}>Pickup</Text>
                                    <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={2}>
                                        {trip.startPoint.address || 'Pickup Location'}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.routeConnector, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />
                            <View style={styles.routePoint}>
                                <View style={[styles.routeSquare, { borderColor: '#10B981' }]} />
                                <View style={styles.routeTextWrap}>
                                    <Text style={[styles.routeTime, { color: theme.textSecondary }]}>Drop-off</Text>
                                    <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={2}>
                                        {trip.endPoint.address || 'Destination Location'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: inputBg }]} activeOpacity={0.7} onPress={onDownloadReceipt}>
                                <Download size={20} color={theme.text} />
                                <Text style={[styles.actionBtnText, { color: theme.text }]}>Download PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: inputBg }]} activeOpacity={0.7}>
                                <Shield size={20} color={theme.text} />
                                <Text style={[styles.actionBtnText, { color: theme.text }]}>Report Issue</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: theme.primary }]} onPress={onClose} activeOpacity={0.8}>
                            <Text style={styles.doneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    statusWrap: {
        alignItems: 'center',
        marginBottom: 32,
    },
    statusIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
    },
    statusDate: {
        fontSize: 15,
    },
    driverCard: {
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    driverAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 16,
    },
    driverInfo: {
        alignItems: 'center',
    },
    driverName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 8,
    },
    fareCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '600',
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 16,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    breakdownLabel: {
        fontSize: 15,
    },
    breakdownValue: {
        fontSize: 15,
        fontWeight: '500',
    },
    routeContainer: {
        marginBottom: 32,
    },
    routePoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    routeDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 6,
    },
    routeSquare: {
        width: 12,
        height: 12,
        borderWidth: 3,
        borderRadius: 3,
        marginTop: 6,
    },
    routeConnector: {
        width: 2,
        height: 30,
        marginLeft: 5,
        marginVertical: 4,
    },
    routeTextWrap: {
        flex: 1,
    },
    routeTime: {
        fontSize: 13,
        marginBottom: 2,
    },
    routeText: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        borderRadius: 16,
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(150,150,150,0.1)',
    },
    doneBtn: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },
});
