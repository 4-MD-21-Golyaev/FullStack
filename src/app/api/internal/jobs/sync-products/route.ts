import { NextRequest, NextResponse } from 'next/server';
import { SyncProductsUseCase } from '@/application/product/SyncProductsUseCase';
import { HttpMoySkladCatalogGateway } from '@/infrastructure/moysklad/HttpMoySkladGateway';
import { DiskImageStorageGateway } from '@/infrastructure/storage/DiskImageStorageGateway';
import { PrismaProductRepository } from '@/infrastructure/repositories/ProductRepository.prisma';
import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';
import { assertInternalJobAuth } from '@/lib/internal-job-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const auth = assertInternalJobAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const useCase = new SyncProductsUseCase(
            new HttpMoySkladCatalogGateway({
                token:          process.env.MOYSKLAD_TOKEN!,
                organizationId: process.env.MOYSKLAD_ORGANIZATION_ID!,
                agentId:        process.env.MOYSKLAD_AGENT_ID!,
            }),
            new PrismaProductRepository(),
            new PrismaCategoryRepository(),
            new DiskImageStorageGateway(),
        );
        const result = await useCase.execute();
        return NextResponse.json({ ok: true, result });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
