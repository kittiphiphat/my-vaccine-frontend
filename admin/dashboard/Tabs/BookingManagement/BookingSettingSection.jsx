'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import BookingSettingForm from './formedit/BookingSettingSectionform';
import BookingSettingFormCreate from './formcreate/bookingfromcreate';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

export default function BookingSettingSection({ setParentData }) {
  const [bookingSettings, setBookingSettings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings?populate=vaccine`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      const data = await res.json();
      setBookingSettings(data.data || []);
      if (setParentData) setParentData(data.data || []);
    } catch (error) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถดึงข้อมูลการตั้งค่าการจองได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          cancelButton: 'bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold text-base hover:bg-gray-400 transition-all duration-300 transform hover:scale-105',
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id) {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
        title: 'text-xl font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold text-base hover:bg-gray-400 transition-all duration-300 transform hover:scale-105',
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      await fetchData();
      MySwal.fire({
        title: 'ลบสำเร็จ',
        text: 'ข้อมูลถูกลบเรียบร้อยแล้ว',
        icon: 'success',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    } catch (error) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถลบข้อมูลได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    }
  }

  async function handleSave(data) {
    try {
      const method = data.id ? 'PUT' : 'POST';
      const url = data.id
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings/${data.id}`
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings`;

      const bodyData = {
        data: {
          advance_booking_days: data.advance_booking_days,
          prevent_last_minute_minutes: data.prevent_last_minute_minutes,
          slotDurationMinutes: data.slotDurationMinutes,
          is_enabled: data.is_enabled,
          vaccine: data.vaccine,
        },
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      setEditing(null);
      setCreating(false);
      await fetchData();
      MySwal.fire({
        title: 'บันทึกสำเร็จ',
        text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
        icon: 'success',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    } catch (error) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    }
  }

  const exportExcel = () => {
    if (!filteredSettings.length) {
      MySwal.fire({
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลสำหรับส่งออก',
        icon: 'warning',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      return;
    }

    const data = filteredSettings.map((item) => ({
      'ชื่อวัคซีน': item.attributes?.vaccine?.data?.attributes?.title || '-',
      'จองล่วงหน้า (วัน)': item.attributes?.advance_booking_days || 0,
      'เวลาการกั้นการจอง (นาที)': item.attributes?.prevent_last_minute_minutes || 0,
      'ระยะเวลาช่วงเวลา (นาที)': item.attributes?.slotDurationMinutes || 0,
      'สถานะ': item.attributes?.is_enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'การตั้งค่าการจอง');
    saveAs(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
      `การตั้งค่าการจอง-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`
    );
  };

  if (creating) {
    return (
      <BookingSettingFormCreate
        onCancel={() => setCreating(false)}
        onSave={handleSave}
      />
    );
  }

  if (editing !== null) {
    return (
      <BookingSettingForm
        initialData={editing}
        onCancel={() => setEditing(null)}
        onSave={handleSave}
      />
    );
  }

  const filteredSettings = bookingSettings.filter((item) => {
    const vaccineTitle = item.attributes.vaccine?.data?.attributes?.title || '';
    return vaccineTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-semibold text-[#30266D]">
          ตั้งค่าการจองล่วงหน้า
        </h3>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Input
            placeholder="ค้นหาวัคซีน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D]"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setCreating(true)}
              className="px-4 py-2 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
              aria-label="สร้างการจองล่วงหน้าใหม่"
            >
              + สร้างการจองล่วงหน้าใหม่
            </Button>
            <Button
              onClick={exportExcel}
              className="px-4 py-2 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
              aria-label="ดาวน์โหลด Excel"
            >
              ดาวน์โหลด Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-xl shadow-sm">
        <table className="w-full border-collapse border border-[#30266D]/50">
          <thead className="bg-[#30266D] text-white">
            <tr>
              <th className="py-3 px-4 text-left font-semibold">วัคซีน</th>
              <th className="py-3 px-4 text-center font-semibold">จองล่วงหน้า (วัน)</th>
              <th className="py-3 px-4 text-center font-semibold">เวลาการกั้นการจอง (นาที)</th>
              <th className="py-3 px-4 text-center font-semibold">ระยะเวลาช่วงเวลา (นาที)</th>
              <th className="py-3 px-4 text-center font-semibold">สถานะ</th>
              <th className="py-3 px-4 text-center font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-6">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-[#30266D]/30 border-t-[#30266D] rounded-full animate-pulse"></div>
                    <p className="mt-2 text-base font-medium text-[#30266D]">
                      กำลังโหลดข้อมูล...
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredSettings.length > 0 ? (
              filteredSettings.map(({ id, attributes }, index) => (
                <tr
                  key={id}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-[#F9669D]/10 transition-colors duration-200`}
                >
                  <td className="py-3 px-4 font-medium text-[#30266D]">
                    {attributes.vaccine?.data?.attributes?.title || '-'}
                  </td>
                  <td className="py-3 px-4 text-center text-[#30266D]">
                    {attributes.advance_booking_days}
                  </td>
                  <td className="py-3 px-4 text-center text-[#30266D]">
                    {attributes.prevent_last_minute_minutes}
                  </td>
                  <td className="py-3 px-4 text-center text-[#30266D]">
                    {attributes.slotDurationMinutes}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {attributes.is_enabled ? (
                      <span
                        className="inline-block px-3 py-1 rounded-full font-semibold bg-green-100 text-green-800 select-none"
                      >
                        เปิดใช้งาน
                      </span>
                    ) : (
                      <span
                        className="inline-block px-3 py-1 rounded-full font-semibold bg-red-100 text-red-800 select-none"
                      >
                        ปิดใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center space-x-2">
                    <Button
                      onClick={() => setEditing({ id, ...attributes })}
                      className="px-3 py-1 bg-[#30266D] text-white rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105"
                      aria-label="แก้ไขการตั้งค่าการจอง"
                    >
                      แก้ไข
                    </Button>
                    <Button
                      onClick={() => handleDelete(id)}
                      className="px-3 py-1 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
                      aria-label="ลบการตั้งค่าการจอง"
                    >
                      ลบ
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-[#30266D]">
                  ไม่พบรายการจองล่วงหน้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}