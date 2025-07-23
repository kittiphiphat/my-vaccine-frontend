'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Input } from '@/components/ui/input';

const MySwal = withReactContent(Swal);

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);

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
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    try {
      const meRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
        credentials: 'include',
      });
      const me = await meRes.json();

      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: me.id,
        }),
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถลบผู้ใช้งานได้');
      }

      MySwal.fire('สำเร็จ!', 'ผู้ใช้งานถูกลบแบบ Soft Delete แล้ว', 'success');
      fetchUsers();
    } catch (error) {
      console.error(error);
      MySwal.fire('เกิดข้อผิดพลาด', error.message, 'error');
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.role?.name?.toLowerCase() === activeTab &&
      !user.is_deleted &&
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-semibold text-[#30266D]">จัดการผู้ใช้งานระบบ</h2>

      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
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

        <Input
          type="text"
          placeholder="ค้นหาชื่อผู้ใช้..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-[250px]"
        />
      </div>

      {editingUser ? (
        <p>กำลังแก้ไข...</p>
      ) : loading ? (
        <p className="text-center text-[#30266D]">กำลังโหลดข้อมูล...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-center text-gray-500">ไม่พบผู้ใช้งานในกลุ่มนี้</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border text-sm border-collapse">
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
