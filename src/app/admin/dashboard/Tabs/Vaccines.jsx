'use client';

import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';
import VaccineFormcreate from './Vaccines/VaccineFormcreate';
import VaccinesList from './Vaccines/VaccinesList';
import Swal from 'sweetalert2';
import VaccineFormedit from './Vaccines/VaccineFormedit';

export default function Vaccines() {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`;

  const fetchVaccines = async () => {
  setLoading(true);
  try {
    const res = await fetch(`${API_URL}?populate=*&pagination[pageSize]=1000`, {
      credentials: 'include', 
    });

    if (res.status === 403) {
      console.error('ไม่ได้รับอนุญาตให้เข้าถึงวัคซีน (403)');
      return;
    }

    const data = await res.json();
    setVaccines(data.data || []);
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการโหลดวัคซีน:', error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchVaccines();
  }, []);

  const handleDelete = async (id) => {
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.ok) {
      await fetchVaccines();
      Swal.fire('ลบวัคซีนสำเร็จ', '', 'success'); 
    } else {
      Swal.fire('ลบวัคซีนไม่สำเร็จ', '', 'error');
    }
  } catch (error) {
    Swal.fire('เกิดข้อผิดพลาดในการลบวัคซีน', '', 'error');
    console.error(error);
  }
};

  const handleSave = async (savedVaccine) => {
    setEditingVaccine(null);
    setIsCreating(false);
    await fetchVaccines();
  };

  const filteredVaccines = vaccines.filter((v) =>
    v.attributes.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // แสดงส่วนหัวเฉพาะตอนแสดง list เท่านั้น
  const showHeaderAndSearch = !isCreating && editingVaccine === null;

  return (
    <div className="max-w-7xl mx-auto">
      {showHeaderAndSearch && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold text-[#30266D]">จัดการข้อมูลวัคซีน</h2>

          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              placeholder="ค้นหาชื่อวัคซีน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[250px]"
            />
            <button
              onClick={() => {
                setIsCreating(true);
                setEditingVaccine(null);
              }}
              className="bg-[#30266D] hover:bg-[#251f5a] text-white px-4 py-2 rounded-md font-semibold cursor-pointer"
            >
              + เพิ่มวัคซีนใหม่
            </button>
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
        />
      )}
    </div>
  );
}
