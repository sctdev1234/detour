/**
 * ---------------------------------------------------------------------------------
 * CLASS: TripStateMachine
 * ---------------------------------------------------------------------------------
 * Purpose: Enforces valid status transitions for a TripInstance.
 * Owner Domain: Trip Domain
 * Transitions:
 *   DRAFT -> SEARCHING -> OFFERS_OPEN -> ASSIGNED -> EN_ROUTE -> 
 *   ARRIVED -> BOARDED -> STARTED -> COMPLETED
 *   * -> CANCELLED
 * ---------------------------------------------------------------------------------
 */

class TripStateMachine {
    static STATES = {
        DRAFT: 'DRAFT',
        SEARCHING: 'SEARCHING',
        OFFERS_OPEN: 'OFFERS_OPEN',
        ASSIGNED: 'ASSIGNED',
        EN_ROUTE: 'EN_ROUTE',
        ARRIVED: 'ARRIVED',
        BOARDED: 'BOARDED',
        STARTED: 'STARTED',
        COMPLETED: 'COMPLETED',
        CANCELLED: 'CANCELLED'
    };

    static VALID_TRANSITIONS = {
        [this.STATES.DRAFT]: [this.STATES.SEARCHING, this.STATES.CANCELLED],
        [this.STATES.SEARCHING]: [this.STATES.OFFERS_OPEN, this.STATES.CANCELLED],
        [this.STATES.OFFERS_OPEN]: [this.STATES.ASSIGNED, this.STATES.SEARCHING, this.STATES.CANCELLED], // Can revert to searching if offers expire
        [this.STATES.ASSIGNED]: [this.STATES.EN_ROUTE, this.STATES.CANCELLED],
        [this.STATES.EN_ROUTE]: [this.STATES.ARRIVED, this.STATES.CANCELLED],
        [this.STATES.ARRIVED]: [this.STATES.BOARDED, this.STATES.CANCELLED],
        [this.STATES.BOARDED]: [this.STATES.STARTED, this.STATES.CANCELLED],
        [this.STATES.STARTED]: [this.STATES.COMPLETED, this.STATES.CANCELLED],
        [this.STATES.COMPLETED]: [], // Terminal state
        [this.STATES.CANCELLED]: []  // Terminal state
    };

    /**
     * @param {string} currentState 
     * @param {string} newState 
     * @throws {Error} if transition is invalid
     */
    static validateTransition(currentState, newState) {
        if (!this.STATES[newState]) {
            throw new Error(`Invalid target state: ${newState}`);
        }

        const allowed = this.VALID_TRANSITIONS[currentState];
        if (!allowed || !allowed.includes(newState)) {
            throw new Error(`Illegal state transition from ${currentState} to ${newState}`);
        }
    }

    /**
     * Returns the appropriate timestamp field name for a given state
     * @param {string} state 
     * @returns {string} e.g. 'stateTimestamps.searchingAt'
     */
    static getTimestampField(state) {
        const mapping = {
            [this.STATES.DRAFT]: 'stateTimestamps.draftAt',
            [this.STATES.SEARCHING]: 'stateTimestamps.searchingAt',
            [this.STATES.OFFERS_OPEN]: 'stateTimestamps.offersOpenAt',
            [this.STATES.ASSIGNED]: 'stateTimestamps.assignedAt',
            [this.STATES.EN_ROUTE]: 'stateTimestamps.enRouteAt',
            [this.STATES.ARRIVED]: 'stateTimestamps.arrivedAt',
            [this.STATES.BOARDED]: 'stateTimestamps.boardedAt',
            [this.STATES.STARTED]: 'stateTimestamps.startedAt',
            [this.STATES.COMPLETED]: 'stateTimestamps.completedAt',
            [this.STATES.CANCELLED]: 'stateTimestamps.cancelledAt'
        };
        return mapping[state];
    }
}

module.exports = TripStateMachine;
