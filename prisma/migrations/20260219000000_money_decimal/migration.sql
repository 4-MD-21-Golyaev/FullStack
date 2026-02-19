-- AlterTable: change integer money fields to DECIMAL(10,2)
ALTER TABLE "Product" ALTER COLUMN "price" TYPE DECIMAL(10,2) USING "price"::DECIMAL(10,2);
ALTER TABLE "Order" ALTER COLUMN "totalAmount" TYPE DECIMAL(10,2) USING "totalAmount"::DECIMAL(10,2);
ALTER TABLE "OrderItem" ALTER COLUMN "price" TYPE DECIMAL(10,2) USING "price"::DECIMAL(10,2);
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE DECIMAL(10,2) USING "amount"::DECIMAL(10,2);
