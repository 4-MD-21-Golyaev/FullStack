import { Package, Clock, CalendarClock } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isTomorrow, differenceInMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button, Badge } from '@/shared/ui';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import type { OrderDto } from '@/lib/api/orders';
import styles from './OrderPickCard.module.css';

interface OrderPickCardProps {
  order: OrderDto;
  onClaim: (id: string) => void;
  isClaiming?: boolean;
}

type UrgencyLevel = 'burning' | 'today' | 'tomorrow';

interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  variant: 'danger' | 'warning' | 'info';
}

const STRATEGY_LABEL: Record<AbsenceResolutionStrategy, string> = {
  [AbsenceResolutionStrategy.CALL_REPLACE]: 'Позвонить → замена',
  [AbsenceResolutionStrategy.CALL_REMOVE]: 'Позвонить → убрать',
  [AbsenceResolutionStrategy.AUTO_REPLACE]: 'Авто-замена',
  [AbsenceResolutionStrategy.AUTO_REMOVE]: 'Авто-убрать',
};

function parseSlotStart(date: Date, slot: string | null | undefined): Date | null {
  if (!slot) return null;
  const match = slot.match(/^\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function formatDeliveryTime(scheduledDate: string | null | undefined, slot: string | null | undefined): string {
  if (!scheduledDate) return 'Без срока';
  const date = new Date(scheduledDate);
  const slotPart = slot ? `, ${slot}` : '';
  if (isToday(date)) return `Сегодня${slotPart}`;
  if (isTomorrow(date)) return `Завтра${slotPart}`;
  return `${format(date, 'd MMMM', { locale: ru })}${slotPart}`;
}

function computeUrgency(scheduledDate: string | null | undefined, slot: string | null | undefined): UrgencyInfo | null {
  if (!scheduledDate) return null;
  const date = new Date(scheduledDate);
  const slotStart = parseSlotStart(date, slot);
  const now = new Date();

  if (slotStart) {
    const minutesUntil = differenceInMinutes(slotStart, now);
    if (minutesUntil <= 60) {
      return { level: 'burning', label: 'Горит', variant: 'danger' };
    }
  }

  if (isToday(date)) return { level: 'today', label: 'Сегодня', variant: 'warning' };
  if (isTomorrow(date)) return { level: 'tomorrow', label: 'Завтра', variant: 'info' };
  return null;
}

function strategyVariant(strategy: AbsenceResolutionStrategy): 'default' | 'info' {
  return strategy === AbsenceResolutionStrategy.CALL_REPLACE || strategy === AbsenceResolutionStrategy.CALL_REMOVE
    ? 'info'
    : 'default';
}

export function OrderPickCard({ order, onClaim, isClaiming = false }: OrderPickCardProps) {
  const urgency = computeUrgency(order.scheduledDate, order.scheduledTimeSlot);
  const deliveryText = formatDeliveryTime(order.scheduledDate, order.scheduledTimeSlot);

  return (
    <div className={styles.root}>
      <div className={styles.top}>
        <div className={styles.meta}>
          <span className={styles.orderTag}>#{order.id.slice(0, 8)}</span>
          {urgency && (
            <Badge variant={urgency.variant} size="S">
              {urgency.label}
            </Badge>
          )}
          <span className={styles.total}>{order.totalAmount.toLocaleString('ru')} ₽</span>
        </div>
        <div className={styles.itemsCount}>
          <Package size={14} className={styles.packageIcon} />
          <span>{order.items.length} поз.</span>
        </div>
      </div>
      <div className={styles.deliveryRow}>
        <CalendarClock size={14} className={styles.deliveryIcon} />
        <span>{deliveryText}</span>
      </div>
      <div className={styles.timeRow}>
        <Clock size={14} className={styles.timeIcon} />
        <span>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru })}</span>
      </div>
      <div className={styles.strategyRow}>
        <Badge variant={strategyVariant(order.absenceResolutionStrategy)} size="S">
          {STRATEGY_LABEL[order.absenceResolutionStrategy]}
        </Badge>
      </div>
      <Button
        variant="primary"
        size="lg"
        loading={isClaiming}
        onClick={() => onClaim(order.id)}
      >
        Взять в работу
      </Button>
    </div>
  );
}
