const TRIP_INSTANCE_STATES = [
    'DRAFT',
    'SEARCHING',
    'OFFERS_OPEN',
    'OFFER_ACCEPTED',
    'DRIVER_ASSIGNED',
    'PUBLISHED',
    'DRIVER_EN_ROUTE',
    'DRIVER_ARRIVED',
    'PASSENGER_BOARDED',
    'TRIP_STARTED',
    'WAYPOINT_REACHED',
    'DESTINATION_UPDATED',
    'TRIP_COMPLETED',
    'PAYMENT_PENDING',
    'PAYMENT_COMPLETED',
    'RATED',
    'ARCHIVED',
    'CANCELLED_BY_PASSENGER',
    'CANCELLED_BY_DRIVER',
    'CANCELLED_BY_SYSTEM'
];

const VALID_TRANSITIONS = {
    'DRAFT': ['SEARCHING', 'PUBLISHED', 'CANCELLED_BY_PASSENGER'],
    'SEARCHING': ['OFFERS_OPEN', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_SYSTEM'],
    'OFFERS_OPEN': ['OFFER_ACCEPTED', 'SEARCHING', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_SYSTEM'],
    'OFFER_ACCEPTED': ['DRIVER_ASSIGNED', 'SEARCHING', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_SYSTEM'],
    'DRIVER_ASSIGNED': ['DRIVER_EN_ROUTE', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'],
    'PUBLISHED': ['DRIVER_ASSIGNED', 'CANCELLED_BY_DRIVER'],
    
    // Execution Lifecycle (Linked to Trip)
    'DRIVER_EN_ROUTE': ['DRIVER_ARRIVED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'],
    'DRIVER_ARRIVED': ['PASSENGER_BOARDED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'],
    'PASSENGER_BOARDED': ['TRIP_STARTED'],
    'TRIP_STARTED': ['WAYPOINT_REACHED', 'DESTINATION_UPDATED', 'TRIP_COMPLETED'],
    'WAYPOINT_REACHED': ['TRIP_STARTED', 'TRIP_COMPLETED'],
    'DESTINATION_UPDATED': ['TRIP_STARTED', 'TRIP_COMPLETED'],
    
    // Termination
    'TRIP_COMPLETED': ['PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'RATED', 'ARCHIVED'],
    'PAYMENT_PENDING': ['PAYMENT_COMPLETED'],
    'PAYMENT_COMPLETED': ['RATED', 'ARCHIVED'],
    'RATED': ['ARCHIVED'],
    
    // Terminal States (No valid outgoing transitions)
    'ARCHIVED': [],
    'CANCELLED_BY_PASSENGER': [],
    'CANCELLED_BY_DRIVER': [],
    'CANCELLED_BY_SYSTEM': []
};

class StateMachineError extends Error {
    constructor(currentState, targetState) {
        super(`Invalid transition from ${currentState} to ${targetState}`);
        this.name = 'StateMachineError';
        this.currentState = currentState;
        this.targetState = targetState;
    }
}

const validateTransition = (currentState, targetState) => {
    if (!VALID_TRANSITIONS[currentState]) {
        throw new StateMachineError(currentState, targetState);
    }
    
    if (!VALID_TRANSITIONS[currentState].includes(targetState)) {
        throw new StateMachineError(currentState, targetState);
    }
    
    return true;
};

// Utility to enforce state changes safely on mongoose documents
const transitionState = async (tripInstance, targetState, reason = null) => {
    validateTransition(tripInstance.status, targetState);
    
    tripInstance.status = targetState;
    
    if (reason) {
        tripInstance.cancellationReason = reason;
    }
    
    // Auto-update stateTimestamps based on target state
    const now = new Date();
    switch (targetState) {
        case 'DRAFT': tripInstance.stateTimestamps.draftedAt = now; break;
        case 'SEARCHING': tripInstance.stateTimestamps.searchingAt = now; break;
        case 'DRIVER_ASSIGNED': tripInstance.stateTimestamps.driverAssignedAt = now; break;
        case 'TRIP_COMPLETED': tripInstance.stateTimestamps.completedAt = now; break;
        case 'CANCELLED_BY_PASSENGER':
        case 'CANCELLED_BY_DRIVER':
        case 'CANCELLED_BY_SYSTEM':
            tripInstance.stateTimestamps.cancelledAt = now;
            break;
    }
    
    await tripInstance.save();
    return tripInstance;
};

module.exports = {
    TRIP_INSTANCE_STATES,
    VALID_TRANSITIONS,
    StateMachineError,
    validateTransition,
    transitionState
};
