import { Suspense } from 'react';
import AppointmentClient from './AppointmentClient';


export default function AppointmentPage() {
  return (
    <Suspense fallback={<p>กำลังโหลดข้อมูล...</p>}>
      <AppointmentClient />
    </Suspense>
  );
}
