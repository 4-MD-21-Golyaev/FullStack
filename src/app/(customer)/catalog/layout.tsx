import { PrismaCategoryRepository } from '@/infrastructure/repositories/CategoryRepository.prisma';
import { GetCatalogStructureUseCase } from '@/application/catalog/GetCatalogStructureUseCase';
import { CatalogProvider } from './CatalogContext';
import { BreadcrumbsProvider } from '../BreadcrumbsContext';
import CustomerBreadcrumbs from '@/widgets/customer/CustomerBreadcrumbs/CustomerBreadcrumbs';
import CategoryHeader from './CategoryHeader';

export default async function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalogStructure = await new GetCatalogStructureUseCase(
    new PrismaCategoryRepository(),
  ).execute();

  return (
    <CatalogProvider initialData={catalogStructure}>
      <BreadcrumbsProvider>
        <CustomerBreadcrumbs />
        <CategoryHeader />
        {children}
      </BreadcrumbsProvider>
    </CatalogProvider>
  );
}
