'use client';
import { RoleGuard } from '@/components/auth-guard';
import UncollectedListPage from '@/components/uncollected/uncollected-list-page';

export default function Page() {
  return (
    <RoleGuard requiredRoles={['viewer', 'operator', 'manager', 'admin']}>
      <UncollectedListPage />
    </RoleGuard>
  );
}
