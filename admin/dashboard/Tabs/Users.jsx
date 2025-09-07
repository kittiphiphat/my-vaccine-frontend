'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Input } from '@/components/ui/input';
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

export default function UsersManagement() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admin');
  const [searchTerm, setSearchTerm] = useState('');

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users?populate=role`,
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
      setUsers(data || []);
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `โหลดข้อมูลผู้ใช้งานไม่สำเร็จ: ${error.message}`,
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
  }

  useEffect(() => {
    fetchUsers();
  }, [router]);

  async function handleCancel(id) {
    const result = await MySwal.fire({
      title: 'ยืนยันการยกเลิก',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกผู้ใช้นี้?',
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'cancelled' }),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      await fetchUsers();
      await MySwal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'ยกเลิกผู้ใช้งานสำเร็จ',
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
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถยกเลิกผู้ใช้งานได้: ${error.message}`,
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
  }

  const filteredUsers = users.filter(
    (user) =>
      user.role?.name?.toLowerCase() === activeTab &&
      user.status !== 'cancelled' &&
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function exportToExcel() {
    if (!filteredUsers.length) {
      MySwal.fire({
        icon: 'warning',
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลผู้ใช้งานสำหรับส่งออก',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      return;
    }
    const worksheetData = filteredUsers.map((user, index) => ({
      ลำดับ: index + 1,
      'ชื่อผู้ใช้': user.username,
      'อีเมล': user.email,
      'บทบาท': user.role?.name || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ผู้ใช้งาน');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `รายชื่อผู้ใช้งาน${searchTerm ? `-${searchTerm}` : ''}-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`);
  }

  return (
    <div
      className="max-w-6xl mx-auto p-4 space-y-6"
      role="main"
      aria-label="จัดการผู้ใช้งานระบบ"
    >
      <h2 className="text-2xl font-semibold text-[#30266D]">
        จัดการผู้ใช้งานระบบ
      </h2>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
        <div className="flex space-x-2" role="tablist" aria-label="แท็บผู้ใช้งาน">
          {['admin', 'patient'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 shadow-sm transform hover:scale-105 ${
                activeTab === tab
                  ? 'bg-[#30266D] text-white'
                  : 'text-[#30266D] border border-[#30266D]/50 bg-white hover:bg-[#F9669D]/20'
              }`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`${tab}-panel`}
            >
              {tab === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[250px] rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
            aria-label="ค้นหาชื่อผู้ใช้"
          />
          <button
            onClick={exportToExcel}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-[#F9669D] shadow-md hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
            aria-label="ดาวน์โหลดรายชื่อผู้ใช้งานเป็น Excel"
          >
            ดาวน์โหลด Excel
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#30266D]/20 border-t-[#30266D] rounded-full animate-pulse"></div>
          <p className="mt-2 text-sm font-medium text-[#30266D]">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="text-center text-base font-medium text-gray-600">
          {searchTerm
            ? `ไม่พบผู้ใช้งานที่ตรงกับคำค้น: "${searchTerm}"`
            : 'ไม่พบผู้ใช้งาน'}
        </p>
      ) : (
        <div className="overflow-x-auto shadow-lg">
          <table
            className="w-full border-collapse rounded-xl overflow-hidden"
            role="grid"
            aria-label="ตารางผู้ใช้งาน"
          >
            <thead className="bg-[#30266D]">
              <tr>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  ชื่อผู้ใช้
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  อีเมล
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  บทบาท
                </th>
                <th className="p-3 text-center font-semibold text-sm text-white" scope="col">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr
                  key={user.id}
                  className={`border-t border-[#30266D]/20 transition duration-200 hover:bg-[#F9669D]/10 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {user.username}
                  </td>
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {user.email}
                  </td>
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {user.role?.name || '-'}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      className="inline-block px-3 py-1 rounded-xl text-sm font-semibold text-white bg-red-600 shadow-sm hover:bg-red-600/80 transition-all duration-300 transform hover:scale-105"
                      onClick={() => handleCancel(user.id)}
                      aria-label={`ยกเลิกผู้ใช้ ${user.username}`}
                    >
                      ยกเลิก
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