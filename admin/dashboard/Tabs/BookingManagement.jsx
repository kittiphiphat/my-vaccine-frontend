'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import { motion, AnimatePresence } from 'framer-motion';
import BookingSettingSection from './BookingManagement/BookingSettingSection';
import VaccineTimeSlotSection from './BookingManagement/VaccineTimeSlotSection';
import VaccineServiceDaySection from './BookingManagement/VaccineServiceDaySection';

dayjs.locale('th');
dayjs.extend(buddhistEra);

const MySwal = withReactContent(Swal);

const tabs = [
  { id: 'booking', label: 'ตั้งค่าการจองล่วงหน้า' },
  { id: 'slot', label: 'ช่วงเวลาให้บริการ' },
  { id: 'serviceDay', label: 'วันที่ให้บริการ' },
];

export default function VaccineSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('booking');
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

  const fetchBookingSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/booking-settings?populate=*`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถโหลดข้อมูลการตั้งค่าการจองได้: ${error.message}`,
        timer: error.message === 'Unauthorized' ? 1500 : undefined,
        showConfirmButton: error.message !== 'Unauthorized',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      if (error.message === 'Unauthorized') {
        router.replace('/login');
      }
      return [];
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const res = await fetch(`${API_URL}/api/vaccine-time-slots?populate=*`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถโหลดข้อมูลช่วงเวลาให้บริการได้: ${error.message}`,
        timer: error.message === 'Unauthorized' ? 1500 : undefined,
        showConfirmButton: error.message !== 'Unauthorized',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      if (error.message === 'Unauthorized') {
        router.replace('/login');
      }
      return [];
    }
  };

  const fetchServiceDays = async () => {
    try {
      const res = await fetch(`${API_URL}/api/vaccine-service-days?populate=*`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถโหลดข้อมูลวันที่ให้บริการได้: ${error.message}`,
        timer: error.message === 'Unauthorized' ? 1500 : undefined,
        showConfirmButton: error.message !== 'Unauthorized',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      if (error.message === 'Unauthorized') {
        router.replace('/login');
      }
      return [];
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([fetchBookingSettings(), fetchTimeSlots(), fetchServiceDays()]);
      setLoading(false);
    };
    fetchAllData();
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-gray-50"
      role="main"
      aria-label="จัดการรูปแบบการให้บริการของวัคซีน"
    >
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-10 text-center text-[#30266D]">
        จัดการรูปแบบการให้บริการของวัคซีน
      </h2>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 border-4 border-[#30266D]/20 border-t-[#30266D] rounded-full animate-pulse"></div>
          <p className="mt-2 text-base font-medium text-[#30266D]">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-4 flex-wrap mb-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-6 py-3 rounded-xl font-semibold text-base transition-all duration-300 transform hover:scale-105 ${
                  activeTab === tab.id
                    ? 'bg-[#30266D] text-white shadow-md'
                    : 'text-[#30266D] border border-[#30266D]/50 bg-white hover:bg-[#F9669D]/10'
                }`}
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'booking' && <BookingSettingSection />}
              {activeTab === 'slot' && <VaccineTimeSlotSection />}
              {activeTab === 'serviceDay' && <VaccineServiceDaySection />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}