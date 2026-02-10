import React from 'react';
import { StyleSheet, View } from 'react-native';
import PlacesManager from '../../components/PlacesManager';

export default function DriverPlacesScreen() {
    return (
        <View style={styles.container}>
            <PlacesManager />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});
