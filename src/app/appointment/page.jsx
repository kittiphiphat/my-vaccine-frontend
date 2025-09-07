import { Suspense } from 'react';
import AppointmentClient from './AppointmentClient';
import LoadingFallback from '@/components/LoadingFallback';


export default function AppointmentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppointmentClient />
    </Suspense>
  );
}