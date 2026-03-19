import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Save, User, Lock, Building } from 'lucide-react';

export default function Settings() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">ڕێکخستنەکان</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-l border-gray-100 p-4">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <User className="w-5 h-5" />
              پڕۆفایل
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Lock className="w-5 h-5" />
              ئاسایش
            </button>
            {role === 'Super Admin' && (
              <button 
                onClick={() => setActiveTab('agency')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'agency' ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Building className="w-5 h-5" />
                زانیاری ئەجێنسی
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">زانیاری کەسی</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ئیمەیڵ</label>
                  <input type="email" disabled value={user?.email || ''} className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-500" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ڕۆڵ</label>
                  <input type="text" disabled value={role || ''} className="w-full p-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ناوی تەواو</label>
                  <input type="text" placeholder="ناوی خۆت بنووسە..." className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ژمارە مۆبایل</label>
                  <input type="text" placeholder="0770 000 0000" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" dir="ltr" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-medium flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  پاشەکەوتکردن
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">گۆڕینی وشەی نهێنی</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وشەی نهێنی ئێستا</label>
                  <input type="password" placeholder="••••••••" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وشەی نهێنی نوێ</label>
                  <input type="password" placeholder="••••••••" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">دڵنیابوونەوە لە وشەی نهێنی نوێ</label>
                  <input type="password" placeholder="••••••••" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" dir="ltr" />
                </div>
              </div>
              <div className="flex justify-start pt-4">
                <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-medium flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  نوێکردنەوەی وشەی نهێنی
                </button>
              </div>
            </div>
          )}

          {activeTab === 'agency' && role === 'Super Admin' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">زانیاریەکانی MAS Agency</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ناوی ئەجێنسی</label>
                  <input type="text" defaultValue="MAS Agency" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ئیمەیڵی فەرمی</label>
                  <input type="email" defaultValue="mhtasahmad@gmail.com" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ناونیشان</label>
                  <input type="text" defaultValue="هەولێر، کوردستان" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ژمارەی تەلەفۆن</label>
                  <input type="text" defaultValue="0750 813 4034" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" dir="ltr" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-medium flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  پاشەکەوتکردن
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
