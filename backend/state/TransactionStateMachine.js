/**
 * ---------------------------------------------------------------------------------
 * CLASS: TransactionStateMachine
 * ---------------------------------------------------------------------------------
 * Purpose: Enforces valid status transitions for a Transaction and Withdrawal.
 * Owner Domain: Finance Domain
 * ---------------------------------------------------------------------------------
 */

class TransactionStateMachine {
    static STATES = {
        PENDING: 'pending',
        COMPLETED: 'completed',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        FAILED: 'failed',
        REFUNDED: 'refunded'
    };

    static VALID_TRANSITIONS = {
        // Core Transaction
        [this.STATES.PENDING]: [this.STATES.COMPLETED, this.STATES.FAILED, this.STATES.APPROVED, this.STATES.REJECTED],
        [this.STATES.COMPLETED]: [this.STATES.REFUNDED],
        [this.STATES.FAILED]: [this.STATES.PENDING], // Retry
        [this.STATES.REFUNDED]: [], // Terminal
        
        // Withdrawal-specific
        [this.STATES.APPROVED]: [], // Terminal
        [this.STATES.REJECTED]: [] // Terminal
    };

    /**
     * @param {string} currentState 
     * @param {string} newState 
     * @throws {Error} if transition is invalid
     */
    static validateTransition(currentState, newState) {
        const currentLower = currentState ? currentState.toLowerCase() : '';
        const newLower = newState ? newState.toLowerCase() : '';
        
        // Find mapped state constant via values
        const isValidTarget = Object.values(this.STATES).includes(newLower);
        if (!isValidTarget) { 
            throw new Error(`Invalid target state: ${newState}`);
        }

        const allowed = this.VALID_TRANSITIONS[currentLower];
        if (!allowed || !allowed.includes(newLower)) {
            throw new Error(`Illegal transaction state transition from ${currentState} to ${newState}`);
        }
    }
}

module.exports = TransactionStateMachine;
