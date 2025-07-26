'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import Swal from 'sweetalert2';

dayjs.locale('th');

const ITEMS_PER_PAGE = 5;

export default function AppointmentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabFromUrl = searchParams.get('tab') || 'active';

  const [appointments, setAppointments] = useState([]);
  const [selectedTab, setSelectedTab] = useState(tabFromUrl);
  const [loading, setLoading] = useState(true);
  const [currentPageToday, setCurrentPageToday] = useState(1);
  const [currentPageUpcoming, setCurrentPageUpcoming] = useState(1);
  const [currentPageCancelled, setCurrentPageCancelled] = useState(1);

  useEffect(() => {
    setSelectedTab(tabFromUrl);
    setCurrentPageToday(1);
    setCurrentPageUpcoming(1);
    setCurrentPageCancelled(1);
  }, [tabFromUrl]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    const isNew = searchParams.get('new');
    if (isNew === 'true') {
      fetchAppointments();
      router.replace(`/appointment?tab=${selectedTab}`, { scroll: false });
    }
  }, [searchParams]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
        credentials: 'include',
      });

      if (!userRes.ok) {
        // ถ้าไม่ได้ล็อกอินหรือ token หมดอายุ ให้ redirect ไป login
        router.push('/login');
        return;
      }

      const userJson = await userRes.json();
      const userId = userJson.id || userJson.data?.id;

      if (!userId) {
        router.push('/login');
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate=patient.user,vaccine&filters[patient][user][id][$eq]=${userId}`,
        {
          credentials: 'include',
        }
      );
      const result = await res.json();
      setAppointments(result.data || []);
    } catch (error) {
      // ถ้า error อื่นๆ เช่น network ก็ alert ได้
      alert('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };


  const handleCancel = async (app) => {
    const confirm = await Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'คุณต้องการยกเลิกใบนัดนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ยืนยันการยกเลิก',
      cancelButtonText: 'ยกเลิก',
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
        throw new Error(errorText);
      }

      Swal.fire({
        icon: 'success',
        title: 'ยกเลิกใบนัดเรียบร้อยแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchAppointments();
      router.push('/appointment?tab=cancelled');
    } catch (error) {
      alert('ไม่สามารถยกเลิกได้');
    }
  };

  const formatTime = (t) => (t ? t.substring(0, 5) : '-');

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = dayjs(a.attributes.bookingDate);
    const dateB = dayjs(b.attributes.bookingDate);
    return dateA.diff(dateB);
  });

  const todayAppointments = sortedAppointments.filter(
    (app) => dayjs(app.attributes.bookingDate).isSame(dayjs(), 'day') && app.attributes.status !== 'cancelled'
  );

  const upcomingAppointments = sortedAppointments.filter(
    (app) => dayjs(app.attributes.bookingDate).isAfter(dayjs(), 'day') && app.attributes.status !== 'cancelled'
  );

  const cancelledAppointments = sortedAppointments.filter(
    (app) => app.attributes.status === 'cancelled'
  );

  const paginate = (items, page) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  };

  const renderAppointmentCard = (app) => (
    <div
      key={app.id}
      className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mt-4 flex flex-col md:flex-row justify-between md:items-center gap-y-4 gap-x-8"
    >
      <div className="flex-1 space-y-2">
        <h3 className="text-lg font-bold text-[#2C2E83]">
          {app.attributes.vaccine.data.attributes.title}
        </h3>
        <p className="text-gray-600 text-sm">
          {dayjs(app.attributes.bookingDate).locale('th').format('D MMMM')}
          {' '}{dayjs(app.attributes.bookingDate).year() + 543}
          • {formatTime(app.attributes.startTime)} - {formatTime(app.attributes.endTime)} น.
        </p>
        <span
          className={`inline-block text-xs px-3 py-1 rounded-full font-semibold
            ${
              app.attributes.status === 'cancelled'
                ? 'bg-red-100 text-red-700'
                : app.attributes.status === 'confirmed'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
        >
          {app.attributes.status === 'cancelled'
            ? 'ยกเลิกแล้ว'
            : app.attributes.status === 'confirmed'
            ? 'ยืนยันแล้ว'
            : 'รอการยืนยัน'}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 shrink-0 justify-end">
        <button
          onClick={() => router.push(`/appointment/${app.id}`)}
          className="text-white bg-[#2C2E83] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1e1e5a] transition cursor-pointer"
        >
          ดูใบนัด
        </button>

        {app.attributes.status !== 'cancelled' && (
          <button
            onClick={() => handleCancel(app)}
            className="bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-red-700 transition cursor-pointer"
          >
            ยกเลิก
          </button>
        )}
      </div>
    </div>
  );

  const renderPagination = (totalItems, currentPage, setPage) => {
    const pageCount = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (pageCount <= 1) return null;

    return (
      <div className="flex justify-center gap-4 mt-8 flex-wrap">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setPage(page)}
            className={`px-6 py-2 rounded-full font-semibold transition  cursor-pointer
              ${
                page === currentPage
                  ? 'bg-[#2C2E83] text-white'
                  : 'bg-white text-[#2C2E83] border border-[#2C2E83] hover:bg-[#2C2E83] hover:text-white'
              }`}
          >
            {page}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen font-sarabun p-6 max-w-5xl mx-auto">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-[#2C2E83]">รายการนัดวัคซีน</h1>

      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {['active', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setSelectedTab(tab);
              router.push(`/appointment?tab=${tab}`, { scroll: false });
            }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition cursor-pointer
              ${
                selectedTab === tab
                  ? 'bg-[#2C2E83] text-white'
                  : 'bg-white text-[#2C2E83] border border-[#2C2E83] hover:bg-[#2C2E83] hover:text-white'
              }`}
          >
            {tab === 'active' ? 'ใบนัดทั้งหมด' : 'ยกเลิกแล้ว'}
          </button>
        ))}
      </div>

      <main className="space-y-12">
        {loading ? (
          <p className="text-center text-[#2C2E83] text-lg font-semibold">กำลังโหลดข้อมูล...</p>
        ) : selectedTab === 'cancelled' ? (
          cancelledAppointments.length === 0 ? (
            <p className="text-center text-gray-500">ไม่มีรายการนัดที่ถูกยกเลิก</p>
          ) : (
            <>
              {paginate(cancelledAppointments, currentPageCancelled).map(renderAppointmentCard)}
              {renderPagination(cancelledAppointments.length, currentPageCancelled, setCurrentPageCancelled)}
            </>
          )
        ) : (
          <>
            <section>
              <h2 className="text-xl font-bold text-[#2C2E83] mb-4">นัดวันนี้</h2>
              {todayAppointments.length === 0 ? (
                <p className="text-gray-500">ไม่มีรายการนัดวันนี้</p>
              ) : (
                <>
                  {paginate(todayAppointments, currentPageToday).map(renderAppointmentCard)}
                  {renderPagination(todayAppointments.length, currentPageToday, setCurrentPageToday)}
                </>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C2E83] mb-4">นัดล่วงหน้า</h2>
              {upcomingAppointments.length === 0 ? (
                <p className="text-gray-500">ไม่มีรายการนัดล่วงหน้า</p>
              ) : (
                <>
                  {paginate(upcomingAppointments, currentPageUpcoming).map(renderAppointmentCard)}
                  {renderPagination(upcomingAppointments.length, currentPageUpcoming, setCurrentPageUpcoming)}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
