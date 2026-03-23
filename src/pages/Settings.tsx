import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Save, User, Lock, Building, Bell } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Settings() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  
  const [notificationPrefs, setNotificationPrefs] = useState({
    new_clients: true,
    financial_updates: true,
    team_activities: true,
    messages: true,
    general_announcements: true
  });

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().notificationPreferences) {
          setNotificationPrefs({
            ...notificationPrefs,
            ...userDoc.data().notificationPreferences
          });
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      }
    };
    fetchPrefs();
  }, [user]);

  const handlePrefToggle = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveNotificationPrefs = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPreferences: notificationPrefs
      });
      alert('ڕێکخستنەکانی نۆتیفیکەیشن پاشەکەوت کران.');
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert('هەڵەیەک ڕوویدا لە پاشەکەوتکردندا.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ڕێکخستنەکان</h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row transition-colors">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-900/50 border-b md:border-b-0 md:border-l border-gray-100 dark:border-gray-700 p-4">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <User className="w-5 h-5" />
              پڕۆفایل
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Lock className="w-5 h-5" />
              ئاسایش
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Bell className="w-5 h-5" />
              ئاگادارکردنەوەکان
            </button>
            {role === 'Super Admin' && (
              <button 
                onClick={() => setActiveTab('agency')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'agency' ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
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
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-4">زانیاری کەسی</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ئیمەیڵ</label>
                  <input type="email" disabled value={user?.email || ''} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ڕۆڵ</label>
                  <input type="text" disabled value={role || ''} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ناوی تەواو</label>
                  <input type="text" placeholder="ناوی خۆت بنووسە..." className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ژمارە مۆبایل</label>
                  <input type="text" placeholder="0770 000 0000" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" dir="ltr" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 font-medium flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  پاشەکەوتکردن
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-4">گۆڕینی وشەی نهێنی</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وشەی نهێنی ئێستا</label>
                  <input type="password" placeholder="••••••••" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وشەی نهێنی نوێ</label>
                  <input type="password" placeholder="••••••••" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">دڵنیابوونەوە لە وشەی نهێنی نوێ</label>
                  <input type="password" placeholder="••••••••" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" dir="ltr" />
                </div>
              </div>
              <div className="flex justify-start pt-4">
                <button className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 font-medium flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  نوێکردنەوەی وشەی نهێنی
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-4">ڕێکخستنی ئاگادارکردنەوەکان</h2>
              
              <div className="space-y-4">
                {[
                  { id: 'new_clients', title: 'ئاگاداری کڕیارە نوێیەکان', desc: 'کاتێک کڕیارێکی نوێ تۆمار دەکرێت لە سیستم.' },
                  { id: 'financial_updates', title: 'نوێکارییە داراییەکان', desc: 'کاتێک پارەیەک وەردەگیرێت یان پسوڵەیەک دەبڕدرێت.' },
                  { id: 'team_activities', title: 'چالاکییەکانی تیم', desc: 'کاتێک کارمەندێکی تر گۆڕانکاری لە داتاکاندا دەکات.' },
                  { id: 'messages', title: 'نامە و نامەبەری', desc: 'کاتێک کڕیارێک یان سیستمەکە نامەیەکی ناوخۆییت بۆ دەنێرێت.' },
                  { id: 'general_announcements', title: 'ئاگادارییە گشتییەکان', desc: 'هەواڵ و نوێکارییەکانی خودی سیستمی MAS Agency.' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
                    </div>
                    <button 
                      onClick={() => handlePrefToggle(item.id as keyof typeof notificationPrefs)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${notificationPrefs[item.id as keyof typeof notificationPrefs] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                      dir="ltr"
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationPrefs[item.id as keyof typeof notificationPrefs] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={saveNotificationPrefs}
                  disabled={saving}
                  className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'چاوەڕێ بکە...' : 'پاشەکەوتکردن'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'agency' && role === 'Super Admin' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-4">زانیاریەکانی MAS Agency</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ناوی ئەجێنسی</label>
                  <input type="text" defaultValue="MAS Agency" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ئیمەیڵی فەرمی</label>
                  <input type="email" defaultValue="mhtasahmad@gmail.com" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ناونیشان</label>
                  <input type="text" defaultValue="هەولێر، کوردستان" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ژمارەی تەلەفۆن</label>
                  <input type="text" defaultValue="0750 813 4034" className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" dir="ltr" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 font-medium flex items-center gap-2">
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
