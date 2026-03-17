import { NextRequest, NextResponse } from 'next/server';
import { PickerListMyOrdersUseCase } from '@/application/picker/PickerListMyOrdersUseCase';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const userId = req.headers.get('x-user-id') ?? '';
    try {
        const useCase = new PickerListMyOrdersUseCase(new PrismaOrderRepository());
        const orders = await useCase.execute({ userId });
        return NextResponse.json({ order: orders[0] ?? null });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
