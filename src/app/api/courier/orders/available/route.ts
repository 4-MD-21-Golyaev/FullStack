import { NextRequest, NextResponse } from 'next/server';
import { CourierListAvailableUseCase } from '@/application/courier/CourierListAvailableUseCase';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
    try {
        const useCase = new CourierListAvailableUseCase(new PrismaOrderRepository());
        const orders = await useCase.execute();
        return NextResponse.json({ orders });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
