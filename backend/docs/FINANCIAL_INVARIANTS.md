# 💰 DETOUR.MA — FINANCIAL INVARIANTS & DOUBLE-ENTRY RULES

> **Document Version**: 1.0.0  
> **Currency Base**: Moroccan Dirham (`MAD`), represented internally as Integer Centimes ($1\text{ MAD} = 100\text{ Centimes}$).

---

## 1. Fundamental Ledger Invariants

1. **Zero-Sum Balance**: For every `FinancialJournal`, the sum of all debit entries must strictly equal the sum of all credit entries:
$$\sum \text{Debits} - \sum \text{Credits} = 0$$

2. **No Float Arithmetic**: All ledger calculations convert amounts to integer centimes via `Math.round(mad * 100)` before recording.

3. **Tax Snapshot Immutability**: Every settlement transaction permanently stores:
   - `grossFare`
   - `commissionRate`
   - `taxStrategy`
   - `taxRate`
   - `taxableAmount`
   - `taxAmount`
   - `detourNetRevenue`
   - `driverNetAmount`
   Subsequent alterations to platform tax policy or rates will never alter historical financial records.

4. **Cash Pre-Debit Solvency**:
   - Drivers must have $\ge 50.00\text{ MAD}$ available wallet balance to receive cash ride bookings.
   - The exact calculated platform commission is locked into cash commission escrow at booking time.
   - Driver available balance can never drop below zero.

5. **Multi-Passenger Isolation**:
   - Each `PassengerJourney` settles its own discrete escrow ledger.
   - Cancellations, disputes, or no-shows of Passenger A do not affect the financial ledger of Passenger B.

6. **Two-Phase Anti-Dispute Clearance**:
   - Driver net earnings are credited to `DRIVER_PENDING_EARNINGS` upon passenger dropoff.
   - Funds clear to `DRIVER_AVAILABLE_EARNINGS` after 2 hours if no dispute is opened.
   - If disputed, funds freeze until Admin resolution.

7. **Minimum Withdrawal**:
   - Minimum bank withdrawal threshold is strictly $50.00\text{ MAD}$.
