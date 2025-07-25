'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import BookingSettingForm from './formedit/BookingSettingSectionform';
import BookingSettingFormCreate from './formcreate/bookingfromcreate';
import { Input } from '@/components/ui/input';

const MySwal = withReactContent(Swal);

export default function BookingSettingSection() {
  const [bookingSettings, setBookingSettings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true); // 🔧 เพิ่มสถานะโหลด

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setIsLoading(true); // เริ่มโหลด
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings?populate=vaccine`, {
        credentials: 'include',
      });
      const data = await res.json();
      setBookingSettings(data.data || []);
    } catch (error) {
      console.error('Error fetching booking settings:', error);
    } finally {
      setIsLoading(false); // จบโหลด
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
    });

    if (!result.isConfirmed) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchData();
      MySwal.fire('ลบแล้ว!', 'ข้อมูลถูกลบเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error deleting setting:', error);
      MySwal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
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

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyData),
      });

      setEditing(null);
      setCreating(false);
      fetchData();
      MySwal.fire('บันทึกสำเร็จ', '', 'success');
    } catch (error) {
      console.error('Error saving setting:', error);
      MySwal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  }

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
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h3 className="text-xl font-semibold text-[#30266D]">ตั้งค่าการจองล่วงหน้า</h3>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Input
            placeholder="ค้นหาวัคซีน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[250px]"
          />
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-[#30266D] hover:bg-[#221c59]  text-white rounded-md cursor-pointer"
          >
            + สร้างการจองล่วงหน้าใหม่
          </button>
        </div>
      </div>

      <table className="w-full border-collapse border border-gray-200 shadow-sm rounded-lg overflow-hidden">
        <thead className="bg-[#30266D] text-white select-none">
          <tr>
            <th className="py-3 px-4 text-left font-semibold">วัคซีน</th>
            <th className="py-3 px-4 text-center font-semibold">จองล่วงหน้า (วัน)</th>
            <th className="py-3 px-4 text-center font-semibold">เวลาการกั้นการจอง (นาที)</th>
            <th className="py-3 px-4 text-center font-semibold">สถานะ</th>
            <th className="py-3 px-4 text-center font-semibold">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={5} className="text-center text-gray-500 py-6 select-none">
                กำลังโหลดข้อมูล...
              </td>
            </tr>
          ) : filteredSettings.length > 0 ? (
            filteredSettings.map(({ id, attributes }, index) => (
              <tr
                key={id}
                className={`${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-gray-100 transition-colors`}
              >
                <td className="py-3 px-4 font-medium text-gray-700">{attributes.vaccine?.data?.attributes?.title || '-'}</td>
                <td className="py-3 px-4 text-center text-gray-700">{attributes.advance_booking_days}</td>
                <td className="py-3 px-4 text-center text-gray-700">{attributes.prevent_last_minute_minutes}</td>
                <td className="py-3 px-4 text-center">
                  {attributes.is_enabled ? (
                    <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold select-none">
                      เปิดใช้งาน
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-600 font-semibold select-none">
                      ปิด
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center space-x-2">
                  <button
                    onClick={() => setEditing({ id, ...attributes })}
                    className="inline-block px-3 py-1 rounded-md bg-[#30266D] text-white font-semibold hover:bg-[#4b3b8a] transition cursor-pointer"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(id)}
                    className="inline-block px-3 py-1 rounded-md bg-[#F9669D] text-white font-semibold hover:bg-[#e24d8a] transition cursor-pointer"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center text-gray-500 py-6 select-none">
                ไม่พบรายการจองล่วงหน้า
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
