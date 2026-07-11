import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useDriverDispatchFlow } from '../../../hooks/useDriverDispatchFlow';
import { useDriverDashboardStats } from '../../../hooks/useDriverDashboardStats';

// Import stateless lifecycle views
import OfflineView from './OfflineView';
import OnlineIdleView from './OnlineIdleView';
import IncomingOfferView from './IncomingOfferView';
import EnRouteView from './EnRouteView';
import ArrivedView from './ArrivedView';
import TripActiveView from './TripActiveView';
import TripCompletedView from './TripCompletedView';

/**
 * DriverTripExperience — Lifecycle Controller
 * 
 * Renders the correct stateless view based on the current driver dispatch status.
 * All state is consumed from useDriverDispatchFlow (thin hook).
 * All business logic is delegated to driverDispatchActions (action module).
 * 
 * Architecture:
 * Presentation → DriverTripExperience → Lifecycle View → Store → Actions → Services → API/Socket
 */
export default function DriverTripExperience() {
    const {
        status,
        currentOffer,
        activeTrip,
        tripSummary,
        error,
        goOnline,
        goOffline,
        takeBreak,
        acceptOffer,
        rejectOffer,
        counterOffer,
        updateTripStatus,
        dismissSummary
    } = useDriverDispatchFlow();

    const stats = useDriverDashboardStats();

    const renderContent = () => {
        // Error overlay
        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Error: {error}</Text>
                    <TouchableOpacity style={styles.dismissBtn} onPress={goOnline}>
                        <Text style={styles.dismissText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        switch (status) {
            case 'OFFLINE':
                return <OfflineView onGoOnline={goOnline} stats={stats} />;

            case 'ONLINE':
                return (
                    <OnlineIdleView
                        onGoOffline={goOffline}
                        onTakeBreak={takeBreak}
                        stats={stats}
                    />
                );

            case 'BREAK':
                return <OfflineView onGoOnline={goOnline} />;

            case 'OFFER_INCOMING':
                if (!currentOffer) return <OnlineIdleView onGoOffline={goOffline} onTakeBreak={takeBreak} />;
                return (
                    <IncomingOfferView
                        offer={currentOffer}
                        onAccept={acceptOffer}
                        onReject={rejectOffer}
                        onCounter={counterOffer}
                    />
                );

            case 'EN_ROUTE':
                return (
                    <EnRouteView
                        trip={activeTrip}
                        onArrived={() => {
                            const tripId = activeTrip?.tripInstanceId?._id || activeTrip?.tripInstanceId;
                            if (tripId) updateTripStatus(tripId, 'ARRIVED');
                        }}
                    />
                );

            case 'ARRIVED':
                return (
                    <ArrivedView
                        trip={activeTrip}
                        onStartTrip={() => {
                            const tripId = activeTrip?.tripInstanceId?._id || activeTrip?.tripInstanceId;
                            if (tripId) updateTripStatus(tripId, 'STARTED');
                        }}
                    />
                );

            case 'TRIP_ACTIVE':
                return (
                    <TripActiveView
                        trip={activeTrip}
                        onComplete={() => {
                            const tripId = activeTrip?.tripInstanceId?._id || activeTrip?.tripInstanceId;
                            if (tripId) updateTripStatus(tripId, 'COMPLETED');
                        }}
                    />
                );

            case 'TRIP_COMPLETED':
                return (
                    <TripCompletedView
                        summary={tripSummary}
                        onDone={dismissSummary}
                    />
                );

            case 'ERROR':
                return (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error || 'Something went wrong'}</Text>
                        <TouchableOpacity style={styles.dismissBtn} onPress={goOnline}>
                            <Text style={styles.dismissText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                );

            default:
                return <OfflineView onGoOnline={goOnline} />;
        }
    };

    return (
        <View style={styles.container}>
            {renderContent()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    errorContainer: {
        padding: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        marginHorizontal: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        marginBottom: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    dismissBtn: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
    },
    dismissText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    }
});
