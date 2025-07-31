'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';

const MySwal = withReactContent(Swal);

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');
  const [searchTerm, setSearchTerm] = useState('');

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users?populate=role`, {
        credentials: 'include',
      });
      const data = await res.json();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      MySwal.fire('เกิดข้อผิดพลาด', 'โหลดข้อมูลผู้ใช้งานไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

 async function handleDelete(id) {
  const result = await MySwal.fire({
    title: 'ยืนยันการเปลี่ยนสถานะ',
    text: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกผู้ใช้นี้?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ยกเลิกเลย',
    cancelButtonText: 'ยกเลิก',
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${id}`, {
      method: 'PUT',   // ใช้ PUT สำหรับอัพเดต
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'cancelled'
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'ไม่สามารถลบข้อมูลผู้ใช้งานได้');
    }

    // รีเฟรชข้อมูลหลังอัพเดต
    await fetchUsers();

    MySwal.fire('สำเร็จ!', 'ลบข้อมูลผู้ใช้งานสำเร็จ', 'success');
  } catch (error) {
    console.error('Error updating status:', error);
    MySwal.fire('เกิดข้อผิดพลาด', error.message, 'error');
  }
}



  // กรอง users ตาม activeTab และ searchTerm
  const filteredUsers = users.filter(
  (user) =>
    user.role?.name?.toLowerCase() === activeTab &&
    user.status !== 'cancelled' &&   
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
);

  // ฟังก์ชัน Export ข้อมูล filteredUsers เป็น Excel
  function exportToExcel() {
  // เตรียมข้อมูลให้เหมาะสมกับ Excel โดยใช้หัวตารางภาษาไทย
  const worksheetData = filteredUsers.map((user) => ({
    'ชื่อผู้ใช้': user.username,
    'อีเมล': user.email,
    'บทบาท': user.role?.name || '-',
  }));

  // สร้าง worksheet และ workbook
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ผู้ใช้งาน');

  // ดาวน์โหลดไฟล์ Excel
  XLSX.writeFile(workbook, 'รายชื่อผู้ใช้งาน.xlsx');
}


  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-semibold text-[#30266D]">จัดการผู้ใช้งานระบบ</h2>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
        {/* ปุ่มแท็บ */}
        <div className="flex space-x-2">
          {['admin', 'patient'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md font-medium transition cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#30266D] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป'}
            </button>
          ))}
        </div>
        {/* กล่องค้นหา + ปุ่มดาวน์โหลด */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[250px]"
          />

          <button
            onClick={exportToExcel}
            className="bg-[#30266D] text-white px-4 py-2 rounded-md hover:bg-[#4a3b8e] transition whitespace-nowrap"
          >
            ดาวน์โหลด Excel
          </button>
        </div>
      </div>
      {loading ? (
        <p className="text-center text-[#30266D]">กำลังโหลดข้อมูล...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-center text-gray-500">ไม่พบผู้ใช้งาน</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border  border-collapse">
            <thead className="bg-[#30266D] text-white">
              <tr>
                <th className="p-2 border border-white text-left">ชื่อผู้ใช้</th>
                <th className="p-2 border border-white text-left">อีเมล</th>
                <th className="p-2 border border-white text-left">บทบาท</th>
                <th className="p-2 border border-white text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-gray-300 hover:bg-gray-50 transition">
                  <td className="p-2 border border-white">{user.username}</td>
                  <td className="p-2 border border-white">{user.email}</td>
                  <td className="p-2 border border-white">{user.role?.name || '-'}</td>
                  <td className="p-2 border border-white text-center space-x-2">
                   <button
                      className="bg-[#F9669D] text-white px-3 py-1 rounded-md hover:bg-[#cc4e7a] cursor-pointer"
                      onClick={() => handleDelete(user.id)}
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
