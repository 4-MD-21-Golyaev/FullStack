'use client';

import { WorkerPage } from '@/widgets/worker/WorkerPage/WorkerPage';
import { pickerApi } from '@/lib/api/picker';
import { OrderPickCard } from '@/widgets/picker/OrderPickCard/OrderPickCard';
import { PickingWorkspace } from '@/widgets/picker/PickingWorkspace/PickingWorkspace';

export default function PickerPage() {
  return (
    <WorkerPage
      queryKey="picker"
      api={pickerApi}
      CardComponent={OrderPickCard}
      WorkspaceComponent={PickingWorkspace}
    />
  );
}
