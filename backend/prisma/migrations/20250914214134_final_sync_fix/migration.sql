/*
  Warnings:

  - A unique constraint covering the columns `[id,storeId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Order_id_storeId_key" ON "public"."Order"("id", "storeId");
