import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { MarkerColors, MarkerDimensions } from '../../constants/design';
import { LatLng } from '../../types';

type EndpointType = 'pickup' | 'destination';

interface Props {
  coordinate: LatLng;
  type: EndpointType;
  zIndex?: number;
}

/**
 * Custom route endpoint marker — small circle with white border and shadow.
 * Replaces all default Google markers for route start/end.
 *
 * - Pickup: green (#22C55E)
 * - Destination: red (#EF4444)
 *
 * Optimised: tracksViewChanges=false, React.memo with shallow compare.
 */
const RouteEndpointMarker = React.memo(({ coordinate, type, zIndex = 50 }: Props) => {
  const fillColor = type === 'pickup' ? MarkerColors.pickup : MarkerColors.destination;

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      zIndex={zIndex}
      hitSlop={MarkerDimensions.hitSlop}
    >
      <View
        style={[
          styles.outer,
          { backgroundColor: fillColor },
        ]}
        accessibilityRole="image"
        accessibilityLabel={type === 'pickup' ? 'Pickup point' : 'Destination point'}
      />
    </Marker>
  );
}, (prev, next) => (
  prev.coordinate.latitude === next.coordinate.latitude &&
  prev.coordinate.longitude === next.coordinate.longitude &&
  prev.type === next.type
));

RouteEndpointMarker.displayName = 'RouteEndpointMarker';

export default RouteEndpointMarker;

const styles = StyleSheet.create({
  outer: {
    width: MarkerDimensions.size,
    height: MarkerDimensions.size,
    borderRadius: MarkerDimensions.size / 2,
    borderWidth: MarkerDimensions.borderWidth,
    borderColor: MarkerColors.markerBorder,
    shadowColor: MarkerColors.markerShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
});
