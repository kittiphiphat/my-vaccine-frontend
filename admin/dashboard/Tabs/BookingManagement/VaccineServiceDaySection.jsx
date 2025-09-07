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
import VaccineServiceDayForm from './formedit/VaccineServiceDaySectionform';
import VaccineServiceDayFormCreate from './formcreate/VaccineServiceDaySectionformCreate';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

export default function VaccineServiceDaySection({ setParentData }) {
  const [serviceDays, setServiceDays] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchServiceDays();
  }, []);

  async function fetchServiceDays() {
    try {
      setIsLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days?populate=vaccine`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      const data = await res.json();
      setServiceDays(data.data || []);
      if (setParentData) setParentData(data.data || []);
    } catch (error) {
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถดึงข้อมูลวันให้บริการได้: ${error.message}`,
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
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบวันให้บริการนี้?',
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      await fetchServiceDays();
      MySwal.fire({
        title: 'ลบสำเร็จ',
        text: 'วันให้บริการถูกลบเรียบร้อยแล้ว',
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
        text: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถลบวันให้บริการได้: ${error.message}`,
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
    if (!filteredServiceDays.length) {
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

    const data = filteredServiceDays.map((item) => {
      let daysArray = [];
      if (Array.isArray(item.attributes.day_of_week)) {
        daysArray = item.attributes.day_of_week;
      } else if (typeof item.attributes.day_of_week === 'string') {
        try {
          daysArray = JSON.parse(item.attributes.day_of_week);
          if (!Array.isArray(daysArray)) daysArray = [];
        } catch {
          daysArray = [];
        }
      }
      const thaiDays = isEveryDay(daysArray)
        ? 'ทุกวัน'
        : daysArray.map((d) => dayNamesTH[d]).filter(Boolean).join(' ');

      return {
        'ชื่อวัคซีน': item.attributes?.vaccine?.data?.attributes?.title || '-',
        'วันที่ให้บริการ': thaiDays || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'วันที่ให้บริการ');
    saveAs(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
      `วันที่ให้บริการ-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`
    );
  };

  const dayNamesTH = {
    0: 'วันอาทิตย์',
    1: 'วันจันทร์',
    2: 'วันอังคาร',
    3: 'วันพุธ',
    4: 'วันพฤหัสบดี',
    5: 'วันศุกร์',
    6: 'วันเสาร์',
  };

  const isEveryDay = (daysArray) =>
    daysArray.length === 7 && [0, 1, 2, 3, 4, 5, 6].every((d) => daysArray.includes(d));

  if (creatingItem) {
    return (
      <VaccineServiceDayFormCreate
        onCancel={() => setCreatingItem(false)}
        onSave={() => {
          setCreatingItem(false);
          fetchServiceDays();
        }}
      />
    );
  }

  if (editingItem !== null) {
    return (
      <VaccineServiceDayForm
        initialData={editingItem}
        onCancel={() => setEditingItem(null)}
        onSave={() => {
          setEditingItem(null);
          fetchServiceDays();
        }}
      />
    );
  }

  const filteredServiceDays = serviceDays.filter(({ attributes }) => {
    const vaccineName = attributes.vaccine?.data?.attributes?.title || '';
    return vaccineName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h3 className="text-xl font-semibold text-[#30266D]">
          จัดการวันให้บริการวัคซีน
        </h3>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Input
            placeholder="ค้นหาชื่อวัคซีน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D]"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setCreatingItem(true)}
              className="px-4 py-2 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
              aria-label="สร้างวันให้บริการใหม่"
            >
              + สร้างวันให้บริการใหม่
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
              <th className="p-3 text-center font-semibold">วันที่ให้บริการ</th>
              <th className="p-3 text-left font-semibold">วัคซีนที่เกี่ยวข้อง</th>
              <th className="p-3 text-center font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="text-center py-6">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-[#30266D]/30 border-t-[#30266D] rounded-full animate-pulse"></div>
                    <p className="mt-2 text-base font-medium text-[#30266D]">
                      กำลังโหลดข้อมูล...
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredServiceDays.length > 0 ? (
              filteredServiceDays.map(({ id, attributes }) => {
                let daysArray = [];
                if (Array.isArray(attributes.day_of_week)) {
                  daysArray = attributes.day_of_week;
                } else if (typeof attributes.day_of_week === 'string') {
                  try {
                    daysArray = JSON.parse(attributes.day_of_week);
                    if (!Array.isArray(daysArray)) daysArray = [];
                  } catch {
                    daysArray = [];
                  }
                }
                const thaiDays = isEveryDay(daysArray)
                  ? 'ทุกวัน'
                  : daysArray.map((d) => dayNamesTH[d]).filter(Boolean).join(' ');
                const vaccine = attributes.vaccine?.data;

                return (
                  <tr
                    key={id}
                    className="border-b border-[#30266D]/20 hover:bg-[#F9669D]/10 transition-colors duration-200"
                  >
                    <td className="p-3 text-center font-medium text-[#30266D]">
                      {thaiDays || '-'}
                    </td>
                    <td className="p-3 max-w-sm">
                      {vaccine ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-sm font-semibold bg-red-300 text-[#30266D]"
                          title={vaccine.attributes?.title}
                        >
                          {vaccine.attributes?.title}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">ไม่มีวัคซีน</span>
                      )}
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <Button
                        onClick={() =>
                          setEditingItem({
                            id,
                            day_of_week: daysArray,
                            vaccine: vaccine ? { id: vaccine.id, attributes: vaccine.attributes } : null,
                          })
                        }
                        className="px-4 py-1 bg-[#30266D] text-white rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105"
                        aria-label="แก้ไขวันให้บริการ"
                      >
                        แก้ไข
                      </Button>
                      <Button
                        onClick={() => handleDelete(id)}
                        className="px-4 py-1 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
                        aria-label="ลบวันให้บริการ"
                      >
                        ลบ
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-6 text-[#30266D]">
                  ไม่พบรายการวันให้บริการ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}