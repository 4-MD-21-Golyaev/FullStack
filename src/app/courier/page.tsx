'use client';

import { WorkerPage } from '@/widgets/worker/WorkerPage/WorkerPage';
import { courierApi } from '@/lib/api/courier';
import { OrderDeliveryCard } from '@/widgets/courier/OrderDeliveryCard/OrderDeliveryCard';
import { DeliveryWorkspace } from '@/widgets/courier/DeliveryWorkspace/DeliveryWorkspace';

export default function CourierPage() {
  return (
    <WorkerPage
      queryKey="courier"
      api={courierApi}
      CardComponent={OrderDeliveryCard}
      WorkspaceComponent={DeliveryWorkspace}
    />
  );
}
