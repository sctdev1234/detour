import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Clock, Edit3, Navigation, Save, User, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import ReorderableStopsList, { StopItem } from '../components/ReorderableStopsList';
import TripMap from '../components/TripMap';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../store/useTripStore';

export default function ModalScreen() {
  const { type, id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuthStore();
  const { trips, startTrip, completeTrip, isLoading } = useTripStore();

  // Find the trip
  const trip = trips.find(t => t.id === id); // id from params is string
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [customStopOrder, setCustomStopOrder] = useState<StopItem[] | null>(null);

  // Build stops list from trip data
  const buildStopsList = useMemo(() => {
    if (!trip?.routeId) return [];

    const stops: StopItem[] = [];
    const driverRoute = trip.routeId;
    const clients = trip.clients || [];

    // Driver Start (fixed)
    if (driverRoute.startPoint?.latitude) {
      stops.push({
        id: 'driver_start',
        type: 'driver_start',
        latitude: driverRoute.startPoint.latitude,
        longitude: driverRoute.startPoint.longitude,
        address: driverRoute.startPoint.address,
        isFixed: true,
      });
    }

    // Client Pickups
    clients.forEach((client: any, idx: number) => {
      if (client.routeId?.startPoint?.latitude) {
        stops.push({
          id: `pickup_${idx}`,
          type: 'pickup',
          latitude: client.routeId.startPoint.latitude,
          longitude: client.routeId.startPoint.longitude,
          address: client.routeId.startPoint.address,
          clientName: client.userId?.fullName,
          clientIndex: idx,
        });
      }
    });

    // Driver Waypoints
    driverRoute.waypoints?.forEach((wp: any, idx: number) => {
      if (wp?.latitude) {
        stops.push({
          id: `waypoint_${idx}`,
          type: 'waypoint',
          latitude: wp.latitude,
          longitude: wp.longitude,
          address: wp.address,
        });
      }
    });

    // Client Dropoffs
    clients.forEach((client: any, idx: number) => {
      if (client.routeId?.endPoint?.latitude) {
        stops.push({
          id: `dropoff_${idx}`,
          type: 'dropoff',
          latitude: client.routeId.endPoint.latitude,
          longitude: client.routeId.endPoint.longitude,
          address: client.routeId.endPoint.address,
          clientName: client.userId?.fullName,
          clientIndex: idx,
        });
      }
    });

    // Driver End (fixed)
    if (driverRoute.endPoint?.latitude) {
      stops.push({
        id: 'driver_end',
        type: 'driver_end',
        latitude: driverRoute.endPoint.latitude,
        longitude: driverRoute.endPoint.longitude,
        address: driverRoute.endPoint.address,
        isFixed: true,
      });
    }

    return stops;
  }, [trip]);

  const currentStops = customStopOrder || buildStopsList;

  if (!trip) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Trip not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDriver = trip.driverId._id === user?.id; // Check ID match (ensure types match string vs ObjectId)
  // Actually trip.driverId._id is usually string in JSON, user.id is string.

  const handleStartTrip = async () => {
    setActionLoading(true);
    try {
      await startTrip(trip.id);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    setActionLoading(true);
    try {
      await completeTrip(trip.id);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Trip Details</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
          <X size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusBanner, {
          backgroundColor: trip.status === 'active' ? '#10b981' :
            trip.status === 'completed' ? '#3b82f6' :
              trip.status === 'cancelled' ? '#ef4444' : '#f59e0b'
        }]}>
          <Text style={styles.statusText}>{trip.status.toUpperCase()}</Text>
          {trip.status === 'active' && <Text style={styles.liveText}> • LIVE</Text>}
        </View>

        {/* Map with custom order */}
        <TripMap trip={trip} theme={theme} customStopOrder={customStopOrder} />

        {/* Route Order Editor (Driver only) */}
        {isDriver && currentStops.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.editRouteBtn, { backgroundColor: isEditingRoute ? theme.primary : theme.primary + '20' }]}
                onPress={() => {
                  if (isEditingRoute) {
                    // Save - just exit edit mode, order is already in state
                    setIsEditingRoute(false);
                  } else {
                    // Start editing - initialize custom order from current
                    if (!customStopOrder) {
                      setCustomStopOrder(buildStopsList);
                    }
                    setIsEditingRoute(true);
                  }
                }}
              >
                {isEditingRoute ? (
                  <>
                    <Save size={16} color="#fff" />
                    <Text style={styles.editRouteBtnText}>Save Order</Text>
                  </>
                ) : (
                  <>
                    <Edit3 size={16} color={theme.primary} />
                    <Text style={[styles.editRouteBtnText, { color: theme.primary }]}>Edit Route Order</Text>
                  </>
                )}
              </TouchableOpacity>
              {isEditingRoute && (
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: '#ef444420' }]}
                  onPress={() => {
                    setCustomStopOrder(null);
                    setIsEditingRoute(false);
                  }}
                >
                  <X size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>

            {isEditingRoute ? (
              <ReorderableStopsList
                stops={currentStops}
                onReorder={setCustomStopOrder}
                theme={theme}
                editable={true}
              />
            ) : (
              <View style={styles.routePoints}>
                <View style={styles.point}>
                  <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                  <Text style={[styles.addr, { color: theme.text }]}>{trip.routeId?.startPoint?.address}</Text>
                </View>
                {currentStops.filter(s => !s.isFixed).map((stop, idx) => (
                  <React.Fragment key={stop.id}>
                    <View style={[styles.line, { backgroundColor: theme.border }]} />
                    <View style={styles.point}>
                      <View style={[styles.dot, { backgroundColor: stop.type === 'pickup' ? '#6366f1' : stop.type === 'dropoff' ? '#8b5cf6' : theme.primary }]} />
                      <Text style={[styles.addr, { color: theme.text }]} numberOfLines={1}>
                        {stop.type === 'pickup' ? `⬆ ${stop.clientName || 'Pickup'}` :
                          stop.type === 'dropoff' ? `⬇ ${stop.clientName || 'Dropoff'}` :
                            stop.address?.split(',')[0] || 'Waypoint'}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
                <View style={[styles.line, { backgroundColor: theme.border }]} />
                <View style={styles.point}>
                  <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.addr, { color: theme.text }]}>{trip.routeId?.endPoint?.address}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Simple Route Info for non-drivers */}
        {!isDriver && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.row}>
              <Clock size={16} color={theme.icon} />
              <Text style={[styles.timeText, { color: theme.text }]}>
                {trip.routeId?.timeStart} - {trip.routeId?.timeArrival}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.routePoints}>
              <View style={styles.point}>
                <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.addr, { color: theme.text }]}>{trip.routeId?.startPoint?.address}</Text>
              </View>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
              <View style={styles.point}>
                <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                <Text style={[styles.addr, { color: theme.text }]}>{trip.routeId?.endPoint?.address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Driver */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Driver</Text>
        <View style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {trip.driverId?.photoURL ? (
            <Image source={{ uri: trip.driverId.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.border }]}>
              <User size={20} color={theme.icon} />
            </View>
          )}
          <View>
            <Text style={[styles.userName, { color: theme.text }]}>{trip.driverId?.fullName}</Text>
            <Text style={[styles.userRole, { color: theme.icon }]}>Driver</Text>
          </View>
        </View>

        {/* Clients */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Passengers ({trip.clients.length})</Text>
        {trip.clients.length === 0 ? (
          <Text style={{ color: theme.icon, fontStyle: 'italic' }}>No passengers yet.</Text>
        ) : (
          trip.clients.map((client: any, i: number) => (
            <View key={i} style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 8 }]}>
              {client.userId?.photoURL ? (
                <Image source={{ uri: client.userId.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.border }]}>
                  <User size={20} color={theme.icon} />
                </View>
              )}
              <View>
                <Text style={[styles.userName, { color: theme.text }]}>{client.userId?.fullName}</Text>
                <Text style={[styles.userRole, { color: theme.icon }]}>Passenger</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Actions for Driver */}
      {isDriver && (
        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          {trip.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
              onPress={handleStartTrip}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Navigation size={20} color="#fff" />
                  <Text style={styles.btnText}>Start Trip</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {trip.status === 'active' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
              onPress={handleCompleteTrip}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.btnText}>Complete Trip</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 20 },
  title: { fontSize: 20, fontWeight: '800' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, gap: 20 },
  statusBanner: { flexDirection: 'row', padding: 12, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statusText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  liveText: { color: '#fff', fontWeight: '800', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 2 },
  card: { padding: 16, borderRadius: 20, borderWidth: 1, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  routePoints: { gap: 0 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  addr: { fontSize: 14, fontWeight: '600' },
  line: { width: 2, height: 20, marginLeft: 4, marginVertical: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 16, fontWeight: '700' },
  userRole: { fontSize: 12 },
  footer: { padding: 20, paddingBottom: 40, borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0 },
  actionBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  editRouteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flex: 1 },
  editRouteBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  cancelBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});
