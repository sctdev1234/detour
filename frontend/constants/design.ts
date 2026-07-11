/**
 * Design tokens for the Home screen redesign.
 * Extends constants/theme.ts — does NOT replace it.
 *
 * Usage:  import { HomeDesign } from '@/constants/design';
 */

import { Platform } from 'react-native';

// ─── Route Colors ───────────────────────────────────────────────────

export const RouteColors = {
  /** Active / selected route core stroke */
  activePrimary: '#4A89F3',
  /** Casing underneath the active route for depth */
  activeCasing: '#FFFFFF',
  /** Shadow drawn beneath the active route polyline */
  activeShadow: 'rgba(0,0,0,0.10)',

  /** Inactive route stroke — light mode */
  inactiveLight: 'rgba(74, 137, 243, 0.28)',
  /** Inactive route stroke — dark mode */
  inactiveDark: 'rgba(99, 132, 255, 0.32)',
} as const;

// ─── Route Dimensions ───────────────────────────────────────────────

export const RouteDimensions = {
  activeStrokeWidth: 6,
  activeCasingWidth: 10,
  activeShadowWidth: 14,
  inactiveStrokeWidth: 3,
} as const;

// ─── Marker Colors ──────────────────────────────────────────────────

export const MarkerColors = {
  pickup: '#22C55E',
  destination: '#EF4444',
  markerBorder: '#FFFFFF',
  markerShadow: 'rgba(0,0,0,0.20)',
} as const;

// ─── Marker Dimensions ─────────────────────────────────────────────

export const MarkerDimensions = {
  /** Outer circle diameter (includes border) */
  size: 18,
  /** Border width around the circle */
  borderWidth: 3,
  /** Touch target must be at least 44×44 per accessibility */
  hitSlop: { top: 14, bottom: 14, left: 14, right: 14 },
} as const;

// ─── Annotation Chip ────────────────────────────────────────────────

export const ChipDesign = {
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 10,
  selectedPaddingHorizontal: 16,
  selectedPaddingVertical: 12,
  /** Minimum width so small values like "3 min" don't look cramped */
  minWidth: 64,
  selectedMinWidth: 130,

  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    android: {
      elevation: 5,
    },
    default: {
      elevation: 5,
    },
  }),

  selectedShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
    },
    android: {
      elevation: 10,
    },
    default: {
      elevation: 10,
    },
  }),
} as const;

// ─── Chip Typography ────────────────────────────────────────────────

export const ChipTypography = {
  etaLarge: { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.3 },
  etaSmall: { fontSize: 14, fontWeight: '700' as const, letterSpacing: -0.2 },
  distance: { fontSize: 12, fontWeight: '500' as const },
  price: { fontSize: 14, fontWeight: '700' as const },
  serviceType: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.3, textTransform: 'uppercase' as const },
} as const;

// ─── Animation Durations ────────────────────────────────────────────

export const AnimationDurations = {
  routeSelect: 200,
  chipScale: 200,
  chipFade: 150,
  cameraFit: 600,
  cameraPitch: 500,
  cameraPitchDelay: 350,
  cameraResetDelay: 150,
  fadeIn: 300,
  microPress: 100,
  markerPulse: 1800,
} as const;

// ─── Camera ─────────────────────────────────────────────────────────

export const CameraConfig = {
  /** Edge padding when fitting all routes */
  overviewPadding: { top: 140, right: 50, bottom: 200, left: 50 },
  /** Edge padding when fitting a selected route */
  selectedPadding: { top: 160, right: 60, bottom: 220, left: 60 },
  /** Viewing angle for selected route — subtle, not navigation-level */
  selectedPitch: 0,
  /** Viewing angle for overview */
  overviewPitch: 0,
} as const;

// ─── Search Bar ─────────────────────────────────────────────────────

export const SearchBarDesign = {
  height: 56,
  borderRadius: 28,
  avatarSize: 38,
  bellSize: 40,
  bellIconSize: 20,
  placeholderFontSize: 17,
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    default: {
      elevation: 8,
    },
  }),
} as const;

// ─── Floating Action Button ─────────────────────────────────────────

export const FabDesign = {
  height: 52,
  borderRadius: 26,
  paddingHorizontal: 28,
  fontSize: 16,
  fontWeight: '700' as const,
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.20,
      shadowRadius: 16,
    },
    android: {
      elevation: 10,
    },
    default: {
      elevation: 10,
    },
  }),
} as const;

// ─── Recenter Button ────────────────────────────────────────────────

export const RecenterDesign = {
  size: 48,
  borderRadius: 24,
  iconSize: 20,
  iconColor: '#4A89F3',
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
    default: {
      elevation: 6,
    },
  }),
} as const;

// ─── Gradient Overlays ──────────────────────────────────────────────

export const GradientConfig = {
  topColors: ['rgba(0,0,0,0.40)', 'rgba(0,0,0,0.12)', 'transparent'] as readonly string[],
  topLocations: [0, 0.5, 1] as readonly number[],
  topHeight: 140,
  bottomColors: ['transparent', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.30)'] as readonly string[],
  bottomLocations: [0, 0.5, 1] as readonly number[],
  bottomHeight: 200,
} as const;

// ─── Empty State ────────────────────────────────────────────────────

export const EmptyStateDesign = {
  cardBorderRadius: 24,
  cardPadding: 24,
  iconWrapperSize: 60,
  titleFontSize: 22,
  titleFontWeight: '800' as const,
  ctaHeight: 54,
  ctaBorderRadius: 18,
  ctaFontSize: 17,
  ctaFontWeight: '700' as const,
  chipBorderRadius: 20,
  chipPaddingH: 16,
  chipPaddingV: 12,
  chipFontSize: 15,
  chipFontWeight: '600' as const,
} as const;

// ─── Refined Map Styles ─────────────────────────────────────────────

export const refinedLightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f8f8f8' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#eef5ee' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#b0b0b0' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f0f0f0' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#c0c0c0' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dce9f5' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9eb8d5' }] },
];

export const refinedDarkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#606060' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#333333' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1d261d' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#666666' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#303030' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#363636' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#3e3e3e' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1520' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1a3050' }] },
];

// ─── Annotation Placement Exclusion Zones ───────────────────────────

/**
 * Screen-relative zones where annotation chips should not be placed.
 * Expressed as fractions of the viewport (0..1).
 * Used by the annotation placement algorithm to avoid overlapping UI.
 */
export const AnnotationExclusionZones = {
  /** Top exclusion: search bar + safe area */
  topFraction: 0.18,
  /** Bottom exclusion: FAB + safe area */
  bottomFraction: 0.22,
  /** Minimum distance between annotation anchors (km) */
  minSeparationKm: 0.15,
} as const;
