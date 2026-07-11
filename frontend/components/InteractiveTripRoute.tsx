import React, { useMemo } from 'react';
import { Polyline } from 'react-native-maps';
import { ClientTrip } from '../types';
import { LatLng } from '../types';
import { decodePolyline } from '../utils/location';
import { calculateDistance } from '../utils/location';
import RouteEndpointMarker from './map/RouteEndpointMarker';
import RouteAnnotationChip from './map/RouteAnnotationChip';
import {
  RouteColors,
  RouteDimensions,
  AnnotationExclusionZones,
} from '../constants/design';

interface Props {
  trip: ClientTrip;
  isSelected: boolean;
  onPress: (trip: ClientTrip) => void;
  onAnnotationPress: (trip: ClientTrip) => void;
  theme: any;
  otherAnchors: LatLng[];
}

/**
 * Calculates the best annotation anchor along a route polyline.
 *
 * Strategy:
 *   1. Generate candidate points at 10%, 20%, …, 90% along the polyline.
 *   2. Reject candidates that fall in screen exclusion zones (top/bottom).
 *   3. Score remaining candidates by distance from other annotations +
 *      distance from route endpoints.
 *   4. Choose the candidate with the highest readability score.
 *
 * Falls back to geometric midpoint if all candidates are rejected.
 */
function computeAnnotationAnchor(
  routeCoords: LatLng[],
  otherAnchors: LatLng[],
  startPoint: LatLng | undefined,
  endPoint: LatLng | undefined,
): LatLng {
  if (!routeCoords.length) return { latitude: 0, longitude: 0 };
  if (routeCoords.length === 1) return routeCoords[0];
  if (routeCoords.length === 2) {
    return {
      latitude: (routeCoords[0].latitude + routeCoords[1].latitude) / 2,
      longitude: (routeCoords[0].longitude + routeCoords[1].longitude) / 2,
    };
  }

  // Compute bounding box
  let minLat = Infinity, maxLat = -Infinity;
  for (const c of routeCoords) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
  }
  const latSpan = maxLat - minLat;
  const topThreshold = maxLat - latSpan * AnnotationExclusionZones.topFraction;
  const bottomThreshold = minLat + latSpan * AnnotationExclusionZones.bottomFraction;

  // Generate candidates at 15%, 25%, 35%, 45%, 55%, 65%, 75%, 85%
  const fractions = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85];
  const candidates: { point: LatLng; score: number }[] = [];

  for (const f of fractions) {
    const idx = Math.min(Math.floor(routeCoords.length * f), routeCoords.length - 1);
    const candidate = routeCoords[idx];
    if (!candidate) continue;

    // Skip candidates in exclusion zones (too near top/bottom of route bounding box)
    if (candidate.latitude > topThreshold || candidate.latitude < bottomThreshold) continue;

    // Score: higher is better
    let score = 0;

    // Distance from other annotations — maximise separation
    if (otherAnchors.length > 0) {
      let minDist = Infinity;
      for (const other of otherAnchors) {
        const d = calculateDistance(candidate, other);
        if (d < minDist) minDist = d;
      }
      score += minDist * 10;
    } else {
      score += 10; // No competition
    }

    // Bonus for being away from route endpoints
    if (startPoint?.latitude) {
      score += Math.min(calculateDistance(candidate, startPoint), 2) * 3;
    }
    if (endPoint?.latitude) {
      score += Math.min(calculateDistance(candidate, endPoint), 2) * 3;
    }

    // Slight preference for middle of route
    const centerPenalty = Math.abs(f - 0.5);
    score -= centerPenalty * 2;

    candidates.push({ point: candidate, score });
  }

  // Pick the best candidate
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].point;
  }

  // Fallback: midpoint
  const midIdx = Math.floor(routeCoords.length / 2);
  return routeCoords[midIdx];
}

/**
 * InteractiveTripRoute — renders a single trip route on the map.
 *
 * Selected:
 *   - White casing polyline underneath
 *   - Primary blue inner stroke (rounded caps/joins)
 *   - Shadow polyline for depth
 *   - Pickup + Destination markers visible
 *   - Expanded annotation chip
 *
 * Inactive:
 *   - Thin gray-blue stroke at 28% opacity
 *   - No shadow, no casing
 *   - No endpoint markers (reduce clutter)
 *   - Compact annotation chip
 *
 * Never renders straight lines: if no route geometry exists, the route is hidden.
 */
const InteractiveTripRoute = React.memo(({ trip, isSelected, onPress, onAnnotationPress, theme, otherAnchors }: Props) => {
  const isDark = theme.text === '#FFFFFF';

  // Decode route geometry — never fall back to straight lines
  const routeCoords = useMemo(() => {
    if (trip.routeGeometry) {
      return decodePolyline(trip.routeGeometry);
    }
    // No geometry available — return empty to hide the route
    // A fake straight line destroys trust
    return [];
  }, [trip.routeGeometry]);

  // Compute annotation anchor using readability-scoring algorithm
  const anchorPoint = useMemo(() => {
    return computeAnnotationAnchor(routeCoords, otherAnchors, trip.startPoint, trip.endPoint);
  }, [routeCoords, otherAnchors, trip.startPoint, trip.endPoint]);

  // Nothing to render if no real geometry
  if (routeCoords.length < 2) return null;

  // Visual hierarchy values
  const inactiveColor = isDark ? RouteColors.inactiveDark : RouteColors.inactiveLight;
  const zBase = isSelected ? 100 : 10;

  return (
    <React.Fragment>
      {/* ─── Shadow polyline (selected only) ─── */}
      {isSelected && (
        <Polyline
          coordinates={routeCoords}
          strokeColor={RouteColors.activeShadow}
          strokeWidth={RouteDimensions.activeShadowWidth}
          lineCap="round"
          lineJoin="round"
          zIndex={zBase - 2}
        />
      )}

      {/* ─── White casing (selected only) ─── */}
      {isSelected && (
        <Polyline
          coordinates={routeCoords}
          strokeColor={RouteColors.activeCasing}
          strokeWidth={RouteDimensions.activeCasingWidth}
          lineCap="round"
          lineJoin="round"
          zIndex={zBase - 1}
        />
      )}

      {/* ─── Core route stroke ─── */}
      <Polyline
        coordinates={routeCoords}
        strokeColor={isSelected ? RouteColors.activePrimary : inactiveColor}
        strokeWidth={isSelected ? RouteDimensions.activeStrokeWidth : RouteDimensions.inactiveStrokeWidth}
        lineCap="round"
        lineJoin="round"
        tappable={true}
        onPress={() => onPress(trip)}
        zIndex={zBase}
      />

      {/* ─── Endpoint markers (selected only — reduces clutter) ─── */}
      {isSelected && trip.startPoint && trip.startPoint.latitude !== 0 && (
        <RouteEndpointMarker
          coordinate={trip.startPoint}
          type="pickup"
          zIndex={zBase + 5}
        />
      )}

      {isSelected && trip.endPoint && trip.endPoint.latitude !== 0 && (
        <RouteEndpointMarker
          coordinate={trip.endPoint}
          type="destination"
          zIndex={zBase + 5}
        />
      )}

      {/* ─── Annotation chip ─── */}
      {anchorPoint.latitude !== 0 && (
        <RouteAnnotationChip
          coordinate={anchorPoint}
          trip={trip}
          isSelected={isSelected}
          onPress={onAnnotationPress}
          theme={theme}
          zIndex={zBase + 10}
        />
      )}
    </React.Fragment>
  );
}, (prevProps, nextProps) => (
  prevProps.trip.id === nextProps.trip.id &&
  prevProps.isSelected === nextProps.isSelected &&
  prevProps.theme === nextProps.theme &&
  prevProps.otherAnchors === nextProps.otherAnchors
));

InteractiveTripRoute.displayName = 'InteractiveTripRoute';

export default InteractiveTripRoute;
