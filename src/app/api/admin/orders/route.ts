import { NextRequest, NextResponse } from 'next/server';
import { AdminListOrdersUseCase } from '@/application/admin/AdminListOrdersUseCase';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    try {
        const useCase = new AdminListOrdersUseCase(new PrismaOrderRepository());
        const result = await useCase.execute({
            status: searchParams.get('status') ?? undefined,
            dateFrom: searchParams.get('dateFrom') ?? undefined,
            dateTo: searchParams.get('dateTo') ?? undefined,
            search: searchParams.get('search') ?? undefined,
            limit: searchParams.has('limit') ? Number(searchParams.get('limit')) : undefined,
            offset: searchParams.has('offset') ? Number(searchParams.get('offset')) : undefined,
        });
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
