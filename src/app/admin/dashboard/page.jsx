'use client';

import { useEffect, useState, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Syringe,
  Calendar,
  BarChart2,
  Users,
  BookText,
  Hospital
} from 'lucide-react';

const Vaccines = lazy(() => import('./Tabs/Vaccines'));
const BookingManagement = lazy(() => import('./Tabs/BookingManagement'));
const Reports = lazy(() => import('./Tabs/Reports'));
const UsersTab = lazy(() => import('./Tabs/Users'));
const Patients = lazy(() => import('./Tabs/Patients'));
const HospitalInfo = lazy(() => import('./Tabs/HospitalInfo'));

const TAB_LIST = [
  { id: 'vaccines', label: 'จัดการวัคซีน', icon: Syringe, Component: Vaccines },
  { id: 'booking', label: 'รูปแบบให้บริการของวัคซีน', icon: Calendar, Component: BookingManagement },
  { id: 'reports', label: 'รายงาน & สถิติ', icon: BarChart2, Component: Reports },
  { id: 'users', label: 'ข้อมูลผู้ใช้งาน', icon: Users, Component: UsersTab },
  { id: 'patients', label: 'ข้อมูลผู้ป่วย', icon: BookText, Component: Patients },
  { id: 'hospital', label: 'ข้อมูลรายละเอียดใบนัด', icon: Hospital, Component: HospitalInfo },
];

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('vaccines');
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen ">
        <p className="text-[#30266D] text-lg font-semibold animate-pulse">
          กำลังโหลดข้อมูล...
        </p>
      </div>
    );
  }

  const currentTab = TAB_LIST.find(tab => tab.id === activeTab);
  const CurrentComponent = currentTab?.Component || null;

  return (
    <div className="flex min-h-screen  text-gray-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white shadow-xl border-r border-gray-200 flex flex-col">
        <div className="px-8 py-8 border-b border-gray-100 text-center">
          <h1 className="text-3xl font-extrabold text-[#30266D] select-none">
            ระบบจองวัคซีน
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1">
            {TAB_LIST.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center w-full px-6 py-3 text-base font-semibold rounded-l-full transition
                    ${
                      activeTab === id
                        ? 'bg-gradient-to-r from-[#30266D] to-[#F9669D] text-white shadow-lg'
                        : 'text-gray-600 hover:bg-[#F3F4F6] hover:text-[#30266D]'
                    }`}
                  aria-current={activeTab === id ? 'page' : undefined}
                >
                  <Icon size={20} className="mr-3 flex-shrink-0" />
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

      {/* Main content */}
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
