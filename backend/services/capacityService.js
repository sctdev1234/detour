class CapacityService {
  /**
   * Initializes segment capacity array for a trip with N waypoints.
   * Total segments = N - 1.
   * @param {Array} waypoints - Waypoint objects array
   * @param {number} totalSeats - Vehicle seat capacity
   * @returns {Array} segmentCapacity array
   */
  initializeSegments(waypoints = [], totalSeats = 4) {
    if (!waypoints || waypoints.length < 2) {
      // Default single origin-destination segment
      return [{
        segmentIndex: 0,
        fromWaypointIndex: 0,
        toWaypointIndex: 1,
        seatsTotal: totalSeats,
        seatsOccupied: 0
      }];
    }

    const segments = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      segments.push({
        segmentIndex: i,
        fromWaypointIndex: i,
        toWaypointIndex: i + 1,
        seatsTotal: totalSeats,
        seatsOccupied: 0
      });
    }
    return segments;
  }

  /**
   * Validates if all requested segments have enough available seats.
   * @param {Array} segmentCapacity - Current trip segment capacity array
   * @param {number} fromIndex - Pickup waypoint index
   * @param {number} toIndex - Dropoff waypoint index
   * @param {number} seatsRequested - Number of seats to book
   * @returns {{ hasCapacity: boolean, bottleneckSegment?: number, availableSeats?: number }}
   */
  checkCapacity(segmentCapacity = [], fromIndex, toIndex, seatsRequested = 1) {
    if (fromIndex >= toIndex) {
      return { hasCapacity: false, reason: 'Invalid waypoint indices (pickup >= dropoff)' };
    }

    // Filter all segments falling within [fromIndex, toIndex - 1]
    const relevantSegments = segmentCapacity.filter(
      seg => seg.fromWaypointIndex >= fromIndex && seg.toWaypointIndex <= toIndex
    );

    if (relevantSegments.length === 0) {
      // Fallback for default unsegmented trips
      const defaultSeg = segmentCapacity[0];
      if (defaultSeg && (defaultSeg.seatsOccupied + seatsRequested > defaultSeg.seatsTotal)) {
        return {
          hasCapacity: false,
          bottleneckSegment: 0,
          availableSeats: Math.max(0, defaultSeg.seatsTotal - defaultSeg.seatsOccupied)
        };
      }
      return { hasCapacity: true };
    }

    for (const seg of relevantSegments) {
      const remaining = seg.seatsTotal - seg.seatsOccupied;
      if (remaining < seatsRequested) {
        return {
          hasCapacity: false,
          bottleneckSegment: seg.segmentIndex,
          availableSeats: Math.max(0, remaining)
        };
      }
    }

    return { hasCapacity: true };
  }

  /**
   * Increment seatsOccupied for all segments in the journey interval.
   * Modifies the tripInstance in place.
   */
  reserveSeats(tripInstance, fromIndex, toIndex, seatsRequested = 1) {
    const { hasCapacity, bottleneckSegment } = this.checkCapacity(
      tripInstance.segmentCapacity,
      fromIndex,
      toIndex,
      seatsRequested
    );

    if (!hasCapacity) {
      throw new Error(`Insufficient seat capacity on route segment ${bottleneckSegment}`);
    }

    if (!tripInstance.segmentCapacity || tripInstance.segmentCapacity.length === 0) {
      tripInstance.reservedSeats = (tripInstance.reservedSeats || 0) + seatsRequested;
      return;
    }

    for (const seg of tripInstance.segmentCapacity) {
      if (seg.fromWaypointIndex >= fromIndex && seg.toWaypointIndex <= toIndex) {
        seg.seatsOccupied += seatsRequested;
      }
    }
  }

  /**
   * Decrement seatsOccupied for all segments in the journey interval.
   */
  releaseSeats(tripInstance, fromIndex, toIndex, seatsToRelease = 1) {
    if (!tripInstance.segmentCapacity || tripInstance.segmentCapacity.length === 0) {
      tripInstance.reservedSeats = Math.max(0, (tripInstance.reservedSeats || 0) - seatsToRelease);
      return;
    }

    for (const seg of tripInstance.segmentCapacity) {
      if (seg.fromWaypointIndex >= fromIndex && seg.toWaypointIndex <= toIndex) {
        seg.seatsOccupied = Math.max(0, seg.seatsOccupied - seatsToRelease);
      }
    }
  }
}

module.exports = new CapacityService();
