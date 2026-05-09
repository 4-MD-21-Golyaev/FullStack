-- CreateIndex
CREATE INDEX "Order_userId_statusId_idx" ON "Order"("userId", "statusId");

-- CreateIndex
CREATE INDEX "Order_statusId_createdAt_idx" ON "Order"("statusId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_productId_idx" ON "OrderItem"("orderId", "productId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
