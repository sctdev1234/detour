/**
 * ---------------------------------------------------------------------------------
 * SERVICE: PaymentProvider
 * ---------------------------------------------------------------------------------
 * Purpose: Abstraction layer for payment gateways (e.g., Stripe, CMI).
 *          Currently implements a Sandbox provider driven by configuration.
 * Owner Domain: Finance
 * ---------------------------------------------------------------------------------
 */

const crypto = require('crypto');
const env = require('../config/env');

class PaymentProvider {
    /**
     * Process a payment (e.g. top-up from a card).
     * @param {number} amount - Amount to charge
     * @param {string} currency - Currency (default 'MAD')
     * @param {string} sourceId - The payment source token or ID
     * @param {string} idempotencyKey - Key to prevent duplicate charges
     * @returns {object} { success: boolean, transactionId: string, error?: string }
     */
    static async processPayment({ amount, currency = 'MAD', sourceId, idempotencyKey }) {
        if (!idempotencyKey) {
            throw new Error('Idempotency key is required for payment processing');
        }

        // Check if sandbox mode is active (always true for this sprint)
        const isSandbox = env.PAYMENT_SANDBOX_MODE !== 'false';

        if (isSandbox) {
            // Sandbox Implementation
            console.log(`[PaymentProvider:Sandbox] Processing ${amount} ${currency} using source ${sourceId}`);
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Simulate failure cases based on sourceId or amount for testing
            if (sourceId === 'tok_fail' || amount > 50000) {
                return {
                    success: false,
                    error: 'Card declined by issuing bank'
                };
            }

            return {
                success: true,
                transactionId: `sndbx_tx_${crypto.randomBytes(8).toString('hex')}`
            };
        }

        // Real Provider Implementation (e.g., Stripe, CMI) would go here
        throw new Error('Real payment gateway not yet implemented');
    }
}

module.exports = PaymentProvider;
