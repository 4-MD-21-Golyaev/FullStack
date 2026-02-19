import { NextRequest, NextResponse } from 'next/server';
import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';

export async function GET(req: NextRequest) {
    try {
        const parentId = req.nextUrl.searchParams.get('parentId');

        const categoryRepo = new PrismaCategoryRepository();
        const categories = await categoryRepo.findByParentId(parentId);

        return NextResponse.json(categories);
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 500 }
        );
    }
}
