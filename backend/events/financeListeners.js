const DomainEventBus = require('./DomainEventBus');
const TransactionService = require('../services/transactionService');
const Metrics = require('../utils/metrics');

class FinanceListeners {
    static init() {
        // Listen to TripCompleted to trigger automatic settlement
        DomainEventBus.on('TripCompleted', async (event) => {
            const { tripInstanceId } = event.payload;
            try {
                await TransactionService.settleTripPayment(tripInstanceId);
                Metrics.count('finance_settlement_success');
                console.log(`[FinanceListeners] Successfully settled trip ${tripInstanceId}`);
            } catch (error) {
                Metrics.count('finance_settlement_failure');
                console.error(`[FinanceListeners] Failed to settle trip ${tripInstanceId}:`, error);
            }
        });

        // Other domain events for finance can be added here
        // e.g., DepositSuccess -> resolvePendingTrips
    }
}

module.exports = FinanceListeners;
