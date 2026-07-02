import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useDispatchFlow } from '../../../hooks/useDispatchFlow';

// Import stateless views
import SearchingView from './SearchingView';
import OffersView from './OffersView';
import AssignedView from './AssignedView';
import ArrivalView from './ArrivalView';
import RideView from './RideView';
import CompletedView from './CompletedView';

interface Props {
    onClose: () => void;
}

export default function TripExperience({ onClose }: Props) {
    const { 
        status, 
        offers, 
        assignment, 
        error, 
        acceptOffer, 
        cancelSearch 
    } = useDispatchFlow();

    const handleCancel = () => {
        cancelSearch();
        onClose();
    };

    const renderContent = () => {
        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Error: {error}</Text>
                    <TouchableOpacity style={styles.button} onPress={handleCancel}>
                        <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        switch (status) {
            case 'SEARCHING':
                return <SearchingView onCancel={handleCancel} />;
            case 'OFFERS_RECEIVED':
                return (
                    <OffersView 
                        offers={offers} 
                        onAcceptOffer={acceptOffer} 
                        onCancel={handleCancel} 
                    />
                );
            case 'ASSIGNED':
                // Note: For further lifecycle states (Arrival, Ride, Completed),
                // we would normally check tripInstance.status here.
                // For now, ASSIGNED will just show AssignedView.
                return (
                    <AssignedView 
                        driverId={assignment?.driverId || 'Unknown'} 
                        onCancel={handleCancel} 
                    />
                );
            case 'IDLE':
                return null;
            default:
                // Fallback for unexpected states or DRAFT
                return <SearchingView onCancel={handleCancel} />;
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
        backgroundColor: 'transparent',
    },
    errorContainer: {
        padding: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center'
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        marginBottom: 20,
        textAlign: 'center'
    },
    button: {
        backgroundColor: '#ccc',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center'
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
