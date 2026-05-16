'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Grid,
  GridItem,
  Roadmap,
  Tab,
  TextField,
  RadioLabel,
  Button,
  IconButton,
  OrderSummary,
  InfoField,
  NarrowProductCard,
  AlertBlock,
  InputGroup,
} from '@/shared/ui';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import { ordersApi } from '@/lib/api/orders';
import { addressesApi, type UserAddressDto } from '@/lib/api/addresses';
import { AddressModal } from '@/features/address-select';
import MobileCartBar from '@/widgets/customer/MobileCartBar/MobileCartBar';
import styles from './checkout.module.css';

type DeliveryType = 'courier' | 'pickup';

interface CheckoutForm {
  deliveryType: DeliveryType;
  selectedAddressId: string | null;
  scheduledDate: string | null;
  pickupTimeSlot: string | null;
  courierTimeSlot: string | null;
  courierComment: string;
  absenceStrategy: AbsenceResolutionStrategy;
}

const DELIVERY_COST = 300;

function strategyLabel(strategy: AbsenceResolutionStrategy): string {
  const labels: Record<AbsenceResolutionStrategy, string> = {
    [AbsenceResolutionStrategy.CALL_REPLACE]: 'Позвонить мне. Подобрать замену, если не отвечу',
    [AbsenceResolutionStrategy.CALL_REMOVE]: 'Позвонить мне. Убрать из заказа, если не отвечу',
    [AbsenceResolutionStrategy.AUTO_REPLACE]: 'Не звонить. Подобрать замену',
    [AbsenceResolutionStrategy.AUTO_REMOVE]: 'Не звонить. Убрать из заказа',
  };
  return labels[strategy];
}

function getNextDays(count: number): { label: string; value: string }[] {
  const days: { label: string; value: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    days.push({ label, value });
  }
  return days;
}

const STEP_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Способ и время получения',
  2: 'Настройка сборки заказа',
  3: 'Выбор способа оплаты',
  4: 'Подтверждение заказа',
};

const PICKUP_TIME_SLOTS = [
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
  '20:00 - 21:00',
];

const COURIER_TIME_SLOTS = [
  '12:00 - 17:00',
  '17:00 - 20:00',
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items } = useCart();
  const { user, isLoading: authLoading, openAuthModal } = useAuth();
  const isMobile = useIsMobile();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<CheckoutForm>({
    deliveryType: 'courier',
    selectedAddressId: null,
    scheduledDate: getNextDays(1)[0].value,
    pickupTimeSlot: PICKUP_TIME_SLOTS[0],
    courierTimeSlot: COURIER_TIME_SLOTS[0],
    courierComment: '',
    absenceStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [savedAddresses, setSavedAddresses] = useState<UserAddressDto[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal();
      router.replace('/cart');
    }
  }, [authLoading, user, openAuthModal, router]);

  useEffect(() => {
    if (!user) return;
    addressesApi.list()
      .then((data) => {
        setSavedAddresses(data);
        if (data.length > 0) {
          setForm(f => ({ ...f, selectedAddressId: data[0].id }));
        }
      })
      .finally(() => setAddressesLoading(false));
  }, [user]);

  const inStockItems = items.filter(i => i.stock > 0);
  const hasNoItems = inStockItems.length === 0;
  const scheduledTimeSlot = form.deliveryType === 'pickup' ? form.pickupTimeSlot : form.courierTimeSlot;
  const timeSlotKey = form.deliveryType === 'pickup' ? 'pickupTimeSlot' : 'courierTimeSlot';

  useEffect(() => {
    if (!authLoading && user && hasNoItems) {
      router.replace('/cart');
    }
  }, [authLoading, user, hasNoItems, router]);

  // Guards
  if (authLoading) return null;
  if (!user) return null;
  if (hasNoItems) return null;

  const subtotal = inStockItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryCost = form.deliveryType === 'courier' ? DELIVERY_COST : undefined;
  const total = subtotal + (deliveryCost ?? 0);
  const itemCount = inStockItems.reduce((sum, i) => sum + i.quantity, 0);

  const getOrderAddress = (): string => {
    if (form.deliveryType === 'pickup') {
      return 'Самовывоз: ул. Карла Маркса 76';
    }
    const found = savedAddresses.find(a => a.id === form.selectedAddressId);
    return found?.address ?? '';
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const order = await ordersApi.createOrder({
        address: getOrderAddress(),
        absenceResolutionStrategy: form.absenceStrategy,
        items: inStockItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
        scheduledDate: form.scheduledDate ?? undefined,
        scheduledTimeSlot: scheduledTimeSlot ?? undefined,
      });
      sessionStorage.setItem('lastOrderId', order.id);
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const step1Disabled = (() => {
    if (step !== 1) return false;
    if (!form.scheduledDate || !scheduledTimeSlot) return true;
    if (form.deliveryType === 'courier') {
      return !form.selectedAddressId;
    }
    return false;
  })();

  const isLastStep = step === 4;
  const actionLabel = isLastStep
    ? (isSubmitting ? 'Оформляем...' : 'Подтвердить заказ')
    : 'Продолжить';
  const actionDisabled = isLastStep ? isSubmitting : step1Disabled;
  const onAction = isLastStep
    ? handleSubmit
    : () => setStep((step + 1) as 2 | 3 | 4);

  const handleAddressSaved = (newAddr: UserAddressDto) => {
    setSavedAddresses(prev => [...prev, newAddr]);
    setForm(f => ({ ...f, selectedAddressId: newAddr.id }));
    setShowAddressModal(false);
  };

  const nextDays = getNextDays(4);
  const timeSlots = form.deliveryType === 'pickup' ? PICKUP_TIME_SLOTS : COURIER_TIME_SLOTS;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <InputGroup title="Способ получения" required>
              <RadioLabel
                label="Самовывоз"
                checked={form.deliveryType === 'pickup'}
                onChange={() => setForm(f => ({ ...f, deliveryType: 'pickup' }))}
              />
              <RadioLabel
                label="Доставка до двери"
                checked={form.deliveryType === 'courier'}
                onChange={() => setForm(f => ({ ...f, deliveryType: 'courier' }))}
              />
            </InputGroup>

            {form.deliveryType === 'courier' && !addressesLoading && (
              savedAddresses.length > 0 ? (
                <InputGroup
                  title="Адрес доставки"
                  action={
                    <IconButton
                      icon="plus"
                      variant="gray"
                      size="md"
                      onClick={() => setShowAddressModal(true)}
                      aria-label="Добавить новый адрес"
                    />
                  }
                >
                  {savedAddresses.map(addr => (
                    <RadioLabel
                      key={addr.id}
                      label={addr.address}
                      checked={form.selectedAddressId === addr.id}
                      onChange={() => setForm(f => ({
                        ...f,
                        selectedAddressId: addr.id,
                      }))}
                    />
                  ))}
                </InputGroup>
              ) : (
                <InputGroup title="Адрес доставки">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setShowAddressModal(true)}
                  >
                    Добавить адрес
                  </Button>
                </InputGroup>
              )
            )}

            <InputGroup title="Дата и время">
              <div className={styles.dateTabsRow}>
                {nextDays.map(day => (
                  <Tab
                    key={day.value}
                    active={form.scheduledDate === day.value}
                    onClick={() => setForm(f => ({ ...f, scheduledDate: day.value }))}
                  >
                    {day.label}
                  </Tab>
                ))}
              </div>
              <div className={styles.radioGroup}>
                {timeSlots.map(slot => (
                  <RadioLabel
                    key={slot}
                    label={slot}
                    checked={scheduledTimeSlot === slot}
                    onChange={() => setForm(f => ({ ...f, [timeSlotKey]: slot }))}
                  />
                ))}
              </div>
            </InputGroup>

            {form.deliveryType === 'courier' && (
              <InputGroup title="Комментарий курьеру">
                <TextField
                  value={form.courierComment}
                  onChange={(e) => setForm(f => ({ ...f, courierComment: e.target.value }))}
                  placeholder="Что нужно учесть при доставке"
                  rows={3}
                />
              </InputGroup>
            )}
          </>
        );

      case 2:
        return (
          <InputGroup title="Что делать, если товара нет в наличии?">
            <RadioLabel
              label="Позвонить мне. Подобрать замену, если не отвечу"
              checked={form.absenceStrategy === AbsenceResolutionStrategy.CALL_REPLACE}
              onChange={() => setForm(f => ({ ...f, absenceStrategy: AbsenceResolutionStrategy.CALL_REPLACE }))}
            />
            <RadioLabel
              label="Позвонить мне. Убрать из заказа, если не отвечу"
              checked={form.absenceStrategy === AbsenceResolutionStrategy.CALL_REMOVE}
              onChange={() => setForm(f => ({ ...f, absenceStrategy: AbsenceResolutionStrategy.CALL_REMOVE }))}
            />
            <RadioLabel
              label="Не звонить. Убрать из заказа"
              checked={form.absenceStrategy === AbsenceResolutionStrategy.AUTO_REMOVE}
              onChange={() => setForm(f => ({ ...f, absenceStrategy: AbsenceResolutionStrategy.AUTO_REMOVE }))}
            />
            <RadioLabel
              label="Не звонить. Подобрать замену"
              checked={form.absenceStrategy === AbsenceResolutionStrategy.AUTO_REPLACE}
              onChange={() => setForm(f => ({ ...f, absenceStrategy: AbsenceResolutionStrategy.AUTO_REPLACE }))}
            />
          </InputGroup>
        );

      case 3:
        return (
          <InputGroup title="Способ оплаты">
            <RadioLabel label="Онлайн оплата картой" checked onChange={() => {}} />
          </InputGroup>
        );

      case 4:
        return (
          <InputGroup title="Подтверждение заказа">
            <InfoField
              name="Адрес доставки"
              value={getOrderAddress()}
              size="S"
              showEdit
              onEdit={() => setStep(1)}
            />
            {form.scheduledDate && (
              <InfoField
                name="Дата доставки"
                value={`${form.scheduledDate}${scheduledTimeSlot ? `, ${scheduledTimeSlot}` : ''}`}
                size="S"
                showEdit
                onEdit={() => setStep(1)}
              />
            )}
            <InfoField
              name="Если товар не в наличии"
              value={strategyLabel(form.absenceStrategy)}
              size="S"
              showEdit
              onEdit={() => setStep(2)}
            />
            <InfoField name="Оплата" value="Онлайн картой" size="S" />
          </InputGroup>
        );
    }
  };

  return (
    <Container className={styles.page}>
      <Grid>
        <GridItem span={8} spanMd={12}>
          <div className={styles.leftCol}>
            <div className={styles.roadmapRow}>
              <Roadmap
                stage={step}
                size={isMobile ? 'S' : 'L'}
                onStageClick={(s) => { if (s < step) setStep(s as 1 | 2 | 3 | 4); }}
              />
            </div>
            <h2 className={styles.stepName}>{STEP_NAMES[step]}</h2>
            <div className={styles.stepContent}>
              {renderStep()}
            </div>
          </div>
        </GridItem>

        <div className={styles.sidebarCol}>
          <div className={styles.sidebar}>
            {(step === 1 || step === 4) && (
              <OrderSummary
                itemCount={itemCount}
                subtotal={subtotal}
                deliveryCost={deliveryCost}
                total={total}
              />
            )}
            {submitError && <AlertBlock type="alert">{submitError}</AlertBlock>}
            {!isMobile && (
              <Button variant="primary" size="lg" onClick={onAction} disabled={actionDisabled}>
                {actionLabel}
              </Button>
            )}
            {step === 4 && (
              <div className={styles.itemsList}>
                {inStockItems.map(item => (
                  <NarrowProductCard
                    key={item.productId}
                    name={item.name}
                    imageSrc={item.imagePath}
                    quantity={item.quantity}
                    unitPrice={item.price}
                    totalPrice={item.price * item.quantity}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Grid>
      <AddressModal
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSaved={handleAddressSaved}
      />
      <MobileCartBar
        total={total}
        onCheckout={onAction}
        buttonText={actionLabel}
        disabled={actionDisabled}
        className={styles.bottomBar}
      />
    </Container>
  );
}
