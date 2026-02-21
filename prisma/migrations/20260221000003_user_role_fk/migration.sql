-- AddForeignKey: User.role → UserRole.code
-- UserRole data already exists from migration 20260221000002.
-- All existing users have valid roles (CUSTOMER / STAFF / ADMIN),
-- so the constraint can be added without a data migration step.

ALTER TABLE "User" ADD CONSTRAINT "User_role_fkey"
    FOREIGN KEY ("role") REFERENCES "UserRole"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;
