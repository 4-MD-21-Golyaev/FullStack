import { OrderRepository, AdminOrderFilters, AdminOrderRow } from '@/application/ports/OrderRepository';

interface AdminListOrdersInput {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

interface AdminListOrdersResult {
    orders: AdminOrderRow[];
    total: number;
}

export class AdminListOrdersUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(input: AdminListOrdersInput): Promise<AdminListOrdersResult> {
        const filters: AdminOrderFilters = {
            status: input.status,
            dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
            dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
            search: input.search,
            limit: input.limit ?? 50,
            offset: input.offset ?? 0,
        };

        const [orders, total] = await Promise.all([
            this.orderRepository.findAllWithFilters(filters),
            this.orderRepository.countWithFilters(filters),
        ]);

        return { orders, total };
    }
}
