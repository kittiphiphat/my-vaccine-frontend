'use client';

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import {
  Syringe,
  CalendarCheck,
  BarChart2,
  Users,
  UserCheck,
  Hospital,
  FileText,
} from 'lucide-react';
const Vaccines = lazy(() => import('./Tabs/Vaccines'));
const BookingManagement = lazy(() => import('./Tabs/BookingManagement'));
const Reports = lazy(() => import('./Tabs/Reports'));
const UsersTab = lazy(() => import('./Tabs/Users'));
const Patients = lazy(() => import('./Tabs/Patients'));
const HospitalInfo = lazy(() => import('./Tabs/HospitalInfo'));
const Logs = lazy(() => import('./Tabs/Logs'));

const TAB_LIST = [
  { id: 'vaccines', label: 'จัดการวัคซีน', icon: Syringe },
  { id: 'booking', label: 'รูปแบบให้บริการของวัคซีน', icon: CalendarCheck },
  { id: 'reports', label: 'รายงาน & สถิติ', icon: BarChart2 },
  { id: 'users', label: 'ข้อมูลผู้ใช้งาน', icon: Users },
  { id: 'patients', label: 'ข้อมูลผู้ป่วย', icon: UserCheck },
  { id: 'hospital', label: 'ข้อมูลรายละเอียดใบนัด', icon: Hospital },
  { id: 'log', label: 'ข้อมูลรายละเอียดการทำงาน', icon: FileText },
];

const COMPONENTS = {
  vaccines: Vaccines,
  booking: BookingManagement,
  reports: Reports,
  users: UsersTab,
  patients: Patients,
  hospital: HospitalInfo,
  log: Logs,
};

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'vaccines');
  const [loading, setLoading] = useState(true);

  // sync activeTab เมื่อ query param เปลี่ยน
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`,
          { withCredentials: true }
        );
        const role = res.data?.role?.name?.toLowerCase();
        if (role !== 'admin') {
          router.replace('/');
        } else {
          setLoading(false);
        }
      } catch {
        router.replace('/login');
      }
    };
    checkAdmin();
  }, [router]);

  const handleTabChange = (id) => {
    setActiveTab(id);
    router.replace(`/admin/dashboard?tab=${id}`, { scroll: false }); 
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-[#30266D] text-lg font-semibold animate-pulse">
          กำลังโหลดข้อมูล...
        </p>
      </div>
    );
  }

  const CurrentComponent = COMPONENTS[activeTab];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-72 bg-white shadow-2xl border-r border-gray-200 flex flex-col">
        <div className="px-8 py-8 border-b border-gray-100 text-center">
          <h1 className="text-3xl font-extrabold text-[#30266D] select-none">
            ระบบจองวัคซีน
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-2 px-2 cursor-pointer">
            {TAB_LIST.map(({ id, label , icon: Icon}) => (
              <li key={id}>
                <button
                  onClick={() => handleTabChange(id)}
                  title={label}
                  className={`flex items-center w-full px-5 py-3 text-base font-medium rounded-xl transition
                    ${
                      activeTab === id
                        ? 'bg-gradient-to-r from-[#30266D] to-[#F9669D] text-white shadow-md'
                        : 'text-gray-700 hover:bg-[#F3F4F6] hover:text-[#30266D]'
                    }`}
                  aria-current={activeTab === id ? 'page' : undefined}
                >
                   <Icon className="w-5 h-5 mr-3" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="px-6 py-4 border-t border-gray-100 text-center text-xs text-gray-400 select-none">
          &copy; 2025 MedCMU สงวนลิขสิทธิ์
        </footer>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto rounded-l-3xl">
        <Suspense fallback={
          <div className="flex justify-center items-center h-96">
            <p className="text-gray-500 text-lg select-none animate-pulse">
              กำลังโหลดข้อมูล...
            </p>
          </div>
        }>
          {CurrentComponent ? <CurrentComponent /> : (
            <p className="text-center text-gray-600 text-lg mt-20 select-none">
              ไม่พบข้อมูล
            </p>
          )}
        </Suspense>
      </main>
    </div>
  );
}
