import { Car } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChipDesign, ChipTypography, AnimationDurations } from '../../constants/design';
import { LatLng, ClientTrip } from '../../types';

interface Props {
  coordinate: LatLng;
  trip: ClientTrip;
  isSelected: boolean;
  onPress: (trip: ClientTrip) => void;
  theme: any;
  zIndex?: number;
}

/**
 * Premium floating annotation chip for route annotation.
 *
 * Unselected (compact):
 *   6 min
 *   48 MAD
 *
 * Selected (expanded):
 *   ECONOMY
 *   6 min • 1.8 km
 *   48 MAD
 *
 * Optimised: React.memo, tracksViewChanges managed via ref.
 */
const RouteAnnotationChip = React.memo(({ coordinate, trip, isSelected, onPress, theme, zIndex = 60 }: Props) => {
  const isDark = theme.text === '#FFFFFF';

  // Animation
  const scale = useSharedValue(isSelected ? 1.0 : 0.9);
  React.useEffect(() => {
    scale.value = withTiming(isSelected ? 1.0 : 0.9, { duration: AnimationDurations.chipScale });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Disable tracksViewChanges after initial render for performance
  const tracksRef = React.useRef(true);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      tracksRef.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Re-enable tracking when selection changes
  React.useEffect(() => {
    tracksRef.current = true;
    const timer = setTimeout(() => {
      tracksRef.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [isSelected]);

  // Data
  const etaText = trip.estimatedDurationMin
    ? `${Math.round(trip.estimatedDurationMin)} min`
    : '—';
  const distanceText = trip.distanceKm
    ? `${trip.distanceKm.toFixed(1)} km`
    : null;
  const priceText = trip.price > 0 ? `${trip.price} MAD` : null;

  // Colors
  const bgColor = isDark ? '#1c1c1e' : '#FFFFFF';
  const etaColor = isSelected ? (isDark ? '#FFFFFF' : '#1C1C1E') : (isDark ? '#E0E0E0' : '#3C3C3E');
  const secondaryColor = isDark ? '#A0A0A0' : '#8E8E93';
  const priceColor = theme.primary;

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={() => onPress(trip)}
      tracksViewChanges={tracksRef.current}
      zIndex={zIndex}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View
        style={[
          styles.wrapper,
          animatedStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Route: ${etaText}${priceText ? `, ${priceText}` : ''}`}
      >
        <View
          style={[
            styles.chip,
            {
              backgroundColor: bgColor,
              borderColor: isSelected
                ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
              paddingHorizontal: isSelected ? ChipDesign.selectedPaddingHorizontal : ChipDesign.paddingHorizontal,
              paddingVertical: isSelected ? ChipDesign.selectedPaddingVertical : ChipDesign.paddingVertical,
              minWidth: isSelected ? ChipDesign.selectedMinWidth : ChipDesign.minWidth,
            },
            isSelected ? ChipDesign.selectedShadow : ChipDesign.shadow,
          ]}
        >
          {/* Selected: Service type label */}
          {isSelected && (
            <Text
              style={[
                ChipTypography.serviceType,
                { color: secondaryColor, marginBottom: 3 },
              ]}
              numberOfLines={1}
            >
              ECONOMY
            </Text>
          )}

          {/* ETA row */}
          {isSelected ? (
            <View style={styles.etaRow}>
              <Car size={14} color={etaColor} style={styles.etaIcon} />
              <Text
                style={[ChipTypography.etaLarge, { color: etaColor }]}
                numberOfLines={1}
              >
                {etaText}
              </Text>
              {distanceText && (
                <>
                  <Text style={[styles.dot, { color: secondaryColor }]}>•</Text>
                  <Text
                    style={[ChipTypography.distance, { color: secondaryColor }]}
                    numberOfLines={1}
                  >
                    {distanceText}
                  </Text>
                </>
              )}
            </View>
          ) : (
            <Text
              style={[ChipTypography.etaSmall, { color: etaColor }]}
              numberOfLines={1}
            >
              {etaText}
            </Text>
          )}

          {/* Price */}
          {priceText && (
            <Text
              style={[
                isSelected ? ChipTypography.price : ChipTypography.distance,
                {
                  color: priceColor,
                  marginTop: isSelected ? 3 : 2,
                  fontWeight: isSelected ? '700' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {priceText}
            </Text>
          )}
        </View>
      </Animated.View>
    </Marker>
  );
}, (prev, next) => (
  prev.trip.id === next.trip.id &&
  prev.isSelected === next.isSelected &&
  prev.coordinate.latitude === next.coordinate.latitude &&
  prev.coordinate.longitude === next.coordinate.longitude &&
  prev.theme === next.theme
));

RouteAnnotationChip.displayName = 'RouteAnnotationChip';

export default RouteAnnotationChip;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  chip: {
    borderRadius: ChipDesign.borderRadius,
    borderWidth: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaIcon: {
    marginRight: 5,
  },
  dot: {
    fontSize: 10,
    fontWeight: '800',
    marginHorizontal: 5,
  },
});
