'use client';
import { RoleGuard } from '@/components/auth-guard';
import CashierPaymentPage from '@/components/cashier/cashier-payment-page';

export default function Page() {
  return (
    <RoleGuard requiredRoles={['viewer', 'operator', 'manager', 'admin']}>
      <CashierPaymentPage />
    </RoleGuard>
  );
}
