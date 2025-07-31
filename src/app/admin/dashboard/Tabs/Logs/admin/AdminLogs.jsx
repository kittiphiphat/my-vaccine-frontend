'use client';

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FileDown } from 'lucide-react';
import Pagination from './Pagination';
import FilterSearch from './FilterSearch';
import LogList from './LogList';
import { formatDateTimeThai, formatDetailsText } from './LogItem';


export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    setLoading(true);
    axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/admin-logs`, { withCredentials: true })
      .then(res => setLogs(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // กรองตาม action และ search message
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const { action, message } = log.attributes;
      const matchAction = filterAction ? action === filterAction : true;
      const matchSearch = searchTerm ? message.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      return matchAction && matchSearch;
    });
  }, [logs, filterAction, searchTerm]);

  // Pagination
  const indexOfLast = currentPage * logsPerPage;
  const indexOfFirst = indexOfLast - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  // เปลี่ยนหน้าต้องเลื่อนขึ้นบนอัตโนมัติ
  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });

  };

const handleExport = (logsToExport) => {
  if (!logsToExport || logsToExport.length === 0) return;

  const exportData = logsToExport.map(log => {
    const { id, attributes } = log;
    const { action, message, timestamp, details } = attributes;

    return {
      รหัส: id,
      ประเภท: action,
      ข้อความ: message,
      'วันเวลา': formatDateTimeThai(timestamp),
      รายละเอียด: formatDetailsText(details || {}, action),
       'ข้อมูล Json': JSON.stringify(details || {}, null, 2),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'AdminLogs');
  XLSX.writeFile(workbook, 'admin-logs.xlsx');
};


  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#30266D]">บันทึกการทำงานของผู้ดูแลระบบ</h2>
       <button
          onClick={() => handleExport(filteredLogs)}
          className="flex items-center gap-2 px-4 py-2 bg-[#30266D] text-white rounded hover:bg-[#F9669D] transition cursor-pointer"
        >
          <FileDown size={18} />
          ดาวน์โหลด Excel
        </button>
      </div>
      

      <FilterSearch
        filterAction={filterAction}
        setFilterAction={setFilterAction}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCurrentPage={setCurrentPage}
      />

      {loading ? (
        <p className="text-center text-gray-500">กำลังโหลดข้อมูล...</p>
      ) : filteredLogs.length === 0 ? (
        <p className="text-center text-gray-500">ไม่พบข้อมูล ฝั่งผู้ดูแลระบบ</p>
      ) : (
        <>
          <LogList logs={currentLogs} />
          <Pagination
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
