import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../../constants/theme';

interface Offer {
    _id: string;
    driverId: string; // Ideally an object populated with name/rating
    price: number;
    estimatedArrival: number;
}

interface Props {
    offers: Offer[];
    onAcceptOffer: (offerId: string) => void;
    onCancel: () => void;
}

export default function OffersView({ offers, onAcceptOffer, onCancel }: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Offers Received ({offers.length})</Text>
            
            <ScrollView style={styles.offersList} showsVerticalScrollIndicator={false}>
                {offers.map(offer => (
                    <TouchableOpacity 
                        key={offer._id} 
                        style={styles.offerCard}
                        onPress={() => onAcceptOffer(offer._id)}
                    >
                        <View style={styles.offerHeader}>
                            <Text style={styles.driverText}>Driver ID: {offer.driverId.slice(-4)}</Text>
                            <Text style={styles.priceText}>MAD {offer.price}</Text>
                        </View>
                        <View style={styles.offerDetails}>
                            <Text style={styles.detailText}>ETA: {Math.round(offer.estimatedArrival / 60)} mins</Text>
                        </View>
                        <View style={styles.acceptAction}>
                            <Text style={styles.acceptText}>Tap to Accept</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel Trip</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        width: '100%',
        flex: 1,
        maxHeight: 400
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333'
    },
    offersList: {
        width: '100%',
        marginBottom: 16
    },
    offerCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.light.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    offerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    driverText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333'
    },
    priceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.light.primary
    },
    offerDetails: {
        marginBottom: 12
    },
    detailText: {
        fontSize: 14,
        color: '#666'
    },
    acceptAction: {
        backgroundColor: '#e6f7ff',
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: 'center'
    },
    acceptText: {
        color: Colors.light.primary,
        fontWeight: '600'
    },
    cancelButton: {
        backgroundColor: '#ff4444',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 'auto'
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
