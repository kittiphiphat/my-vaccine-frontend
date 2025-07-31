'use client';

import React from 'react';
import LogItem from './LogItem';

export default function LogList({ logs, onExportRow }) {
  return (
    <ul className="space-y-6">
      {logs.map(log => (
        <LogItem key={log.id} log={log} onExportRow={onExportRow} />
      ))}
    </ul>
  );
}