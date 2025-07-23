'use client';

import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  BarChart, Bar
} from 'recharts';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { ThaiDatePicker } from 'thaidatepicker-react';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const COLORS = ['#30266D', '#F9669D', '#B668CC', '#E79AC1', '#8F7BB3', '#D88CC1'];

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const { name, value, percent } = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-300 text-[#30266D] font-semibold select-none">
        <p className="mb-1">ใบนัด: {value}</p>
        <p className="mb-1">จำนวน: {value}</p>
        {percent !== undefined && <p>สัดส่วน: {(percent * 100).toFixed(2)}%</p>}
      </div>
    );
  }
  return null;
}

export default function VaccineStatisticsUI() {
  const [bookings, setBookings] = useState([]);
  const [filters, setFilters] = useState({ vaccine: 'ทั้งหมด', status: 'confirmed', startDate: null, endDate: null });
  const [chartType, setChartType] = useState('vaccine');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate[patient]=*&populate[vaccine]=*`, { withCredentials: true })
      .then(res => setBookings(res.data.data))
      .catch(err => console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err));
  }, []);

  const filteredBookings = bookings.filter(b => {
    const { status, bookingDate, vaccine } = b.attributes;
    const vaccineTitle = vaccine?.data?.attributes?.title ?? 'ไม่ระบุวัคซีน';
    const bookingDay = bookingDate ? dayjs(bookingDate) : null;
    const start = filters.startDate ? dayjs(filters.startDate).startOf('day') : null;
    const end = filters.endDate ? dayjs(filters.endDate).endOf('day') : null;
    const inRange = (!start || bookingDay?.isSameOrAfter(start)) && (!end || bookingDay?.isSameOrBefore(end));

    return (
      (filters.vaccine === 'ทั้งหมด' || vaccineTitle === filters.vaccine) &&
      status === filters.status && inRange
    );
  });

  const countBy = (fn) => filteredBookings.reduce((acc, b) => {
    const key = fn(b);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const toChartData = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value }));

 const stats = {
  vaccine: countBy(b => b.attributes.vaccine?.data?.attributes?.title ?? 'ไม่ระบุวัคซีน'),
  gender: countBy(b => {
    const genderEng = b.attributes.patient?.data?.attributes?.gender ?? 'ไม่ระบุเพศ';
    if (genderEng === 'male') return 'ชาย';
    if (genderEng === 'female') return 'หญิง';
    return 'ไม่ระบุเพศ';
  }),
  age: countBy(b => {
    const age = b.attributes.patient?.data?.attributes?.age;
    if (age == null) return 'ไม่ระบุอายุ';
    if (age <= 5) return '0-5 ปี';
    if (age <= 12) return '6-12 ปี';
    if (age <= 18) return '13-18 ปี';
    if (age <= 30) return '19-30 ปี';
    if (age <= 45) return '31-45 ปี';
    return '46 ปีขึ้นไป';
  }),
  line: (() => {
  const dateStats = countBy(b => b.attributes.bookingDate?.slice(0, 10) ?? 'ไม่ระบุวัน');
  return Object.keys(dateStats).sort().map(date => ({
    date, // ← เก็บเป็น ISO string เช่น '2025-07-21'
    ใบนัด: dateStats[date]
  }));
})()
};
const exportExcel = () => {
    let data;
    if (chartType === 'line') {
      data = stats.line.map(item => {
        const thaiDateStr = item.date; // เช่น '21 กรกฎาคม 2568'
        const [dayStr, monthStr, yearStr] = thaiDateStr.split(' ');

        const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
          'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
        const monthIndex = thaiMonths.indexOf(monthStr);

        // แปลงปี พ.ศ. เป็น ค.ศ. (ปี - 543)
        const year = parseInt(yearStr) - 543;
        const day = parseInt(dayStr);

        const dateObj = new Date(year, monthIndex, day);

        return {
          ...item,
          date: dateObj
        };
      });
    } else {
      data = toChartData(stats[chartType]);
    }

    // แปลง key name/value เป็นภาษาไทยตาม chartType
    if (chartType !== 'line') {
      data = data.map(({ name, value, ...rest }) => {
        let newNameKey = '';
        let newValueKey = 'จำนวน';

        switch (chartType) {
          case 'vaccine':
            newNameKey = 'วัคซีน';
            break;
          case 'gender':
            newNameKey = 'เพศ';
            break;
          case 'age':
            newNameKey = 'ช่วงอายุ';
            break;
          default:
            newNameKey = 'ชื่อ';
        }

        return {
          [newNameKey]: name,
          [newValueKey]: value,
          ...rest
        };
      });
    } else {
      // สำหรับ line chart เปลี่ยน key 'date' เป็น 'วันที่' และ 'ใบนัด' เป็น 'จำนวน'
      data = data.map(({ date, ใบนัด, ...rest }) => ({
        วันที่: date,
        จำนวน: ใบนัด,
        ...rest,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(data, {
      dateNF: '[$-41E]d mmmm yyyy' // รูปแบบวันที่ภาษาไทย Excel (locale ไทย)
    });

    // เปลี่ยน header คอลัมน์วันที่ (สำหรับ line chart)
    if (chartType === 'line') {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for(let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if(ws[address]) {
          if(ws[address].v === 'วันที่') ws[address].v = 'วันที่';
          if(ws[address].v === 'จำนวน') ws[address].v = 'จำนวน';
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายงาน');
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), `รายงาน-${chartType}.xlsx`);
  };


const renderChart = () => {
  const data = chartType === 'line' ? stats.line : toChartData(stats[chartType]);

  if (chartType === 'line') {
    return (
    <LineChart width={900} height={500} data={data} margin={{ top: 30, right: 40, left: 40, bottom: 80 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey="date"
        tickFormatter={(d) => {
          const date = dayjs(d);

          return date.isValid() ? date.locale('th').format('D MMM BBBB') : 'ไม่ทราบวันที่';
        }}
        angle={-45}
        textAnchor="end"
        tick={{ fill: '#30266D', fontWeight: '600' }}
      />
      <YAxis allowDecimals={false} tick={{ fill: '#30266D', fontWeight: '600' }} />
      <Tooltip
        labelFormatter={(d) => {
          const date = dayjs(d);
          return date.isValid() ? date.locale('th').format('D MMM BBBB') : 'ไม่ทราบวันที่';
        }}
      />
      <Line type="monotone" dataKey="ใบนัด" stroke="#30266D" strokeWidth={3} />
      
    </LineChart>

    );
  }

  if (chartType === 'vaccine' || chartType === 'gender' || chartType === 'age') {
    return (
      <PieChart width={900} height={500}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={160}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip labelFormatter={(d) => {
          const date = dayjs(d);
          return date.isValid() ? date.locale('th').format('D MMM BBBB') : 'ไม่ทราบวันที่';
        }} />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    );
  }

  return <p className="text-red-500">ไม่พบข้อมูล</p>;
};


  const vaccines = ['ทั้งหมด', ...new Set(bookings.map(b => b.attributes.vaccine?.data?.attributes?.title ?? 'ไม่ระบุวัคซีน'))];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-10">
      <h2 className="text-3xl font-bold text-[#30266D] mb-10 text-center select-none">สถิติการจองวัคซีน</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <div className="bg-[#30266D] text-white rounded-lg p-8 shadow-md flex flex-col items-center">
          <p className="text-lg mb-2 opacity-80 select-none">จำนวนจองทั้งหมด</p>
          <p className="text-5xl font-extrabold">{bookings.filter(b => b.attributes.status === 'confirmed').length}</p>
        </div>
        <div className="bg-[#F9669D] text-white rounded-lg p-8 shadow-md flex flex-col items-center">
          <p className="text-lg mb-2 opacity-80 select-none">จำนวนยกเลิก</p>
          <p className="text-5xl font-extrabold">{bookings.filter(b => b.attributes.status === 'cancelled').length}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="rounded-lg bg-gradient-to-r from-[#F9669D] to-[#30266D] px-5 py-2 text-white font-semibold shadow-md hover:brightness-110 transition  cursor-pointer"
        >
          {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
        </button>
        <button
          onClick={exportExcel}
          className="rounded-lg bg-gradient-to-r from-[#30266D] to-[#F9669D] px-5 py-2 text-white font-semibold shadow-md hover:brightness-110 transition  cursor-pointer" 
          title="ส่งออกข้อมูลเป็น Excel"
        >
          ดาวโหลดข้อมูล Excel
        </button>
      </div>

      {showFilters && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 bg-[#f9f9fb] p-6 rounded-lg border border-gray-200 shadow-inner mb-10 ">
          <div>
            <label className="block mb-2 font-semibold text-[#30266D] select-none  ">วัคซีน</label>
            <select
              value={filters.vaccine}
              onChange={(e) => setFilters({ ...filters, vaccine: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#30266D] cursor-pointer"
            >
              {vaccines.map(v => <option key={v} value={v}>{v} </option>)}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#30266D] select-none">สถานะ</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#30266D] cursor-pointer"
            >
              <option value="confirmed">จองแล้ว</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#30266D] select-none">จากวันที่</label>
            <ThaiDatePicker
              value={filters.startDate}
              onChange={(d) => setFilters({ ...filters, startDate: d })}
              displayFormat="D MMMM BBBB"
              inputClasses="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#30266D]"
              placeholder="วัน เดือน ปี"
              maxDate={filters.endDate || undefined}
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold text-[#30266D] select-none">ถึงวันที่</label>
            <ThaiDatePicker
              value={filters.endDate}
              onChange={(d) => setFilters({ ...filters, endDate: d })}
              displayFormat="D MMMM BBBB"
              inputClasses="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#30266D]"
              placeholder="วัน เดือน ปี"
              minDate={filters.startDate || undefined}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4 mb-8 select-none ">
        {[
          ['vaccine', 'วัคซีน'],
          ['gender', 'เพศ'],
          ['age', 'อายุ'],
          ['line', 'รายวัน'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setChartType(key)}
            className={`rounded-full px-5 py-2 font-semibold shadow-md transition cursor-pointer
              ${chartType === key ? 'bg-[#30266D] text-white' : 'bg-gray-100 text-[#30266D] hover:bg-[#D88CC1] hover:text-white'}`}
            aria-pressed={chartType === key}
            title={`ดูสถิติแบบ ${label}`}
          >
            {label}
          </button>
        ))}
      </div>

     {chartType && (
      <p className="text-center text-[#30266D] font-semibold text-lg mb-4 select-none">
        {chartType === 'vaccine' && (
          <>แสดงข้อมูลการจองวัคซีน: <span className="inline-block bg-pink-100 text-[#f10059] px-3 py-1 rounded-full font-semibold">{filters.vaccine}</span></>
        )}
        {chartType === 'gender' && (
          <>แสดงข้อมูลการจองวัคซีนตามเพศของผู้ป่วย: <span className="inline-block bg-pink-100 text-[#f10059] px-3 py-1 rounded-full font-semibold">{filters.vaccine}</span></>
        )}
        {chartType === 'age' && (
          <>แสดงข้อมูลการจองวัคซีนตามช่วงอายุ: <span className="inline-block bg-pink-100 text-[#f10059] px-3 py-1 rounded-full font-semibold">{filters.vaccine}</span></>
        )}
        {chartType === 'line' && (
          <>แสดงข้อมูลการจองวัคซีนรายวัน: <span className="inline-block bg-pink-100 text-[#f10059] px-3 py-1 rounded-full font-semibold">{filters.vaccine}</span></>
        )}
      </p>
    )}

      <div className="flex justify-center overflow-auto">
        {renderChart()}
      </div>
    </div>
  );
}
