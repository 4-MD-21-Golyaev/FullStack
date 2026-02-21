import { NextRequest, NextResponse } from 'next/server';
import { PrismaOrderRepository } from '@/infrastructure/repositories/OrderRepository.prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const order = await new PrismaOrderRepository().findById(id);

    if (!order) {
        return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // CUSTOMER can only view their own orders
    if (userRole === 'CUSTOMER' && order.userId !== userId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(order);
}
