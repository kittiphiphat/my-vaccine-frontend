'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import dynamic from 'next/dynamic';
import {
  Syringe,
  CalendarCheck,
  BarChart2,
  Users,
  UserCheck,
  Hospital,
  Blinds,
} from 'lucide-react';

const Vaccines = dynamic(() => import('./Tabs/Vaccines'), { ssr: false, loading: () => <p>Loading...</p> });
const BookingManagement = dynamic(() => import('./Tabs/BookingManagement'), { ssr: false });
const Reports = dynamic(() => import('./Tabs/Reports'), { ssr: false });
const UsersTab = dynamic(() => import('./Tabs/Users'), { ssr: false });
const Patients = dynamic(() => import('./Tabs/Patients'), { ssr: false });
const HospitalInfo = dynamic(() => import('./Tabs/HospitalInfo'), { ssr: false });
// const Logs = dynamic(() => import('./Tabs/Logs'), { ssr: false });

const TAB_LIST = [
  { id: 'vaccines', label: 'จัดการวัคซีน', icon: Syringe },
  { id: 'booking', label: 'รูปแบบให้บริการของวัคซีน', icon: CalendarCheck },
  { id: 'reports', label: 'รายงาน & สถิติ', icon: BarChart2 },
  { id: 'users', label: 'ข้อมูลผู้ใช้งาน', icon: Users },
  { id: 'patients', label: 'ข้อมูลผู้ป่วย', icon: UserCheck },
  { id: 'hospital', label: 'ข้อมูลรายละเอียดใบนัด', icon: Hospital },
  // { id: 'log', label: 'ข้อมูลรายละเอียดการทำงาน', icon: Blinds },
];

const COMPONENTS = {
  vaccines: Vaccines,
  booking: BookingManagement,
  reports: Reports,
  users: UsersTab,
  patients: Patients,
  hospital: HospitalInfo,
  // log: Logs,
};

function getTabFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('tab');
}

export default function Dashboard() {
  const router = useRouter();


  const [activeTab, setActiveTab] = useState('vaccines');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tab = getTabFromUrl();
    if (tab) setActiveTab(tab);
  }, []);

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
            {TAB_LIST.map(({ id, label, icon: Icon }) => (
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
        {CurrentComponent ? (
          <CurrentComponent />
        ) : (
          <p className="text-center text-gray-600 text-lg mt-20 select-none">
            ไม่พบข้อมูล
          </p>
        )}
      </main>
    </div>
  );
}