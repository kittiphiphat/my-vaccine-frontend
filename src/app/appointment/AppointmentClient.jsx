'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

export default function AppointmentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(searchParams.get('tab') || 'all');

  useEffect(() => {
    setSelectedTab(searchParams.get('tab') || 'all');
  }, [searchParams]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
        credentials: 'include',
      });

      if (!userRes.ok) {
        if (userRes.status === 401) {
          throw new Error('Unauthorized: กรุณาเข้าสู่ระบบ');
        }
        throw new Error(`เกิดข้อผิดพลาดขณะโหลดข้อมูลผู้ใช้: ${userRes.statusText}`);
      }

      const userJson = await userRes.json();
      const userId = userJson.id || userJson.data?.id;

      if (!userId) {
        throw new Error('ไม่พบ userId ในข้อมูลผู้ใช้');
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate=patient.user,vaccine&filters[patient][user][id][$eq]=${userId}&pagination[pageSize]=100`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        throw new Error(`เกิดข้อผิดพลาดขณะโหลดข้อมูลการจอง: ${res.statusText}`);
      }

      const result = await res.json();
      const fetchedAppointments = result.data || [];

      if (!Array.isArray(fetchedAppointments)) {
        throw new Error('ข้อมูลการจองไม่ใช่อาร์เรย์');
      }

      if (fetchedAppointments.length === 0) {
        MySwal.fire({
          icon: 'info',
          title: 'ไม่มีข้อมูลการจอง',
          text: 'ไม่พบใบนัดสำหรับผู้ใช้ปัจจุบัน',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-lg shadow-md border border-[#F9669D] bg-white/90 backdrop-blur-sm max-w-[90vw]',
            title: 'text-base font-semibold text-[#30266D]',
            htmlContainer: 'text-sm text-gray-600',
          },
        });
      }

      setAppointments(fetchedAppointments);
    } catch (error) {
      MySwal.fire({
        icon: 'error',
        title: 'โหลดข้อมูลไม่สำเร็จ',
        text: error.message || 'เกิดข้อผิดพลาดขณะโหลดข้อมูลการจอง',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-lg shadow-md border border-[#F9669D] bg-white/90 backdrop-blur-sm max-w-[90vw]',
          title: 'text-base font-semibold text-[#30266D]',
          htmlContainer: 'text-sm text-gray-600',
        },
      }).then(() => {
        if (error.message.includes('Unauthorized')) {
          router.push('/login');
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (app) => {
    const confirm = await MySwal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'คุณต้องการยกเลิกใบนัดนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-lg shadow-md border border-[#F9669D] bg-white/90 backdrop-blur-sm max-w-[90vw]',
        title: 'text-base font-semibold text-[#30266D]',
        htmlContainer: 'text-sm text-gray-600',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F9669D]/80 transition-all duration-200',
        cancelButton: 'bg-gray-100 text-[#30266D] px-4 py-2 rounded-lg text-sm font-medium border border-[#F9669D] hover:bg-[#F9669D]/10 transition-all duration-200',
      },
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings/${app.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { status: 'cancelled' } }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`ไม่สามารถยกเลิกได้: ${errorText}`);
      }

      await MySwal.fire({
        icon: 'success',
        title: 'ยกเลิกสำเร็จ',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-lg shadow-md border border-[#F9669D] bg-white/90 backdrop-blur-sm max-w-[90vw]',
          title: 'text-base font-semibold text-[#30266D]',
          htmlContainer: 'text-sm text-gray-600',
        },
      });

      await fetchAppointments();
      router.push('/appointment?tab=cancelled', { scroll: false });
    } catch (error) {
      MySwal.fire({
        icon: 'error',
        title: 'ไม่สามารถยกเลิกได้',
        text: error.message || 'เกิดข้อผิดพลาดขณะยกเลิกการจอง',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-lg shadow-md border border-[#F9669D] bg-white/90 backdrop-blur-sm max-w-[90vw]',
          title: 'text-base font-semibold text-[#30266D]',
          htmlContainer: 'text-sm text-gray-600',
        },
      });
    }
  };

  const formatTime = (t) => (t ? t.substring(0, 5) : '-');

const today = dayjs().tz('Asia/Bangkok').startOf('day');
const currentMonthStart = today.startOf('month');
const currentMonthEnd = today.endOf('month');

const sortedAppointments = [...appointments]
  .filter((app) => {
    const bookingDate = dayjs(app.attributes?.bookingDate).tz('Asia/Bangkok');
    return (
      app.attributes?.bookingDate &&
      bookingDate.isAfter(currentMonthStart) &&
      bookingDate.isBefore(currentMonthEnd)
    );
  })
  .sort((a, b) => {
    const dateA = dayjs(a.attributes?.bookingDate).tz('Asia/Bangkok');
    const dateB = dayjs(b.attributes?.bookingDate).tz('Asia/Bangkok');
    return dateA.diff(dateB);
  });

const latestAppointments = sortedAppointments.filter((app) => {
  const bookingDate = dayjs(app.attributes?.bookingDate).tz('Asia/Bangkok');
  return bookingDate.isSame(today, 'day') && app.attributes?.status !== 'cancelled';
});

const upcomingAppointments = sortedAppointments.filter((app) => {
  const bookingDate = dayjs(app.attributes?.bookingDate).tz('Asia/Bangkok');
  return bookingDate.isAfter(today) && app.attributes?.status !== 'cancelled';
});

const cancelledAppointments = sortedAppointments.filter(
  (app) => app.attributes?.status === 'cancelled'
);

const invalidAppointments = sortedAppointments.filter(
  (app) => !app.attributes?.bookingDate || !app.attributes?.status
);

  const renderAppointmentCard = (app) => (
    <motion.div
      key={app.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/90 backdrop-blur-sm border border-[#F9669D] rounded-lg shadow-sm p-4"
    >
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-[#30266D] truncate">
          {app.attributes?.vaccine?.data?.attributes?.title || 'ไม่ระบุชื่อวัคซีน'}
        </h3>
        <p className="text-sm text-gray-600">
          {app.attributes?.bookingDate
            ? `${dayjs(app.attributes.bookingDate).tz('Asia/Bangkok').locale('th').format('D MMMM')} ${
                dayjs(app.attributes.bookingDate).tz('Asia/Bangkok').year() + 543
              }`
            : 'ไม่ระบุวันที่'}{' '}
          {formatTime(app.attributes?.startTime)} - {formatTime(app.attributes?.endTime)} น.
        </p>
        <span
          className={`inline-block text-xs px-3 py-1 rounded-full font-medium
            ${
              app.attributes?.status === 'cancelled'
                ? 'bg-[#F9669D]/20 text-[#F9669D]'
                : app.attributes?.status === 'confirmed'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
        >
          {app.attributes?.status === 'cancelled'
            ? 'ยกเลิกแล้ว'
            : app.attributes?.status === 'confirmed'
            ? 'ยืนยันแล้ว'
            : 'รอการยืนยัน'}
        </span>
      </div>
      <div className="flex gap-3 mt-3 justify-end">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => router.push(`/appointment/${app.id}`)}
            className="bg-[#30266D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#30266D]/80 transition-all duration-200 min-w-[100px]"
            aria-label="ดูใบนัด"
          >
            ดูใบนัด
          </Button>
        </motion.div>
        {app.attributes?.status !== 'cancelled' && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => handleCancel(app)}
              className="bg-[#F9669D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F9669D]/80 transition-all duration-200 min-w-[100px]"
              aria-label="ยกเลิกใบนัด"
            >
              ยกเลิก
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen font-sarabun p-4 bg-gray-50">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl font-bold text-center mb-6 text-[#30266D]"
      >
        ใบนัดวัคซีน - {dayjs().tz('Asia/Bangkok').locale('th').format('MMMM')} {dayjs().tz('Asia/Bangkok').year() + 543}
      </motion.h1>

      <motion.div
        className="flex justify-center gap-4 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {['all', 'cancelled'].map((tab) => (
          <motion.div key={tab} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => {
                setSelectedTab(tab);
                router.push(`/appointment?tab=${tab}`, { scroll: false });
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${
                  selectedTab === tab
                    ? 'bg-[#30266D] text-white'
                    : 'bg-gray-100 text-[#30266D] border border-[#F9669D] hover:bg-[#F9669D]/10'
                }`}
              aria-label={tab === 'all' ? 'แสดงใบนัดทั้งหมด' : 'แสดงใบนัดที่ยกเลิกแล้ว'}
            >
              {tab === 'all' ? 'ใบนัดทั้งหมด' : 'ยกเลิกแล้ว'}
            </Button>
          </motion.div>
        ))}
      </motion.div>

      <main className="space-y-8 max-w-[600px] mx-auto">
        {loading ? (
          <motion.div
            className="flex flex-col items-center justify-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-6 h-6 border-3 border-[#F9669D] border-t-[#30266D] rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            ></motion.div>
            <p className="mt-2 text-sm font-semibold text-[#30266D]">กำลังโหลด...</p>
          </motion.div>
        ) : selectedTab === 'cancelled' ? (
          cancelledAppointments.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center text-gray-600 text-sm"
            >
              ไม่มีใบนัดที่ถูกยกเลิกในเดือนนี้
            </motion.p>
          ) : (
            <section>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-lg font-semibold text-[#30266D] mb-4"
              >
                ใบนัดที่ยกเลิก
              </motion.h2>
              <div className="space-y-4">
                {cancelledAppointments.map(renderAppointmentCard)}
              </div>
            </section>
          )
        ) : (
          <>
            {latestAppointments.length > 0 && (
              <section>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-lg font-semibold text-[#30266D] mb-4"
                >
                  ใบนัดล่าสุด
                </motion.h2>
                <div className="space-y-4">
                  {latestAppointments.map(renderAppointmentCard)}
                </div>
              </section>
            )}
            {upcomingAppointments.length > 0 && (
              <section>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-lg font-semibold text-[#30266D] mb-4"
                >
                  ใบนัดล่วงหน้า
                </motion.h2>
                <div className="space-y-4">
                  {upcomingAppointments.map(renderAppointmentCard)}
                </div>
              </section>
            )}
            {invalidAppointments.length > 0 && (
              <section>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-lg font-semibold text-[#F9669D] mb-4"
                >
                  ใบนัดที่มีปัญหา
                </motion.h2>
                <p className="text-sm text-gray-600 mb-4">
                  พบใบนัดบางรายการที่มีข้อมูลไม่สมบูรณ์ กรุณาติดต่อผู้ดูแลระบบ
                </p>
                <div className="space-y-4">
                  {invalidAppointments.map(renderAppointmentCard)}
                </div>
              </section>
            )}
            {latestAppointments.length === 0 &&
              upcomingAppointments.length === 0 &&
              invalidAppointments.length === 0 &&
              !loading && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center text-gray-600 text-sm"
                >
                  ไม่มีใบนัดในเดือนนี้
                </motion.p>
              )}
          </>
        )}
      </main>
    </div>
  );
}