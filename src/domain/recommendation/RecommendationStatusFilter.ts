/**
 * Order statuses included in recommendation aggregations.
 * Single source of truth — never duplicate the array in SQL or repositories.
 */
export const INCLUDED_ORDER_CODES = ['DELIVERED', 'CLOSED'] as const;

export type IncludedOrderCode = typeof INCLUDED_ORDER_CODES[number];
