/**
 * ---------------------------------------------------------------------------------
 * CLASS: LegacyRouteStateMachine
 * ---------------------------------------------------------------------------------
 * Purpose: Enforces valid status transitions for the V1 Route model.
 * Owner Domain: Legacy Trip Domain
 * ---------------------------------------------------------------------------------
 */

class LegacyRouteStateMachine {
    static STATES = {
        PENDING: 'PENDING',
        STARTED: 'STARTED',
        ARRIVED_PICKUP: 'ARRIVED_PICKUP',
        IN_PROGRESS: 'IN_PROGRESS',
        COMPLETED: 'COMPLETED',
        CANCELLED: 'CANCELLED'
    };

    static VALID_TRANSITIONS = {
        [this.STATES.PENDING]: [this.STATES.STARTED, this.STATES.CANCELLED],
        [this.STATES.STARTED]: [this.STATES.ARRIVED_PICKUP, this.STATES.CANCELLED, this.STATES.COMPLETED],
        [this.STATES.ARRIVED_PICKUP]: [this.STATES.IN_PROGRESS, this.STATES.CANCELLED],
        [this.STATES.IN_PROGRESS]: [this.STATES.COMPLETED, this.STATES.CANCELLED],
        [this.STATES.COMPLETED]: [], // Terminal
        [this.STATES.CANCELLED]: []  // Terminal
    };

    /**
     * @param {string} currentState 
     * @param {string} newState 
     * @throws {Error} if transition is invalid
     */
    static validateTransition(currentState, newState) {
        // Fallback for null/undefined states (e.g., initial state is usually PENDING)
        if (!currentState) currentState = this.STATES.PENDING;
        
        if (!this.STATES[newState]) {
            throw new Error(`Invalid legacy route target state: ${newState}`);
        }

        const allowed = this.VALID_TRANSITIONS[currentState];
        if (!allowed || !allowed.includes(newState)) {
            throw new Error(`Illegal legacy route transition from ${currentState} to ${newState}`);
        }
    }
}

module.exports = LegacyRouteStateMachine;
