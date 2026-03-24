import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';
import { GetCatalogStructureUseCase } from '@/application/catalog/GetCatalogStructureUseCase';
import { CatalogProvider } from './CatalogContext';

export default async function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalogStructure = await new GetCatalogStructureUseCase(
    new PrismaCategoryRepository(),
  ).execute();

  return <CatalogProvider initialData={catalogStructure}>{children}</CatalogProvider>;
}
