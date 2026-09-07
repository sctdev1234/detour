/**
 * ---------------------------------------------------------------------------------
 * CLASS: JourneyStateMachine
 * ---------------------------------------------------------------------------------
 * Purpose: Single canonical transition and state classification authority
 *          for PassengerJourney records.
 * Owner Domain: Trip / Journey Domain
 *
 * Rules:
 *   - Pure state transition validation and classification.
 *   - ZERO side effects (no database writes, no financial journals, no outbox events).
 * ---------------------------------------------------------------------------------
 */

class JourneyStateMachine {
    static STATES = Object.freeze({
        BOOKED: 'BOOKED',
        DRIVER_ARRIVED: 'DRIVER_ARRIVED',
        BOARDED: 'BOARDED',
        DROPPED_OFF: 'DROPPED_OFF',
        COMPLETED: 'COMPLETED',
        CANCELLED_BY_CLIENT: 'CANCELLED_BY_CLIENT',
        CANCELLED_BY_DRIVER: 'CANCELLED_BY_DRIVER',
        NO_SHOW: 'NO_SHOW',
        DISPUTED: 'DISPUTED'
    });

    static VALID_TRANSITIONS = Object.freeze({
        [this.STATES.BOOKED]: Object.freeze([
            this.STATES.DRIVER_ARRIVED,
            this.STATES.BOARDED,
            this.STATES.CANCELLED_BY_CLIENT,
            this.STATES.CANCELLED_BY_DRIVER
        ]),
        [this.STATES.DRIVER_ARRIVED]: Object.freeze([
            this.STATES.BOARDED,
            this.STATES.NO_SHOW,
            this.STATES.CANCELLED_BY_CLIENT,
            this.STATES.CANCELLED_BY_DRIVER
        ]),
        [this.STATES.BOARDED]: Object.freeze([
            this.STATES.DROPPED_OFF,
            this.STATES.DISPUTED
        ]),
        [this.STATES.DROPPED_OFF]: Object.freeze([
            this.STATES.COMPLETED,
            this.STATES.DISPUTED
        ]),
        [this.STATES.DISPUTED]: Object.freeze([
            this.STATES.COMPLETED
        ]),
        [this.STATES.COMPLETED]: Object.freeze([]),
        [this.STATES.CANCELLED_BY_CLIENT]: Object.freeze([]),
        [this.STATES.CANCELLED_BY_DRIVER]: Object.freeze([]),
        [this.STATES.NO_SHOW]: Object.freeze([])
    });

    /**
     * Asserts that transitioning from currentState to nextState is legal.
     * @param {string} currentState 
     * @param {string} nextState 
     * @throws {Error} if transition is invalid
     */
    static validateTransition(currentState, nextState) {
        if (!this.STATES[nextState]) {
            throw new Error(`Invalid target journey state: ${nextState}`);
        }

        const allowed = this.VALID_TRANSITIONS[currentState];
        if (!allowed || !allowed.includes(nextState)) {
            throw new Error(`Illegal journey state transition from ${currentState} to ${nextState}`);
        }
    }

    /**
     * Whether a state is completely terminal (lifecycle closed).
     * @param {string} state 
     * @returns {boolean}
     */
    static isTerminal(state) {
        return [
            this.STATES.COMPLETED,
            this.STATES.CANCELLED_BY_CLIENT,
            this.STATES.CANCELLED_BY_DRIVER,
            this.STATES.NO_SHOW
        ].includes(state);
    }

    /**
     * Whether a journey is physically active in trip execution.
     * @param {string} state 
     * @returns {boolean}
     */
    static isExecutionActive(state) {
        return [
            this.STATES.BOOKED,
            this.STATES.DRIVER_ARRIVED,
            this.STATES.BOARDED
        ].includes(state);
    }

    /**
     * Whether physical trip participation has ended (terminal or disputed).
     * @param {string} state 
     * @returns {boolean}
     */
    static isExecutionTerminal(state) {
        return [
            this.STATES.COMPLETED,
            this.STATES.CANCELLED_BY_CLIENT,
            this.STATES.CANCELLED_BY_DRIVER,
            this.STATES.NO_SHOW,
            this.STATES.DISPUTED
        ].includes(state);
    }

    /**
     * Whether all financial liabilities/escrows for this journey have been finalized.
     * @param {string} state 
     * @returns {boolean}
     */
    static isFinanciallyClosed(state) {
        return [
            this.STATES.COMPLETED,
            this.STATES.CANCELLED_BY_CLIENT,
            this.STATES.CANCELLED_BY_DRIVER,
            this.STATES.NO_SHOW
        ].includes(state);
    }
}

module.exports = JourneyStateMachine;
