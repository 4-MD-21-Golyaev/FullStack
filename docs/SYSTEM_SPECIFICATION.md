# SYSTEM_SPECIFICATION.md
Project: eGrocery Order Management System
Architecture: Clean / Hexagonal
Stack: Next.js + Prisma + PostgreSQL + Yookassa

---

## 1. Product Goal

The system provides a transaction-safe online purchasing process with:

- strict separation of mutable user selection and immutable order
- controlled order lifecycle
- idempotent payment processing
- impossibility of invalid domain states

Domain correctness has priority over UI behavior.

---

## 2. System Boundaries

### Included

- local assortment storage
- user context (cart)
- order creation and confirmation
- picking (assembly)
- payment processing
- order lifecycle management
- stock deduction
- API layer
- Yookassa integration
- MoySklad synchronization

### Excluded

- logistics
- refund processes
- internal logic of external systems

---

## 3. Architectural Constraints

Layer order:

domain ← application ← infrastructure ← presentation

Rules:

- Domain must not depend on infrastructure.
- State machine exists only in domain.
- No layer may bypass state transitions.
- Presentation contains no business rules.

---

## 4. Logical System Contexts

1. Assortment context
2. User selection context (cart)
3. Confirmed order context

---

## 5. User Context (Cart)

Cart is a mutable selection before order confirmation.

### Properties

- mutable
- not a commitment
- does not create Order

### Modes

#### Unauthenticated

- stored locally
- not persisted in database

#### Authenticated

- stored in database
- managed via use-cases

---

## 6. Order Creation Moment

Order is created only on confirmation.

Cart (mutable)
→ Confirm
→ Order(CREATED, immutable composition)

No persistent Order exists before confirmation.

---

## 7. Order Lifecycle

### States

CREATED  
PICKING  
PAYMENT  
DELIVERY  
CLOSED  
CANCELLED

---

### 7.1 State Meaning

CREATED
- composition fixed
- total fixed
- cancellation allowed
- transition to PICKING allowed once

PICKING
- assembly in progress
- composition may change
- total may change
- absence strategy applied
- transition back to CREATED is forbidden

PAYMENT
- composition immutable
- total immutable
- waiting for payment
- 10-minute timeout active

DELIVERY
- payment confirmed
- stock deducted
- no modifications allowed

CLOSED
- completed

CANCELLED
- terminal

---

### 7.2 Allowed Transitions

CREATED → PICKING  
PICKING → PAYMENT  
PAYMENT → DELIVERY  
DELIVERY → CLOSED

CREATED → CANCELLED  
PICKING → CANCELLED  
PAYMENT → CANCELLED (before SUCCESS)

All other transitions are forbidden.

Re-entering previous states is forbidden.

---

### 7.3 Picking Initiation

Transition CREATED → PICKING is triggered via system API.

In the scope of this project, roles are not modeled.
The action is initiated from user-facing API but treated as a system-level operation.

---

## 8. Absence Resolution Strategy

Order field:

absenceResolutionStrategy:

- CALL_REPLACE
- CALL_REMOVE
- AUTO_REMOVE
- AUTO_REPLACE

Rules:

- Composition adjustment allowed only in PICKING.
- Total recalculated only in PICKING.
- After transition to PAYMENT, no further modifications allowed.

---

## 9. Order Invariants

1. Order is always in exactly one state.
2. Composition immutable after PAYMENT.
3. Total immutable after PAYMENT.
4. Order cannot exist without User.
5. Cancellation forbidden in DELIVERY and CLOSED.
6. Transition from PICKING back to CREATED forbidden.

---

## 10. Payment Model

### Statuses

PENDING  
SUCCESS  
FAILED

### Rules

- SUCCESS is terminal.
- FAILED is terminal.
- FAILED allows new Payment creation.
- SUCCESS forbids new Payment creation.
- Only one PENDING Payment allowed at a time.

---

## 11. Payment Timeout

Timeout starts at the moment of transition to PAYMENT state.

If Order remains in PAYMENT more than 10 minutes and Payment = PENDING:

→ automatic transition to CANCELLED.

Implemented via scheduled background job.

---

## 12. Race Conditions

Priority rule:

- SUCCESS has priority over Cancel.

If SUCCESS is committed first → Cancel forbidden.  
If Cancel committed first → SUCCESS ignored.

Implementation requirements:

- transactional boundaries
- row-level locking or optimistic versioning
- state validation inside transaction

---

## 13. Stock Handling

- Stored locally.
- Deducted during PAYMENT → DELIVERY transition.
- Not deducted before payment.
- Periodically synchronized with MoySklad.

Unavailable goods cannot be sold because picking occurs before payment.

---

## 14. Yookassa Integration

System:

- creates Payment(PENDING)
- receives webhook
- transitions Order to DELIVERY on SUCCESS

Webhook requirements:

- idempotent
- always returns HTTP 200
- cannot override SUCCESS

---

## 15. MoySklad Integration

### Import

- product updates
- price updates
- availability updates

### Export

- executed after DELIVERY
- must not affect Order validity
- implemented via outbox pattern

---

## 16. Transaction Boundaries

Executed inside transaction:

- ConfirmOrder
- ConfirmPayment
- CancelOrder
- PAYMENT → DELIVERY transition

Executed outside transaction:

- external export

---

## 17. User Model

User deletion forbidden.

---

## 18. Personal Account

Allowed:

- view orders
- view status
- repeat order

Forbidden:

- modify DELIVERY
- modify CLOSED
- bypass state machine

---

## 19. Forbidden States

The following must be impossible:

- DELIVERY without SUCCESS
- CLOSED without DELIVERY
- SUCCESS without Order
- multiple SUCCESS Payments
- composition change after PAYMENT
- Order without User
- return from PICKING to CREATED

If any of these are possible, implementation is invalid.

---

## 20. Backend Completion Criteria

Backend is considered complete if:

- all transitions are covered by tests
- race conditions resolved
- payment timeout implemented
- webhook idempotent
- no forbidden states reachable
- cart isolated from domain model
- composition mutation restricted strictly to PICKING state