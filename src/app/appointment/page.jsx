import { Suspense } from 'react';
import AppointmentClient from './AppointmentClient';



export default function AppointmentPage() {
  return (
    <Suspense>
      <AppointmentClient />
    </Suspense>
  );
}