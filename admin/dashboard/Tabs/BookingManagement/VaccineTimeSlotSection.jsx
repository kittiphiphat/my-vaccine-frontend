'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import VaccineTimeSlotForm from './formedit/VaccineTimeSlotForm';
import VaccineTimeSlotFormCreate from './formcreate/VaccineTimeSlotFormCreate';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

function timeToMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    console.warn(`Invalid time for conversion: ${time}`);
    return 0;
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isTimeOverlap(startTime, endTime, allSlots, currentId = null) {
  if (!startTime || !endTime || !/^\d{2}:\d{2}(:\d{2})?$/.test(startTime) || !/^\d{2}:\d{2}(:\d{2})?$/.test(endTime)) {
    console.warn(`Invalid time format: startTime=${startTime}, endTime=${endTime}`);
    return { isOverlap: false, conflicts: [] };
  }

  const startMinutes = timeToMinutes(startTime.slice(0, 5));
  const endMinutes = timeToMinutes(endTime.slice(0, 5));

  if (startMinutes >= endMinutes) {
    console.warn(`Invalid time range: startTime=${startTime}, endTime=${endTime}`);
    return { isOverlap: false, conflicts: [] };
  }

  const conflicts = allSlots
    .filter((slot) => slot.id !== currentId)
    .filter((slot) => {
      if (!slot.attributes?.startTime || !slot.attributes?.endTime || !slot.attributes?.vaccine?.data?.id) {
        console.warn(`Slot ID ${slot.id} has invalid data:`, JSON.stringify(slot.attributes, null, 2));
        return false;
      }
      const slotStart = timeToMinutes(slot.attributes.startTime.slice(0, 5));
      const slotEnd = timeToMinutes(slot.attributes.endTime.slice(0, 5));
      return (
        slotStart && slotEnd &&
        startMinutes < slotEnd &&
        endMinutes > slotStart &&
        !(startMinutes === slotEnd || endMinutes === slotStart)
      );
    })
    .map((slot) => ({
      id: slot.id,
      startTime: slot.attributes.startTime?.slice(0, 5) || '-',
      endTime: slot.attributes.endTime?.slice(0, 5) || '-',
      vaccine: slot.attributes.vaccine?.data?.attributes?.title || '-',
    }));

  return { isOverlap: conflicts.length > 0, conflicts };
}

export default function VaccineTimeSlotSection({ setParentData }) {
  const router = useRouter();
  const [timeSlots, setTimeSlots] = useState([]);
  const [editingSlot, setEditingSlot] = useState(null);
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  async function fetchTimeSlots() {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots?populate[vaccine][fields][0]=title&populate[vaccine][fields][1]=serviceStartTime&populate[vaccine][fields][2]=serviceEndTime`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      const data = await res.json();
      console.log('Fetched timeSlots:', JSON.stringify(data.data, null, 2));
      setTimeSlots(data.data || []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถโหลดข้อมูลช่วงเวลาให้บริการได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80',
        },
      });
      if (error.message === 'Unauthorized') {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (setParentData) {
      setParentData({ filteredSlots, searchTerm });
    }
  }, [timeSlots, searchTerm]);

  async function handleDelete(id) {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบช่วงเวลานี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
        title: 'text-xl font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80',
        cancelButton: 'bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold hover:bg-gray-400',
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      fetchTimeSlots();
      MySwal.fire({
        title: 'ลบสำเร็จ',
        text: 'ช่วงเวลาถูกลบเรียบร้อยแล้ว',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
        },
      });
    } catch (error) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถลบช่วงเวลาได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80',
        },
      });
      if (error.message === 'Unauthorized') {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        router.push('/login');
      }
    }
  }

  const handleCancelEdit = () => setEditingSlot(null);
  const handleSaveEdit = () => {
    setEditingSlot(null);
    fetchTimeSlots();
  };

  const handleCancelCreate = () => setCreatingSlot(false);
  const handleSaveCreate = () => {
    setCreatingSlot(false);
    fetchTimeSlots();
  };

  const filteredSlots = timeSlots
    .filter(({ attributes }) => {
      const title = attributes.vaccine?.data?.attributes?.title || '';
      return title.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .reduce((acc, slot) => {
      if (!slot.attributes?.startTime || !slot.attributes?.endTime || !slot.attributes?.vaccine?.data?.id) {
        console.warn(`Slot ID ${slot.id} has incomplete data:`, JSON.stringify(slot.attributes, null, 2));
        return acc;
      }

      const vaccineId = slot.attributes.vaccine.data.id;
      const allSlotsForVaccine = timeSlots.filter(
        (s) => s.attributes.vaccine?.data?.id === vaccineId
      );
      const { isOverlap, conflicts } = isTimeOverlap(
        slot.attributes.startTime.slice(0, 5),
        slot.attributes.endTime.slice(0, 5),
        allSlotsForVaccine,
        slot.id
      );

      if (isOverlap) {
        console.log(`Slot ID ${slot.id} overlaps:`, {
          startTime: slot.attributes.startTime,
          endTime: slot.attributes.endTime,
          vaccine: slot.attributes.vaccine.data.attributes.title,
          conflicts: JSON.stringify(conflicts, null, 2),
        });
        const allConflictingIds = [slot.id, ...conflicts.map(c => c.id)];
        if (slot.id === Math.min(...allConflictingIds)) {
          acc.push(slot);
        }
      } else {
        acc.push(slot);
      }

      return acc;
    }, []);

  console.log('Filtered Slots:', JSON.stringify(filteredSlots.map(slot => ({
    id: slot.id,
    vaccine: slot.attributes.vaccine?.data?.attributes?.title,
    startTime: slot.attributes.startTime,
    endTime: slot.attributes.endTime,
  })), null, 2));

  const exportToExcel = (filteredData, searchTerm) => {
    if (!filteredData || filteredData.length === 0) {
      MySwal.fire({
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลช่วงเวลาให้บริการสำหรับส่งออก',
        icon: 'warning',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80',
        },
      });
      return;
    }
    const excelData = filteredData.map(({ attributes }, index) => ({
      ลำดับ: index + 1,
      วัคซีน: attributes.vaccine?.data?.attributes?.title || '-',
      เวลาเริ่ม: attributes.startTime?.slice(0, 5) || '-',
      เวลาสิ้นสุด: attributes.endTime?.slice(0, 5) || '-',
      จำนวนที่รับ: attributes.quota || '-',
      สถานะ: attributes.is_enabled ? 'เปิดใช้งาน' : 'ปิด',
    }));
    const worksheetName = 'ช่วงเวลาให้บริการ';
    const fileName = `ช่วงเวลาให้บริการ${searchTerm ? `-${searchTerm}` : ''}-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`;

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.sheet_add_aoa(worksheet, [['ลำดับ', 'วัคซีน', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'จำนวนที่รับ', 'สถานะ']], { origin: 'A1' });
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
  };

  if (editingSlot !== null) {
    const vaccineId = editingSlot.vaccine?.data?.id;
    const allSlotsForVaccine = timeSlots.filter(
      (slot) => slot.attributes.vaccine?.data?.id === vaccineId
    );
    return (
      <VaccineTimeSlotForm
        initialData={editingSlot}
        onCancel={handleCancelEdit}
        onSave={handleSaveEdit}
        allSlots={allSlotsForVaccine}
        isTimeOverlap={isTimeOverlap}
      />
    );
  }

  if (creatingSlot) {
    return (
      <VaccineTimeSlotFormCreate
        onCancel={handleCancelCreate}
        onSave={handleSaveCreate}
        allSlots={timeSlots}
        isTimeOverlap={isTimeOverlap}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6 sm:p-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h3 className="text-xl font-semibold text-[#30266D]">
          จัดการช่วงเวลาให้บริการ
        </h3>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Input
            placeholder="ค้นหาชื่อวัคซีน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D]"
            aria-label="ค้นหาชื่อวัคซีน"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setCreatingSlot(true)}
              className="px-4 py-2 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
              aria-label="สร้างช่วงเวลาใหม่"
            >
              + สร้างช่วงเวลาใหม่
            </Button>
            <Button
              onClick={() => exportToExcel(filteredSlots, searchTerm)}
              className="px-4 py-2 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
              aria-label="ดาวน์โหลด Excel"
            >
              ดาวน์โหลด Excel
            </Button>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 border-4 border-[#30266D]/30 border-t-[#30266D] rounded-full animate-pulse"></div>
          <p className="mt-2 text-base font-medium text-[#30266D]">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      ) : filteredSlots.length === 0 ? (
        <p className="text-center text-base font-medium py-6 text-[#30266D]">
          ไม่พบช่วงเวลาให้บริการที่ไม่ทับซ้อนหรือตรงกับคำค้นหา
        </p>
      ) : (
        <div className="relative overflow-x-auto rounded-xl shadow-lg">
          <table className="w-full border-collapse border border-[#30266D]/50">
            <thead className="bg-[#30266D] text-white">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-sm" scope="col">วัคซีน</th>
                <th className="py-3 px-4 text-center font-semibold text-sm" scope="col">เวลาเริ่ม</th>
                <th className="py-3 px-4 text-center font-semibold text-sm" scope="col">เวลาสิ้นสุด</th>
                <th className="py-3 px-4 text-center font-semibold text-sm" scope="col">จำนวนที่รับ</th>
                <th className="py-3 px-4 text-center font-semibold text-sm" scope="col">สถานะ</th>
                <th className="py-3 px-4 text-center font-semibold text-sm" scope="col">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlots.map(({ id, attributes }, index) => (
                <tr
                  key={id}
                  className={cn(
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                    'border-b border-[#30266D]/20 hover:bg-[#F9669D]/10 transition-colors duration-200'
                  )}
                >
                  <td className="py-3 px-4 font-medium text-[#30266D]">
                    {attributes.vaccine?.data?.attributes?.title || '-'}
                  </td>
                  <td className="py-3 px-4 text-center text-[#30266D]">
                    {attributes.startTime?.slice(0, 5) || '-'}
                  </td>
                  <td className="py-3 px-4 text-center text-[#30266D]">
                    {attributes.endTime?.slice(0, 5) || '-'}
                  </td>
                  <td className="py-3 px-4 text-center text-[#30266D]">
                    {attributes.quota || '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {attributes.is_enabled ? (
                      <span className="inline-block px-3 py-1 rounded-xl bg-green-100 text-green-800 font-semibold select-none">
                        เปิดใช้งาน
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-xl bg-red-100 text-red-600 font-semibold select-none">
                        ปิด
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center space-x-2">
                    <Button
                      onClick={() => setEditingSlot({ id, ...attributes })}
                      className="px-3 py-1 bg-[#30266D] text-white rounded-xl font-semibold hover:bg-[#30266D]/80"
                      aria-label={`แก้ไขช่วงเวลา ${attributes.vaccine?.data?.attributes?.title || 'ไม่ระบุ'}`}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      onClick={() => handleDelete(id)}
                      className="px-3 py-1 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80"
                      aria-label={`ลบช่วงเวลา ${attributes.vaccine?.data?.attributes?.title || 'ไม่ระบุ'}`}
                    >
                      ลบ
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}