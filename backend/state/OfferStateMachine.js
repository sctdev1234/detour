/**
 * ---------------------------------------------------------------------------------
 * CLASS: OfferStateMachine
 * ---------------------------------------------------------------------------------
 * Purpose: Enforces valid status transitions for a negotiation Offer.
 * Owner Domain: Dispatch Domain
 * Transitions:
 *   PENDING -> ACCEPTED | REJECTED | EXPIRED | WITHDRAWN | COUNTER_OFFERED
 *   COUNTER_OFFERED -> ACCEPTED | REJECTED | EXPIRED | WITHDRAWN | COUNTER_OFFERED
 * ---------------------------------------------------------------------------------
 */

class OfferStateMachine {
    static STATES = {
        PENDING: 'PENDING',
        COUNTER_OFFERED: 'COUNTER_OFFERED',
        ACCEPTED: 'ACCEPTED',
        REJECTED: 'REJECTED',
        EXPIRED: 'EXPIRED',
        WITHDRAWN: 'WITHDRAWN'
    };

    static VALID_TRANSITIONS = {
        [this.STATES.PENDING]: [
            this.STATES.ACCEPTED, 
            this.STATES.REJECTED, 
            this.STATES.EXPIRED, 
            this.STATES.WITHDRAWN, 
            this.STATES.COUNTER_OFFERED
        ],
        [this.STATES.COUNTER_OFFERED]: [
            this.STATES.ACCEPTED, 
            this.STATES.REJECTED, 
            this.STATES.EXPIRED, 
            this.STATES.WITHDRAWN, 
            this.STATES.COUNTER_OFFERED
        ],
        [this.STATES.ACCEPTED]: [],  // Terminal
        [this.STATES.REJECTED]: [],  // Terminal
        [this.STATES.EXPIRED]: [],   // Terminal
        [this.STATES.WITHDRAWN]: []  // Terminal
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
}

module.exports = OfferStateMachine;
