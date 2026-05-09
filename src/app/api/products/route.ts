import { type NextRequest, NextResponse } from 'next/server';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';
import { collectDescendantIds } from '@/domain/category/utils';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const categoryId = searchParams.get('categoryId');
        const includeDescendants = searchParams.get('includeDescendants') === 'true';

        const search = searchParams.get('search');
        const parsedLimit = parseInt(searchParams.get('limit') ?? '20', 10);
        const limit = Math.min(isNaN(parsedLimit) ? 20 : parsedLimit, 50);

        const productRepo = new PrismaProductRepository();

        let products;
        if (search) {
            products = await productRepo.findBySearch(search, limit);
        } else if (categoryId && includeDescendants) {
            const allCategories = await new PrismaCategoryRepository().findAll();
            const ids = collectDescendantIds(categoryId, allCategories);
            products = await productRepo.findByCategoryIds(ids);
        } else if (categoryId) {
            products = await productRepo.findByCategoryId(categoryId);
        } else {
            products = await productRepo.findAll();
        }

        const result = products.map(p => ({
            id: p.id,
            name: p.name,
            article: p.article,
            price: p.price,
            imagePath: p.imagePath,
            stock: p.stock,
            categoryId: p.categoryId,
        }));

        return NextResponse.json({ products: result, total: result.length });
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message },
            { status: 500 }
        );
    }
}
