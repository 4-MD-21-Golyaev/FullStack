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
} from '@/shared/ui';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import { ordersApi } from '@/lib/api/orders';
import { addressesApi, type UserAddressDto } from '@/lib/api/addresses';
import { AddressModal } from '@/features/address-select';
import styles from './checkout.module.css';

type DeliveryType = 'courier' | 'pickup';

interface CheckoutForm {
  deliveryType: DeliveryType;
  selectedAddressId: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  courierComment: string;
  absenceStrategy: AbsenceResolutionStrategy;
}

const DELIVERY_COST = 300;
const DISCOUNT_PERCENT = 15;

function strategyLabel(strategy: AbsenceResolutionStrategy): string {
  const labels: Record<AbsenceResolutionStrategy, string> = {
    [AbsenceResolutionStrategy.CALL_REPLACE]: 'Позвоните и предложите замену',
    [AbsenceResolutionStrategy.CALL_REMOVE]: 'Позвоните — если нет, уберите',
    [AbsenceResolutionStrategy.AUTO_REPLACE]: 'Замените автоматически',
    [AbsenceResolutionStrategy.AUTO_REMOVE]: 'Уберите без звонка',
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

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<CheckoutForm>({
    deliveryType: 'courier',
    selectedAddressId: null,
    scheduledDate: getNextDays(1)[0].value,
    scheduledTimeSlot: COURIER_TIME_SLOTS[0],
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

  // Guards
  if (authLoading) return null;
  if (!user) return null;

  const inStockItems = items.filter(i => i.stock > 0);

  if (inStockItems.length === 0) {
    router.replace('/cart');
    return null;
  }

  const subtotal = inStockItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = Math.round(subtotal * DISCOUNT_PERCENT / 100);
  const deliveryCost = form.deliveryType === 'courier' ? DELIVERY_COST : undefined;
  const total = subtotal + (deliveryCost ?? 0) - discount;
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
        scheduledTimeSlot: form.scheduledTimeSlot ?? undefined,
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
    if (!form.scheduledDate || !form.scheduledTimeSlot) return true;
    if (form.deliveryType === 'courier') {
      return !form.selectedAddressId;
    }
    return false;
  })();

  const stepButton = () => {
    if (step === 4) {
      return (
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Оформляем...' : 'Подтвердить заказ'}
        </Button>
      );
    }
    const nextStep = (step + 1) as 2 | 3 | 4;
    return (
      <Button variant="primary" size="lg" onClick={() => setStep(nextStep)} disabled={step1Disabled}>
        Далее
      </Button>
    );
  };

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
            {/* Section 1: Delivery type */}
            <div className={styles.formSection}>
              <h2 className={styles.stepTitle}>Способ получения</h2>
              <div className={styles.radioGroup}>
                <RadioLabel
                  label="Самовывоз"
                  checked={form.deliveryType === 'pickup'}
                  onChange={() => setForm(f => ({
                    ...f,
                    deliveryType: 'pickup',
                    scheduledTimeSlot: null,
                  }))}
                />
                <RadioLabel
                  label="Доставка до двери"
                  checked={form.deliveryType === 'courier'}
                  onChange={() => setForm(f => ({
                    ...f,
                    deliveryType: 'courier',
                    scheduledTimeSlot: null,
                  }))}
                />
              </div>
              {form.deliveryType === 'pickup' && (
                <p className={styles.pickupInfo}>
                  Самовывоз по адресу г. Хабаровск, улица Карла Маркса 76, 1 этаж. Заказ необходимо забрать до 21:00.
                </p>
              )}
            </div>

            {/* Section 2: Courier address */}
            {form.deliveryType === 'courier' && !addressesLoading && (
              <div className={styles.formSection}>
                {savedAddresses.length > 0 ? (
                  <>
                    <div className={styles.sectionRow}>
                      <span className={styles.sectionTitle}>Адрес доставки</span>
                      <IconButton
                        icon="plus"
                        variant="gray"
                        size="md"
                        onClick={() => setShowAddressModal(true)}
                        aria-label="Добавить новый адрес"
                      />
                    </div>
                    <div className={styles.radioGroup}>
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
                    </div>
                  </>
                ) : (
                  <>
                    <span className={styles.sectionTitle}>Адрес доставки</span>
                    <div className={styles.addAddressRow}>
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => setShowAddressModal(true)}
                      >
                        Добавить адрес
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Section 3: Date and time */}
            <div className={styles.formSection}>
              <span className={styles.sectionTitle}>Дата и время</span>
              <div className={styles.dateTabsRow}>
                {nextDays.map(day => (
                  <Tab
                    key={day.value}
                    active={form.scheduledDate === day.value}
                    onClick={() => setForm(f => ({ ...f, scheduledDate: day.value, scheduledTimeSlot: timeSlots[0] }))}
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
                    checked={form.scheduledTimeSlot === slot}
                    onChange={() => setForm(f => ({ ...f, scheduledTimeSlot: slot }))}
                  />
                ))}
              </div>
            </div>

            {/* Section 4: Courier comment */}
            {form.deliveryType === 'courier' && (
              <div className={styles.formSection}>
                <span className={styles.sectionTitle}>Комментарий курьеру</span>
                <TextField
                  label="Комментарий курьеру"
                  value={form.courierComment}
                  onChange={(e) => setForm(f => ({ ...f, courierComment: e.target.value }))}
                  placeholder="Что нужно учесть при доставке"
                  rows={3}
                />
              </div>
            )}
          </>
        );

      case 2:
        return (
          <div className={styles.formSection}>
            <h2 className={styles.stepTitle}>Что делать, если товара нет в наличии?</h2>
            <div className={styles.radioGroup}>
              <RadioLabel
                label="Позвоните и предложите замену"
                checked={form.absenceStrategy === AbsenceResolutionStrategy.CALL_REPLACE}
                onChange={() => setForm(f => ({ ...f, absenceStrategy: AbsenceResolutionStrategy.CALL_REPLACE }))}
              />
              <RadioLabel
                label="Позвоните — если нет, уберите из заказа"
                checked={form.absenceStrategy === AbsenceResolutionStrategy.CALL_REMOVE}
                onChange={() => setForm(f => ({ ...f, absenceStrategy: AbsenceResolutionStrategy.CALL_REMOVE }))}
              />
              <RadioLabel
                label="Замените автоматически"
                checked={form.absenceStrategy === AbsenceResolutionStrategy.AUTO_REPLACE}
                onChange={() => setForm(f => ({ ...f, absenceStrategy: AbsenceResolutionStrategy.AUTO_REPLACE }))}
              />
              <RadioLabel
                label="Уберите без звонка"
                checked={form.absenceStrategy === AbsenceResolutionStrategy.AUTO_REMOVE}
                onChange={() => setForm(f => ({ ...f, absenceStrategy: AbsenceResolutionStrategy.AUTO_REMOVE }))}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className={styles.formSection}>
            <h2 className={styles.stepTitle}>Способ оплаты</h2>
            <div className={styles.radioGroup}>
              <RadioLabel label="Онлайн оплата картой" checked onChange={() => {}} />
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles.formSection}>
            <h2 className={styles.stepTitle}>Подтверждение заказа</h2>
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
                value={`${form.scheduledDate}${form.scheduledTimeSlot ? `, ${form.scheduledTimeSlot}` : ''}`}
                size="S"
                showEdit
                onEdit={() => setStep(1)}
              />
            )}
            <InfoField
              name="Стратегия замены"
              value={strategyLabel(form.absenceStrategy)}
              size="S"
              showEdit
              onEdit={() => setStep(2)}
            />
            <InfoField name="Оплата" value="Онлайн картой" size="S" />
          </div>
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
                size="L"
                onStageClick={(s) => { if (s < step) setStep(s as 1 | 2 | 3 | 4); }}
              />
            </div>
            <div className={styles.stepContent}>
              {renderStep()}
            </div>
          </div>
        </GridItem>

        <div className={styles.sidebarCol}>
          <div className={styles.sidebar}>
            <OrderSummary
              itemCount={itemCount}
              subtotal={subtotal}
              deliveryCost={deliveryCost}
              discount={discount}
              discountPercent={DISCOUNT_PERCENT}
              total={total}
            />
            {submitError && <AlertBlock type="alert">{submitError}</AlertBlock>}
            {stepButton()}
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
    </Container>
  );
}
