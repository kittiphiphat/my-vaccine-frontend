'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Input } from '@/components/ui/input';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import PatientsEdit from './Patients/Patientsedit';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth || typeof dateOfBirth !== 'string') {
    MySwal.fire({
      icon: 'warning',
      title: 'ข้อมูลไม่ถูกต้อง',
      text: 'ไม่มีหรือระบุวันเกิดไม่ถูกต้อง',
      toast: true,
      position: 'top-end',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: {
        popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-4',
        title: 'text-base font-bold text-[#30266D] mb-2',
        htmlContainer: 'text-sm text-gray-600 font-medium',
      },
    });
    return 'ไม่ระบุ';
  }

  let birthDate = dayjs(dateOfBirth, ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY'], true).tz('Asia/Bangkok');
  if (!birthDate.isValid()) {
    birthDate = dayjs(dateOfBirth).tz('Asia/Bangkok');
  }

  if (!birthDate.isValid()) {
    MySwal.fire({
      icon: 'warning',
      title: 'ข้อมูลไม่ถูกต้อง',
      text: 'รูปแบบวันเกิดไม่ถูกต้อง',
      toast: true,
      position: 'top-end',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: {
        popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-4',
        title: 'text-base font-bold text-[#30266D] mb-2',
        htmlContainer: 'text-sm text-gray-600 font-medium',
      },
    });
    return 'ไม่ระบุ';
  }

  const currentDate = dayjs().tz('Asia/Bangkok');
  let age = currentDate.year() - birthDate.year();
  const hasPassedBirthday = currentDate.month() > birthDate.month() ||
    (currentDate.month() === birthDate.month() && currentDate.date() >= birthDate.date());

  if (!hasPassedBirthday) {
    age -= 1;
  }

  if (age < 0) {
    MySwal.fire({
      icon: 'warning',
      title: 'ข้อมูลไม่ถูกต้อง',
      text: 'วันเกิดอยู่ในอนาคต',
      toast: true,
      position: 'top-end',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: {
        popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-4',
        title: 'text-base font-bold text-[#30266D] mb-2',
        htmlContainer: 'text-sm text-gray-600 font-medium',
      },
    });
    return 'ไม่ระบุ';
  }

  return age;
};

export default function Patients() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPatient, setEditingPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients`;

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?populate=*`, {
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
      setPatients(data.data || []);
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถโหลดข้อมูลผู้ป่วยได้: ${error.message}`,
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [router]);

  function formatPhoneNumber(phone) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }

  const exportToExcel = () => {
    if (!filteredPatients.length) {
      MySwal.fire({
        icon: 'warning',
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลผู้ป่วยสำหรับส่งออก',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      return;
    }
    const excelData = filteredPatients.map(({ attributes }, index) => {
      const age = calculateAge(attributes.birth_date);
      return {
        ลำดับ: index + 1,
        ชื่อ: attributes.first_name,
        นามสกุล: attributes.last_name,
        เพศ: attributes.gender === 'female' ? 'หญิง' : 'ชาย',
        อายุ: age === 'ไม่ระบุ' ? 'ไม่ระบุ' : `${age} ปี`,
        เบอร์โทร: formatPhoneNumber(attributes.phone),
        อีเมล: attributes.email ?? '-',
        ที่อยู่: attributes.address ?? '-',
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายชื่อผู้ป่วย');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `รายชื่อผู้ป่วย${searchTerm ? `-${searchTerm}` : ''}-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`);
  };

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
      title: 'ยืนยันการยกเลิก',
      text: 'คุณต้องการยกเลิกผู้ป่วยรายนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยกเลิก',
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          data: { status: 'cancelled' },
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      await MySwal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'ผู้ป่วยถูกยกเลิกเรียบร้อยแล้ว',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      fetchPatients();
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถดำเนินการได้: ${error.message}`,
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

  const handleSave = () => {
    setEditingPatient(null);
    fetchPatients();
  };

  const handleCancel = () => {
    setEditingPatient(null);
  };

  const filteredPatients = patients.filter(({ attributes }) => {
    const fullName = `${attributes.first_name} ${attributes.last_name}`.toLowerCase();
    return (
      attributes.status !== 'cancelled' &&
      fullName.includes(searchTerm.toLowerCase())
    );
  });

  if (editingPatient) {
    return (
      <div className="max-w-6xl mx-auto p-4 bg-white rounded-xl shadow-lg border border-[#30266D]/50">
        <PatientsEdit
          patient={editingPatient}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div
      className="max-w-6xl mx-auto p-4 space-y-6 "
      role="main"
      aria-label="จัดการข้อมูลผู้ป่วย"
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-[#30266D]">จัดการข้อมูลผู้ป่วย</h2>
        <div className="flex flex-row items-center gap-2 w-full md:w-auto">
          <Input
            placeholder="ค้นหาชื่อผู้ป่วย..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[250px] rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
            aria-label="ค้นหาชื่อผู้ป่วย"
          />
          <button
            onClick={exportToExcel}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-[#F9669D] shadow-md hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
            aria-label="ดาวน์โหลดรายชื่อผู้ป่วยเป็น Excel"
          >
            ดาวน์โหลด Excel
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-[#30266D]/20 border-t-[#30266D] rounded-full animate-pulse"></div>
          <p className="mt-2 text-sm font-medium text-[#30266D]">กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <p className="text-center text-base font-medium text-gray-600">
          {searchTerm
            ? `ไม่พบผู้ป่วยที่ตรงกับคำค้น: "${searchTerm}"`
            : 'ไม่พบข้อมูลผู้ป่วย'}
        </p>
      ) : (
        <div className="overflow-x-auto shadow-lg">
          <table
            className="w-full border-collapse rounded-xl overflow-hidden"
            role="grid"
            aria-label="ตารางผู้ป่วย"
          >
            <thead className="bg-[#30266D]">
              <tr>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  ชื่อ-นามสกุล
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  เพศ
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  อายุ
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  เบอร์โทร
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  อีเมล
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  ที่อยู่
                </th>
                <th className="p-3 text-center font-semibold text-sm text-white" scope="col">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(({ id, attributes }, index) => (
                <tr
                  key={id}
                  className={`border-t border-[#30266D]/20 transition duration-200 hover:bg-[#F9669D]/10 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {attributes.first_name} {attributes.last_name}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        attributes.gender === 'female'
                          ? 'bg-red-100 text-[#30266D]'
                          : 'bg-blue-100 text-[#30266D]'
                      }`}
                    >
                      {attributes.gender === 'female' ? 'หญิง' : 'ชาย'}
                    </span>
                  </td>
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {calculateAge(attributes.birth_date) === 'ไม่ระบุ' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">ข้อมูลวันเกิดไม่ถูกต้อง</span>
                        <button
                          onClick={() => setEditingPatient({ id, ...attributes })}
                          className="text-xs text-[#F9669D] hover:underline"
                          aria-label={`แก้ไขวันเกิดของ ${attributes.first_name} ${attributes.last_name}`}
                        >
                          แก้ไข
                        </button>
                      </div>
                    ) : (
                      `${calculateAge(attributes.birth_date)} ปี`
                    )}
                  </td>
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {formatPhoneNumber(attributes.phone)}
                  </td>
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {attributes.email || '-'}
                  </td>
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {attributes.address || '-'}
                  </td>
                  <td className="p-3 text-center space-x-2">
                    <button
                      onClick={() => setEditingPatient({ id, ...attributes })}
                      className="inline-block px-3 py-1 rounded-xl text-sm font-semibold text-white bg-[#F9669D] shadow-sm hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
                      aria-label={`แก้ไขผู้ป่วย ${attributes.first_name} ${attributes.last_name}`}
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(id)}
                      className="inline-block px-3 py-1 rounded-xl text-sm font-semibold text-white bg-red-600 shadow-sm hover:bg-red-600/80 transition-all duration-300 transform hover:scale-105"
                      aria-label={`ลบผู้ป่วย ${attributes.first_name} ${attributes.last_name}`}
                    >
                      ลบ
                    </button>
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