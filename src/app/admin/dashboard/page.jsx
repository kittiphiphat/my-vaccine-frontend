import { Suspense } from 'react';
import DashboardContent from './DashboardContent';

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}