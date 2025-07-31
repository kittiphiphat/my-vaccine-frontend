'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Copy, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);



const actionLabels = {
  login: { label: 'เข้าสู่ระบบ', color: 'bg-green-100 text-green-700' },
  logout: { label: 'ออกจากระบบ', color: 'bg-red-100 text-red-700' },
  patient_created: { label: 'สร้างข้อมูลผู้ป่วย', color: 'bg-yellow-100 text-yellow-800' },
  booking_cancelled: { label: 'ยกเลิกการจองวัคซีน', color: 'bg-yellow-100 text-yellow-800' },
  booking_created: { label: 'จองวัคซีน', color: 'bg-indigo-100 text-indigo-700' },
  // เพิ่ม action อื่น ๆ ตามต้องการ
};

const fieldLabels = {
  vaccineId: 'รหัสวัคซีน',
  bookingId: 'รหัสใบวัคซีน',
  patientId: 'รหัสผู้ป่วย',
  bookingDate: 'วันที่จอง',
  vaccineTitle: 'ชื่อวัคซีน',
  minAge: 'อายุขั้นต่ำ',
  maxAge: 'อายุสูงสุด',
  gender: 'เพศ',
  maxQuota: 'จำนวนสูงสุด',
  bookingStartDate: 'วันเริ่มจอง',
  bookingEndDate: 'วันสิ้นสุดจอง',
  advance_booking_days: 'จำนวนวันจองล่วงหน้า',
  prevent_last_minute_minutes: 'ระยะเวลาห้ามจองนาทีสุดท้าย',
  slotDurationMinutes: 'ระยะเวลาช่วงเวลา (นาที)',
  is_enabled: 'สถานะ',
  id: 'รหัส',
  startTime: 'เวลาเริ่มต้น',
  endTime: 'เวลาสิ้นสุด',
  quota: 'จำนวนโควต้า',
  createdAt: 'สร้างเมื่อ',
  updatedAt: 'แก้ไขเมื่อ',
  publishedAt: 'เผยแพร่เมื่อ',
  day_of_week: 'วันให้บริการ',
  vaccine: 'วัคซีน',
  userId: 'รหัสผู้ใช้',
  username: 'ชื่อผู้ใช้',
  email: 'อีเมล',
  role: 'สิทธิ์',
};

// เพิ่มฟังก์ชันนี้ไว้ด้านบนหรือใต้ฟังก์ชัน formatValue
function formatDetailsText(details) {
  if (!details || typeof details !== 'object') return '-';

  // กรณีมี before/after ให้แปลงเป็นข้อความสรุป
  if ('before' in details || 'after' in details) {
    const before = details.before || {};
    const after = details.after || {};

    const hasBeforeData = Object.keys(before).some(
      key => before[key] !== null && before[key] !== undefined && before[key] !== ''
    );

    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

    let result = '';

    // แสดงก่อนแก้ไข
    if (hasBeforeData) {
      result += 'ก่อนแก้ไข:\n';
      keys.forEach(key => {
        const val = before[key];
        if (val !== null && val !== undefined && val !== '') {
          result += `  - ${fieldLabels[key] || key}: ${typeof val === 'object' ? JSON.stringify(val) : val}\n`;
        }
      });
    } else {
      result += 'ก่อนแก้ไข: ไม่มีข้อมูลการแก้ไข\n\n';
    }

    // แสดงหลังแก้ไข
    result += 'หลังแก้ไข:\n';
    keys.forEach(key => {
      const val = after[key];
      if (val !== null && val !== undefined && val !== '') {
        result += `  - ${fieldLabels[key] || key}: ${typeof val === 'object' ? JSON.stringify(val) : val}\n`;
      }
    });

    return result.trim();
  }

  // กรณีทั่วไป แปลง details เป็นบรรทัด key: value
  return Object.entries(details).map(([key, val]) => {
    if (val === null || val === undefined || val === '') return null;
    return `${fieldLabels[key] || key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`;
  }).filter(Boolean).join('\n') || '-';
}



function formatDateTimeThai(datetime) {
  if (!datetime) return '-';
  try {
    const d = new Date(datetime);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() + 543;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes} น.`;
  } catch {
    return datetime;
  }
}

function formatValue(key, val) {
  if (val === null || val === undefined || val === '') return '-';

  if (key === 'timestamp') return formatDateTimeThai(val);

  if (typeof val === 'boolean') return val ? 'ใช่' : 'ไม่ใช่';

  // กรณี key เป็น user
  if (key === 'user' && typeof val === 'object') {
    const role = val.role?.name || '-';
    return (
      <div className="ml-2 space-y-1">
        <div><strong>ชื่อผู้ใช้:</strong> {val.username || '-'}</div>
        <div><strong>อีเมล:</strong> {val.email || '-'}</div>
        <div><strong>สิทธิ์:</strong> {role}</div>
      </div>
    );
  }

  // ถ้าเป็น object ทั่วไป ให้ JSON.stringify
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  return val.toString();
}

function renderDetailsThai(details, action) {
  if (!details || typeof details !== 'object') return <p className="italic text-gray-500">ไม่มีรายละเอียด</p>;

  if ('before' in details || 'after' in details) {
    const before = details.before || {};
    const after = details.after || {};
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

    const hasValidData = (obj) =>
      Object.values(obj).some(val =>
        val !== null && val !== undefined && val !== '' && val !== '-' &&
        !(typeof val === 'object' && Object.keys(val).length === 0)
      );

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-[#30266D] mb-2">ก่อนแก้ไข:</p>
          {hasValidData(before) ? (
            keys.map(key => {
              const val = before[key];
              return (
                <div key={`before-${key}`} className="mb-1">
                  <strong>{fieldLabels[key] || key}:</strong>{' '}
                  <span>{formatValue(key, val)}</span>
                </div>
              );
            })
          ) : (
            <p className="italic text-gray-500">ไม่มีข้อมูลก่อนแก้ไข</p>
          )}
        </div>

        <div>
          <p className="font-semibold text-[#F9669D] mb-2">หลังแก้ไข:</p>
          {hasValidData(after) ? (
            keys.map(key => {
              const val = after[key];
              return (
                <div key={`after-${key}`} className="mb-1">
                  <strong>{fieldLabels[key] || key}:</strong>{' '}
                  <span>{formatValue(key, val)}</span>
                </div>
              );
            })
          ) : (
            <p className="italic text-gray-500">ไม่มีข้อมูลหลังแก้ไข</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm">
      {Object.entries(details).map(([key, val]) => (
        <div key={key}>
          <strong>{fieldLabels[key] || key}:</strong>{' '}
          <span>{formatValue(key, val)}</span>
        </div>
      ))}
    </div>
  );
}

export default function PatientLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDetails, setOpenDetails] = useState({});
  const [openJson, setOpenJson] = useState({});
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    setLoading(true);
    axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patient-logs`, { withCredentials: true })
      .then(res => setLogs(res.data.data))
      .catch(err => console.error('Error loading all logs:', err))
      .finally(() => setLoading(false));
  }, []);

  // กรอง logs ตาม actionFilter และ searchTerm
  const filteredLogs = logs.filter(log => {
    const { attributes } = log;
    if (actionFilter && attributes.action !== actionFilter) return false;

    const search = searchTerm.toLowerCase();
    if (search) {
      const message = attributes.message?.toLowerCase() || '';
      const detailsStr = JSON.stringify(attributes.details || {}).toLowerCase();
      if (!message.includes(search) && !detailsStr.includes(search)) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  const toggleDetails = (id) => setOpenDetails(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleJson = (id) => setOpenJson(prev => ({ ...prev, [id]: !prev[id] }));

  const copyToClipboard = (json) => {
  navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    .then(() => {
      MySwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'คัดลอกข้อมูล JSON แล้ว',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: {
          popup: 'my-toast',
        },
      });
    })
    .catch(() => {
      MySwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'คัดลอกข้อมูลไม่สำเร็จ',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
         customClass: {
          popup: 'my-toast',
        },
      });
      
    });
};

  const exportToExcel = () => {
    const dataForExcel = filteredLogs.map(log => {
      const { id, attributes } = log;
      return {
        'รหัส': id,
        'ประเภท': actionLabels[attributes.action]?.label || attributes.action,
        'ข้อความ': attributes.message,
        'เวลา': formatDateTimeThai(attributes.timestamp),
         'รายละเอียด': formatDetailsText(attributes.details),
        'รายละเอียด JSON': JSON.stringify(attributes.details || {}, null, 2),

        
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PatientLogs');
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'log_patient.xlsx');
  };

  if (loading) return <p className="text-center text-gray-500">กำลังโหลดข้อมูล...</p>;
  if (logs.length === 0) return <p className="text-center text-gray-500">ไม่พบข้อมูล ฝั่งผู้ป่วย </p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-[#30266D]">บันทึกการทำงานของผู้ป่วย</h2>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-[#30266D] text-white rounded hover:bg-[#F9669D] transition cursor-pointer"
        >
          <FileDown size={18} />
          ดาวน์โหลด Excel
        </button>
      </div>

      {/* ฟิลเตอร์และค้นหา */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        {/* ตัวเลือก action filter */}
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
          className="border border-gray-300 rounded px-3 py-2 w-full sm:w-48"
        >
          <option value="">ทั้งหมด</option>
          {Object.entries(actionLabels).map(([key, info]) => (
            <option key={key} value={key}>
              {info.label}
            </option>
          ))}
        </select>

        {/* ช่องค้นหา */}
        <input
          type="text"
          placeholder="ค้นหาคำในข้อความหรือรายละเอียด..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="border border-gray-300 rounded px-3 py-2 flex-grow"
        />
      </div>

      <ul className="space-y-6">
        {currentLogs.map(log => {
          const { id, attributes } = log;
          const { action, message, timestamp, details } = attributes;
          const actionInfo = actionLabels[action] || { label: action, color: 'bg-gray-100 text-gray-800' };

          return (
            <li key={id} className="border rounded-xl shadow-sm p-6 bg-white hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${actionInfo.color} mb-2`}>
                    {actionInfo.label}
                  </span>
                  <p className="text-gray-800">{message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDateTimeThai(timestamp)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleDetails(id)}
                    className="text-sm flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-100"
                  >
                    {openDetails[id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    รายละเอียด
                  </button>
                  <button
                    onClick={() => toggleJson(id)}
                    className="text-sm flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-100"
                  >
                    {openJson[id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    JSON
                  </button>
                </div>
              </div>

              {openDetails[id] && (
                <div className="mt-4 relative">
                  <p className="font-semibold mb-2 text-[#30266D]">รายละเอียด</p>
                  <div className="mt-4 border rounded bg-gray-50 p-4 text-sm">
                    {renderDetailsThai(details, action)}
                  </div>
                </div>
              )}

              {openJson[id] && (
                <div className="mt-4 relative">
                  <p className="font-semibold mb-2 text-[#F9669D]">รายละเอียด JSON</p>
                  <div className="relative bg-gray-100 border rounded p-3 overflow-x-auto text-gray-800 text-xs">
                    <button
                      onClick={() => copyToClipboard(details)}
                      className="absolute top-2 right-2 bg-[#30266D] text-white px-2 py-1 rounded hover:bg-[#F9669D] cursor-pointer"
                      title="คัดลอก JSON"
                    >
                      <Copy size={16} />
                    </button>
                    <pre>{JSON.stringify(details, null, 2)}</pre>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Pagination ตัวเลข */}
      <div className="flex justify-end items-center gap-2 mt-6 flex-wrap">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-3 py-1 rounded-2xl border text-sm font-medium transition ${
              currentPage === page
                ? 'bg-[#30266D] text-white'
                : 'bg-white text-[#30266D] hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}
