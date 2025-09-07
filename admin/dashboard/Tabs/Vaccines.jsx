'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Input } from '@/components/ui/input';
import VaccineFormcreate from './Vaccines/VaccineFormcreate';
import VaccinesList from './Vaccines/VaccinesList';
import VaccineFormedit from './Vaccines/VaccineFormedit';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

export default function Vaccines() {
  const router = useRouter();
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`;

  const fetchVaccines = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}?populate=*&pagination[pageSize]=1000`,
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
      setVaccines(data.data || []);
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `โหลดข้อมูลวัคซีนไม่สำเร็จ: ${error.message}`,
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
      setVaccines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaccines();
  }, [router]);

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบวัคซีนนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
        title: 'text-xl font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-base text-gray-600 font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold hover:bg-gray-400 transition-all duration-300 transform hover:scale-105',
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      await fetchVaccines();
      await MySwal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'ลบข้อมูลวัคซีนสำเร็จ',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถลบวัคซีนได้: ${error.message}`,
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
    }
  };

  const handleSave = async (savedVaccine) => {
    setEditingVaccine(null);
    setIsCreating(false);
    await fetchVaccines();
  };

  const exportToExcel = () => {
    if (filteredVaccines.length === 0) {
      MySwal.fire({
        icon: 'warning',
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลวัคซีนสำหรับส่งออก',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      return;
    }

    const genderMap = {
      male: 'ชาย',
      female: 'หญิง',
      other: 'ทุกเพศ',
    };

    const excelData = filteredVaccines.map(({ attributes }, index) => ({
      ลำดับ: index + 1,
      ชื่อวัคซีน: attributes.title || '-',
      ช่วงอายุ: `${attributes.minAge} - ${attributes.maxAge}`,
      เพศ: genderMap[attributes.gender?.toLowerCase() || 'other'] || 'ทุกเพศ',
      จำนวนสูงสุด: attributes.maxQuota || '-',
      จองไปแล้ว: attributes.booked || 0,
      สถานะ: attributes.booked >= attributes.maxQuota ? 'เต็มแล้ว' : 'ว่าง',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายชื่อวัคซีน');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `รายชื่อวัคซีน${searchTerm ? `-${searchTerm}` : ''}-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`);
  };

  const filteredVaccines = vaccines.filter((v) =>
    v.attributes.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showHeaderAndSearch = !isCreating && editingVaccine === null;

  return (
    <div
      className="max-w-7xl mx-auto p-4 "
      role="main"
      aria-label="จัดการข้อมูลวัคซีน"
    >
      {showHeaderAndSearch && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold text-[#30266D]">
            จัดการข้อมูลวัคซีน
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Input
              placeholder="ค้นหาชื่อวัคซีน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[250px] rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
              aria-label="ค้นหาชื่อวัคซีน"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setEditingVaccine(null);
                }}
                className="px-4 py-2 rounded-xl font-semibold text-white bg-[#F9669D] shadow-md hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
                aria-label="เพิ่มวัคซีนใหม่"
              >
                + เพิ่มวัคซีนใหม่
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 rounded-xl font-semibold text-white bg-[#F9669D] shadow-md hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
                aria-label="ดาวน์โหลดรายชื่อวัคซีนเป็น Excel"
              >
                ดาวน์โหลด Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreating ? (
        <VaccineFormcreate onSave={handleSave} onCancel={() => setIsCreating(false)} />
      ) : editingVaccine !== null ? (
        <VaccineFormedit
          vaccine={editingVaccine}
          onSave={handleSave}
          onCancel={() => setEditingVaccine(null)}
        />
      ) : (
        <VaccinesList
          vaccines={filteredVaccines}
          onEdit={(v) => {
            setEditingVaccine(v);
            setIsCreating(false);
          }}
          onDelete={handleDelete}
          isLoading={loading}
        />
      )}
    </div>
  );
}