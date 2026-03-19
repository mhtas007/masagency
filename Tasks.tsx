import React from 'react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-500">ئەم بەشە لە قۆناغی گەشەپێداندایە...</p>
    </div>
  );
}
