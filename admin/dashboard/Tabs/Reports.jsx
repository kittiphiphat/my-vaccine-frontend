'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import StatisticsTab from './Reports/StatisticsTab';
import ReportTab from './Reports/ReportTab';

const MySwal = withReactContent(Swal);

export default function VaccineDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState('statistics');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
          throw new Error(message);
        }

        setLoading(false);
      } catch (error) {
        await MySwal.fire({
          icon: 'error',
          title: 'กรุณาเข้าสู่ระบบ',
          text: `เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่: ${error.message}`,
          timer: 1500,
          showConfirmButton: false,
          customClass: {
            popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
            title: 'text-xl font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-base text-gray-600 font-medium mb-4',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          },
        });
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#30266D]/20 border-t-[#30266D] rounded-full animate-pulse"></div>
          <p className="mt-3 text-lg font-medium text-[#30266D]">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50"
      role="main"
      aria-label="แดชบอร์ดวัคซีน"
    >
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList
          className="w-full max-w-2xl mx-auto mb-8 bg-white border-2 border-[#30266D]/50 rounded-3xl p-2"
          role="tablist"
          aria-label="แท็บแดชบอร์ดวัคซีน"
        >
          <TabsTrigger
            value="statistics"
            className="flex-1 text-center py-3 px-6 rounded-2xl text-xl font-semibold text-[#30266D] bg-transparent hover:bg-[#F9669D]/20 data-[state=active]:bg-[#30266D] data-[state=active]:text-white data-[state=active]:scale-105 transition-all duration-300"
            role="tab"
            aria-selected={tab === 'statistics'}
            aria-controls="statistics-panel"
          >
            สถิติ
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className="flex-1 text-center py-3 px-6 rounded-2xl text-xl font-semibold text-[#30266D] bg-transparent hover:bg-[#F9669D]/20 data-[state=active]:bg-[#30266D] data-[state=active]:text-white data-[state=active]:scale-105 transition-all duration-300"
            role="tab"
            aria-selected={tab === 'report'}
            aria-controls="report-panel"
          >
            รายงาน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statistics" id="statistics-panel" role="tabpanel" aria-labelledby="statistics-tab">
          <StatisticsTab />
        </TabsContent>
        <TabsContent value="report" id="report-panel" role="tabpanel" aria-labelledby="report-tab">
          <ReportTab />
        </TabsContent>
      </Tabs>
    </motion.main>
  );
}