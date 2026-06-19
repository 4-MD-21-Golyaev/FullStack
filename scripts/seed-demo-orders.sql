-- Demo orders seed.
-- Creates 3 demo customers and a spread of orders across active statuses
-- with realistic timestamps. Customers are upserted by email; orders are
-- inserted unconditionally — run once.
--
-- Run on VPS:
--   docker compose exec -T db psql -U postgres -d vkr < scripts/seed-demo-orders.sql

BEGIN;

INSERT INTO "User" (id, email, phone, address, role)
VALUES
  (gen_random_uuid(), 'demo-alice@kn-demo.local', '+79991110001', 'г. Воронеж, ул. Ленина 10, кв 5',  'CUSTOMER'),
  (gen_random_uuid(), 'demo-bob@kn-demo.local',   '+79991110002', 'г. Воронеж, ул. Пушкина 12, кв 7', 'CUSTOMER'),
  (gen_random_uuid(), 'demo-carol@kn-demo.local', '+79991110003', 'г. Воронеж, ул. Чехова 3, кв 14',  'CUSTOMER')
ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE
  spec jsonb;
  spec_list jsonb := '[
    {"email":"demo-alice@kn-demo.local","status":"CREATED",          "hoursAgo":2,    "picker":false,"courier":false,"payment":"none"},
    {"email":"demo-alice@kn-demo.local","status":"PICKING",          "hoursAgo":26,   "picker":true, "courier":false,"payment":"none"},
    {"email":"demo-alice@kn-demo.local","status":"PAYMENT",          "hoursAgo":50,   "picker":true, "courier":false,"payment":"pending"},
    {"email":"demo-bob@kn-demo.local",  "status":"DELIVERY_ASSIGNED","hoursAgo":74,   "picker":true, "courier":false,"payment":"success"},
    {"email":"demo-bob@kn-demo.local",  "status":"OUT_FOR_DELIVERY", "hoursAgo":98,   "picker":true, "courier":true, "payment":"success","outForDeliveryHoursAgo":1},
    {"email":"demo-carol@kn-demo.local","status":"DELIVERED",        "hoursAgo":146,  "picker":true, "courier":true, "payment":"success","outForDeliveryHoursAgo":3,"deliveredHoursAgo":2},
    {"email":"demo-carol@kn-demo.local","status":"CLOSED",           "hoursAgo":336,  "picker":true, "courier":true, "payment":"success","outForDeliveryHoursAgo":4,"deliveredHoursAgo":3},
    {"email":"demo-carol@kn-demo.local","status":"CLOSED",           "hoursAgo":720,  "picker":true, "courier":true, "payment":"success","outForDeliveryHoursAgo":4,"deliveredHoursAgo":3}
  ]'::jsonb;
  v_user_id uuid;
  v_user_address text;
  v_picker_id uuid;
  v_courier_id uuid;
  v_strategy_id uuid;
  v_status_id uuid;
  v_pay_pending_id uuid;
  v_pay_success_id uuid;
  v_order_id uuid;
  v_created timestamptz;
  v_picker_at timestamptz;
  v_delivery_at timestamptz;
  v_ofd_at timestamptz;
  v_del_at timestamptz;
  v_total numeric;
  v_picked jsonb;
BEGIN
  SELECT id INTO v_picker_id  FROM "User" WHERE role='PICKER'  LIMIT 1;
  SELECT id INTO v_courier_id FROM "User" WHERE role='COURIER' LIMIT 1;
  SELECT id INTO v_strategy_id FROM "AbsenceResolutionStrategy" WHERE code='CALL_REPLACE' LIMIT 1;
  SELECT id INTO v_pay_pending_id FROM "PaymentStatus" WHERE code='PENDING';
  SELECT id INTO v_pay_success_id FROM "PaymentStatus" WHERE code='SUCCESS';

  IF v_picker_id IS NULL OR v_courier_id IS NULL OR v_strategy_id IS NULL THEN
    RAISE EXCEPTION 'missing prerequisites: picker=%, courier=%, strategy=%',
      v_picker_id, v_courier_id, v_strategy_id;
  END IF;

  FOR spec IN SELECT * FROM jsonb_array_elements(spec_list) LOOP
    SELECT id, address INTO v_user_id, v_user_address FROM "User" WHERE email = spec->>'email';
    SELECT id INTO v_status_id FROM "OrderStatus" WHERE code = spec->>'status';

    v_created     := now() - ((spec->>'hoursAgo')::int * interval '1 hour');
    v_picker_at   := CASE WHEN (spec->>'picker')::boolean  THEN v_created + interval '30 min' END;
    v_delivery_at := CASE WHEN (spec->>'courier')::boolean THEN v_created + interval '2 hour' END;
    v_ofd_at      := CASE WHEN spec ? 'outForDeliveryHoursAgo' THEN now() - ((spec->>'outForDeliveryHoursAgo')::int * interval '1 hour') END;
    v_del_at      := CASE WHEN spec ? 'deliveredHoursAgo'      THEN now() - ((spec->>'deliveredHoursAgo')::int      * interval '1 hour') END;

    SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'article', article, 'price', price,
        'qty', (1 + floor(random()*3))::int))
      INTO v_picked
      FROM (SELECT id, name, article, price FROM "Product" WHERE stock > 0 ORDER BY random() LIMIT 3) p;

    SELECT SUM((p->>'price')::numeric * (p->>'qty')::int) INTO v_total
      FROM jsonb_array_elements(v_picked) p;

    v_order_id := gen_random_uuid();

    INSERT INTO "Order"
      (id, "userId", "statusId", "totalAmount", "deliveryAt", address,
       "absenceResolutionStrategyId",
       "pickerClaimUserId", "pickerClaimedAt",
       "deliveryClaimUserId", "deliveryClaimedAt",
       "outForDeliveryAt", "deliveredAt",
       "createdAt", "updatedAt")
    VALUES
      (v_order_id, v_user_id, v_status_id, v_total, NULL, COALESCE(v_user_address,'-'),
       v_strategy_id,
       CASE WHEN (spec->>'picker')::boolean  THEN v_picker_id  END, v_picker_at,
       CASE WHEN (spec->>'courier')::boolean THEN v_courier_id END, v_delivery_at,
       v_ofd_at, v_del_at,
       v_created, v_created);

    INSERT INTO "OrderItem" (id, "orderId", "productId", name, article, price, quantity)
    SELECT gen_random_uuid()::text, v_order_id::text, p->>'id',
           p->>'name', p->>'article', (p->>'price')::numeric, (p->>'qty')::int
      FROM jsonb_array_elements(v_picked) p;

    IF spec->>'payment' = 'pending' THEN
      INSERT INTO "Payment" (id, "orderId", "statusId", amount, "pendingOrderLock", "createdAt")
      VALUES (gen_random_uuid(), v_order_id, v_pay_pending_id, v_total, v_order_id::text, v_created);
    ELSIF spec->>'payment' = 'success' THEN
      INSERT INTO "Payment" (id, "orderId", "statusId", amount, "createdAt")
      VALUES (gen_random_uuid(), v_order_id, v_pay_success_id, v_total, v_created + interval '10 min');
    END IF;
  END LOOP;
END$$;

COMMIT;

SELECT s.code AS status, count(*) AS orders
  FROM "Order" o
  JOIN "OrderStatus" s ON s.id = o."statusId"
  JOIN "User" u ON u.id = o."userId"
 WHERE u.email LIKE 'demo-%@kn-demo.local'
 GROUP BY s.code
 ORDER BY s.code;
