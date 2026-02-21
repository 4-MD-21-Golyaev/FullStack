-- CreateTable: AbsenceResolutionStrategy lookup
CREATE TABLE "AbsenceResolutionStrategy" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "AbsenceResolutionStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceResolutionStrategy_code_key" ON "AbsenceResolutionStrategy"("code");

-- SeedData: insert all valid strategies
INSERT INTO "AbsenceResolutionStrategy" ("id", "code", "name") VALUES
    (gen_random_uuid()::text, 'CALL_REPLACE', 'Позвонить и предложить замену'),
    (gen_random_uuid()::text, 'CALL_REMOVE',  'Позвонить и убрать позицию'),
    (gen_random_uuid()::text, 'AUTO_REPLACE', 'Автоматически заменить'),
    (gen_random_uuid()::text, 'AUTO_REMOVE',  'Автоматически убрать');

-- AlterTable: add FK column (nullable to allow data migration)
ALTER TABLE "Order" ADD COLUMN "absenceResolutionStrategyId" TEXT;

-- DataMigration: populate FK from existing string column
UPDATE "Order"
SET "absenceResolutionStrategyId" = ars."id"
FROM "AbsenceResolutionStrategy" ars
WHERE ars."code" = "Order"."absenceResolutionStrategy";

-- AlterTable: make FK NOT NULL
ALTER TABLE "Order" ALTER COLUMN "absenceResolutionStrategyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_absenceResolutionStrategyId_fkey"
    FOREIGN KEY ("absenceResolutionStrategyId") REFERENCES "AbsenceResolutionStrategy"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: drop old string column
ALTER TABLE "Order" DROP COLUMN "absenceResolutionStrategy";

-- CreateTable: UserRole reference (no FK on User — role stored as plain string)
CREATE TABLE "UserRole" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("code")
);

-- SeedData
INSERT INTO "UserRole" ("code", "name") VALUES
    ('CUSTOMER', 'Покупатель'),
    ('STAFF',    'Сотрудник склада'),
    ('ADMIN',    'Администратор');
