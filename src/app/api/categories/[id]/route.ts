import { NextRequest, NextResponse } from 'next/server';
import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const category = await new PrismaCategoryRepository().findById(id);
    if (!category) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(category);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
