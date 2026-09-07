import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Car, Check, ChevronRight, Clock, MapPin, Navigation, Star, X } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Colors } from '../../../constants/theme';
import { Route } from '../../../types';
import { RouteService } from '../../../services/RouteService';

interface FindingDriversPanelProps {
    route: Route;
    offers: any[];
    tripInstanceId?: string;
    onAcceptOffer: (offerId: string) => void;
    onRejectOffer?: (offerId: string) => void;
    isAcceptingOffer?: boolean;
    onClose: () => void;
    onHoverOffer?: (offer: any | null) => void;
    selectedOfferId?: string | null;
}

export const FindingDriversPanel: React.FC<FindingDriversPanelProps> = ({
    route,
    offers,
    tripInstanceId,
    onAcceptOffer,
    onRejectOffer,
    isAcceptingOffer = false,
    onClose,
    onHoverOffer,
    selectedOfferId
}) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const [startAddr, setStartAddr] = React.useState(route.startPoint?.address || 'Pickup');
    const [endAddr, setEndAddr] = React.useState(route.endPoint?.address || 'Destination');

    React.useEffect(() => {
        let isMounted = true;
        const initialStart = route.startPoint?.address;
        const initialEnd = route.endPoint?.address;

        if (initialStart && initialStart !== 'Pickup' && initialStart !== 'Current Location') {
            setStartAddr(initialStart);
        } else if (route.startPoint?.latitude && route.startPoint?.longitude) {
            RouteService.reverseGeocode(route.startPoint.latitude, route.startPoint.longitude)
                .then(addr => {
                    if (isMounted && addr) setStartAddr(addr);
                })
                .catch(() => {});
        }

        if (initialEnd && initialEnd !== 'Destination') {
            setEndAddr(initialEnd);
        } else if (route.endPoint?.latitude && route.endPoint?.longitude) {
            RouteService.reverseGeocode(route.endPoint.latitude, route.endPoint.longitude)
                .then(addr => {
                    if (isMounted && addr) setEndAddr(addr);
                })
                .catch(() => {});
        }

        return () => { isMounted = false; };
    }, [route.id, route.startPoint?.latitude, route.startPoint?.longitude, route.startPoint?.address, route.endPoint?.latitude, route.endPoint?.longitude, route.endPoint?.address]);

    const cardBg = isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.97)';
    const offerCardBg = isDark ? '#2c2c2e' : '#f2f2f7';
    const textColor = isDark ? '#ffffff' : '#000000';
    const subtextColor = isDark ? '#8e8e93' : '#6b7280';

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleCol}>
                    <View style={styles.statusBadgeRow}>
                        <View style={styles.pulseDotWrapper}>
                            <View style={[styles.pulseDotGlow, { backgroundColor: theme.primary + '40' }]} />
                            <View style={[styles.pulseDot, { backgroundColor: theme.primary }]} />
                        </View>
                        <Text style={[styles.statusBadgeText, { color: theme.primary }]}>FINDING DRIVERS</Text>
                    </View>
                    <Text style={[styles.routeTitle, { color: textColor }]} numberOfLines={1}>
                        Route to {endAddr}
                    </Text>
                </View>

                <TouchableOpacity 
                    onPress={onClose} 
                    style={[styles.closeBtn, { backgroundColor: isDark ? '#3a3a3c' : '#e5e7eb' }]}
                    accessibilityLabel="Close finding drivers panel"
                    activeOpacity={0.7}
                >
                    <X size={18} color={textColor} />
                </TouchableOpacity>
            </View>

            {/* Contextual Corridor Summary Card */}
            <View style={[styles.corridorBar, { backgroundColor: isDark ? '#232326' : '#f8fafc' }]}>
                <View style={styles.corridorPoints}>
                    <View style={styles.pointRow}>
                        <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                        <Text style={[styles.pointText, { color: textColor }]} numberOfLines={1}>
                            {startAddr}
                        </Text>
                    </View>
                    <View style={styles.corridorDivider} />
                    <View style={styles.pointRow}>
                        <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                        <Text style={[styles.pointText, { color: textColor }]} numberOfLines={1}>
                            {endAddr}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Offers or Searching State */}
            {offers.length === 0 ? (
                <View style={styles.searchingBox}>
                    <View style={[styles.radarCircle, { borderColor: theme.primary + '30' }]}>
                        <View style={[styles.radarInner, { borderColor: theme.primary + '60' }]}>
                            <Car size={26} color={theme.primary} />
                        </View>
                    </View>
                    <Text style={[styles.searchingTitle, { color: textColor }]}>Looking for matching drivers</Text>
                    <Text style={[styles.searchingSubtitle, { color: subtextColor }]}>
                        Broadcasting to drivers whose routes pass near {startAddr}. Drivers will appear below as soon as they make an offer.
                    </Text>
                </View>
            ) : (
                <View style={styles.offersContainer}>
                    <View style={styles.offersHeaderRow}>
                        <Text style={[styles.offersCountText, { color: textColor }]}>
                            {offers.length} Driver {offers.length === 1 ? 'Offer' : 'Offers'}
                        </Text>
                        <Text style={[styles.offersHelpText, { color: subtextColor }]}>
                            Tap offer to view driver corridor on map
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.offersScroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 16 }}
                    >
                        {offers.map((offer, idx) => {
                            const offerId = offer._id || offer.id;
                            const driver = typeof offer.driverId === 'object' && offer.driverId !== null 
                                ? offer.driverId 
                                : (typeof offer.driver === 'object' && offer.driver !== null ? offer.driver : {});
                            const driverName = driver.fullName || (driver.firstName ? `${driver.firstName} ${driver.lastName || ''}`.trim() : (offer.driverName || `Driver ${String(offerId).slice(-4)}`));
                            const rating = driver.rating || offer.rating || '4.9';
                            
                            // Vehicle extraction
                            let vehicle = 'Verified Vehicle';
                            if (driver.vehicle) {
                                if (typeof driver.vehicle === 'object') {
                                    vehicle = `${driver.vehicle.color || ''} ${driver.vehicle.marque || ''} ${driver.vehicle.model || ''}`.trim() || 'Verified Vehicle';
                                } else {
                                    vehicle = String(driver.vehicle);
                                }
                            } else if (offer.vehicle) {
                                if (typeof offer.vehicle === 'object') {
                                    vehicle = `${offer.vehicle.color || ''} ${offer.vehicle.marque || ''} ${offer.vehicle.model || ''}`.trim() || 'Verified Vehicle';
                                } else {
                                    vehicle = String(offer.vehicle);
                                }
                            }

                            const photoURL = driver.photoURL || offer.photoURL;
                            const isCounter = offer.status === 'COUNTER_OFFERED' || offer.isCountered || Boolean(offer.counterPrice && offer.counterPrice !== offer.originalPrice);
                            const price = offer.counterPrice || offer.price || 0;
                            const originalPrice = offer.originalPrice || offer.metadata?.price;
                            const etaMin = offer.estimatedArrival ? Math.max(1, Math.round(offer.estimatedArrival / 60)) : 5;
                            const isSelected = selectedOfferId === offerId;

                            return (
                                <Animated.View
                                    key={offerId || `offer-${idx}`}
                                    entering={FadeInDown.delay(idx * 80).springify()}
                                    layout={Layout.springify()}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.offerCard,
                                            {
                                                backgroundColor: offerCardBg,
                                                borderColor: isSelected ? theme.primary : (isCounter ? '#f59e0b' : 'transparent'),
                                                borderWidth: isSelected || isCounter ? 1.5 : 0,
                                            }
                                        ]}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            onHoverOffer?.(offer);
                                        }}
                                    >
                                        {/* Counter-offer alert banner */}
                                        {isCounter && (
                                            <View style={styles.counterBanner}>
                                                <Text style={styles.counterBannerText}>Driver proposed new price</Text>
                                                {originalPrice && originalPrice !== price && (
                                                    <Text style={styles.counterBannerSub}>Original: {originalPrice} MAD</Text>
                                                )}
                                            </View>
                                        )}

                                        <View style={styles.offerMainRow}>
                                            {/* Driver Photo */}
                                            {photoURL ? (
                                                <Image source={{ uri: photoURL }} style={styles.avatar} contentFit="cover" />
                                            ) : (
                                                <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
                                                    <Text style={styles.avatarText}>{driverName.charAt(0).toUpperCase()}</Text>
                                                </View>
                                            )}

                                            {/* Driver Info */}
                                            <View style={styles.driverInfoCol}>
                                                <View style={styles.nameRow}>
                                                    <Text style={[styles.driverName, { color: textColor }]} numberOfLines={1}>
                                                        {driverName}
                                                    </Text>
                                                    <View style={styles.ratingBadge}>
                                                        <Star size={11} color="#F59E0B" fill="#F59E0B" />
                                                        <Text style={styles.ratingText}>{rating}</Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.vehicleText, { color: subtextColor }]} numberOfLines={1}>
                                                    {vehicle}
                                                </Text>
                                                <View style={styles.etaRow}>
                                                    <Clock size={12} color={theme.primary} />
                                                    <Text style={[styles.etaText, { color: theme.primary }]}>
                                                        {etaMin} min away
                                                    </Text>
                                                    <Text style={[styles.corridorTag, { color: subtextColor }]}>
                                                        • Corridors intersect
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Price & Action */}
                                            <View style={styles.actionCol}>
                                                {isCounter && originalPrice && originalPrice !== price && (
                                                    <Text style={[styles.originalPriceText, { color: subtextColor }]}>
                                                        {originalPrice} MAD
                                                    </Text>
                                                )}
                                                <Text style={[styles.priceText, { color: isCounter ? '#f59e0b' : textColor }]}>
                                                    {price} MAD
                                                </Text>
                                                <View style={styles.actionButtonsRow}>
                                                    {onRejectOffer && (
                                                        <TouchableOpacity
                                                            style={[styles.declineButton, { backgroundColor: isDark ? '#3a3a3c' : '#e5e7eb' }]}
                                                            onPress={() => onRejectOffer(offerId)}
                                                            activeOpacity={0.7}
                                                            accessibilityLabel="Decline offer"
                                                        >
                                                            <X size={14} color={isDark ? '#ef4444' : '#dc2626'} />
                                                        </TouchableOpacity>
                                                    )}
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.acceptButton,
                                                            { backgroundColor: isCounter ? '#f59e0b' : theme.primary },
                                                            isAcceptingOffer && { opacity: 0.7 }
                                                        ]}
                                                        disabled={isAcceptingOffer}
                                                        onPress={() => onAcceptOffer(offerId)}
                                                        activeOpacity={0.8}
                                                    >
                                                        {isAcceptingOffer ? (
                                                            <ActivityIndicator size="small" color="#ffffff" />
                                                        ) : (
                                                            <>
                                                                <Text style={styles.acceptButtonText}>{isCounter ? 'Accept Price' : 'Accept'}</Text>
                                                                <ChevronRight size={14} color="#ffffff" />
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerTitleCol: {
        flex: 1,
        marginRight: 12,
    },
    statusBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    pulseDotWrapper: {
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseDotGlow: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    routeTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    corridorBar: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        marginBottom: 14,
    },
    corridorPoints: {
        gap: 6,
    },
    pointRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    corridorDivider: {
        width: 1,
        height: 6,
        backgroundColor: '#cbd5e1',
        marginLeft: 3.5,
    },
    pointText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    searchingBox: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    radarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    radarInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchingTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center',
    },
    searchingSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    offersContainer: {
        flex: 1,
    },
    offersHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 10,
    },
    offersCountText: {
        fontSize: 15,
        fontWeight: '700',
    },
    offersHelpText: {
        fontSize: 11,
    },
    offersScroll: {
        flex: 1,
    },
    offerCard: {
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
    },
    offerMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarFallback: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    driverInfoCol: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    driverName: {
        fontSize: 14,
        fontWeight: '700',
        maxWidth: 130,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#F59E0B',
    },
    vehicleText: {
        fontSize: 12,
        marginTop: 1,
    },
    etaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    etaText: {
        fontSize: 11,
        fontWeight: '600',
    },
    corridorTag: {
        fontSize: 10,
    },
    actionCol: {
        alignItems: 'flex-end',
        gap: 6,
    },
    priceText: {
        fontSize: 16,
        fontWeight: '800',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    declineButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
        gap: 2,
    },
    acceptButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    counterBanner: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingVertical: 5,
        paddingHorizontal: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    counterBannerText: {
        color: '#d97706',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    counterBannerSub: {
        color: '#b45309',
        fontSize: 10,
        fontWeight: '600',
    },
    originalPriceText: {
        fontSize: 11,
        textDecorationLine: 'line-through',
        fontWeight: '600',
        textAlign: 'right',
    },
});
