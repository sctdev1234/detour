/**
 * ---------------------------------------------------------------------------------
 * CLASS: LegacyClientStateMachine
 * ---------------------------------------------------------------------------------
 * Purpose: Enforces valid status transitions for a Client within a V1 Route.
 * Owner Domain: Legacy Trip Domain
 * ---------------------------------------------------------------------------------
 */

class LegacyClientStateMachine {
    static STATES = {
        PENDING: 'PENDING',
        WAITING: 'WAITING',
        CONFIRMED: 'CONFIRMED',
        STARTING_SOON: 'STARTING_SOON',
        READY: 'READY',
        PICKUP_INCOMING: 'PICKUP_INCOMING',
        IN_CAR: 'IN_CAR',
        DROPPED_OFF: 'DROPPED_OFF',
        COMPLETED: 'COMPLETED',
        CANCELLED: 'CANCELLED',
        CANCELLED_AT_PICKUP: 'CANCELLED_AT_PICKUP',
        CANCELLED_AT_DROPOFF: 'CANCELLED_AT_DROPOFF',
        PICKUP_DISPUTED: 'PICKUP_DISPUTED',
        DROPOFF_DISPUTED: 'DROPOFF_DISPUTED'
    };

    static VALID_TRANSITIONS = {
        [this.STATES.PENDING]: [this.STATES.WAITING, this.STATES.CONFIRMED, this.STATES.CANCELLED],
        [this.STATES.WAITING]: [this.STATES.CONFIRMED, this.STATES.CANCELLED],
        [this.STATES.CONFIRMED]: [this.STATES.STARTING_SOON, this.STATES.CANCELLED],
        [this.STATES.STARTING_SOON]: [this.STATES.READY, this.STATES.CANCELLED],
        [this.STATES.READY]: [this.STATES.PICKUP_INCOMING, this.STATES.CANCELLED],
        [this.STATES.PICKUP_INCOMING]: [this.STATES.IN_CAR, this.STATES.CANCELLED, this.STATES.CANCELLED_AT_PICKUP, this.STATES.PICKUP_DISPUTED],
        [this.STATES.IN_CAR]: [this.STATES.DROPPED_OFF, this.STATES.CANCELLED_AT_DROPOFF, this.STATES.DROPOFF_DISPUTED],
        [this.STATES.DROPPED_OFF]: [this.STATES.COMPLETED],
        [this.STATES.COMPLETED]: [],
        [this.STATES.CANCELLED]: [],
        [this.STATES.CANCELLED_AT_PICKUP]: [],
        [this.STATES.CANCELLED_AT_DROPOFF]: [],
        [this.STATES.PICKUP_DISPUTED]: [this.STATES.IN_CAR, this.STATES.CANCELLED_AT_PICKUP], // Admin resolution
        [this.STATES.DROPOFF_DISPUTED]: [this.STATES.COMPLETED, this.STATES.CANCELLED_AT_DROPOFF] // Admin resolution
    };

    /**
     * @param {string} currentState 
     * @param {string} newState 
     * @throws {Error} if transition is invalid
     */
    static validateTransition(currentState, newState) {
        if (!currentState) currentState = this.STATES.PENDING;
        
        if (!this.STATES[newState]) {
            throw new Error(`Invalid legacy client target state: ${newState}`);
        }

        const allowed = this.VALID_TRANSITIONS[currentState];
        if (!allowed || !allowed.includes(newState)) {
            throw new Error(`Illegal legacy client transition from ${currentState} to ${newState}`);
        }
    }
}

module.exports = LegacyClientStateMachine;
