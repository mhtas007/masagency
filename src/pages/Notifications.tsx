import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, writeBatch, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, Users, Briefcase, FileText, CheckSquare, Target, Send } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

export default function Notifications() {
  const { role } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'send'>('list');
  const [users, setUsers] = useState<any[]>([]);
  
  // Send Notification Form State
  const [sendForm, setSendForm] = useState({
    title: '',
    message: '',
    url: '',
    target: 'all',
    targetUserId: '',
    targetGroup: 'Client'
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (role === 'Client') return;

    const q = query(collection(db, 'notifications'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch users for the send form
    const fetchUsers = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchUsers();

    return () => unsub();
  }, [role]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      let targetUsers = [];
      
      if (sendForm.target === 'all') {
        targetUsers = users;
      } else if (sendForm.target === 'user') {
        targetUsers = users.filter(u => u.id === sendForm.targetUserId);
      } else if (sendForm.target === 'group') {
        targetUsers = users.filter(u => u.role === sendForm.targetGroup);
      }

      if (targetUsers.length === 0) {
        alert('هیچ بەکارهێنەرێک نەدۆزرایەوە بۆ ناردن.');
        setSending(false);
        return;
      }

      const batch = writeBatch(db);
      
      targetUsers.forEach(user => {
        const newNotifRef = doc(collection(db, 'notifications'));
        batch.set(newNotifRef, {
          title: sendForm.title,
          message: sendForm.message,
          url: sendForm.url || null,
          type: 'info',
          user_id: user.id,
          read: false,
          created_at: new Date().toISOString()
        });
      });

      await batch.commit();
      
      // Note: To actually trigger push notifications, you would call your backend API here
      // fetch('/api/send-notification', { method: 'POST', body: JSON.stringify({ tokens: [...], title: sendForm.title, body: sendForm.message }) })

      alert('نۆتیفیکەیشن بە سەرکەوتوویی نێردرا.');
      setSendForm({ title: '', message: '', url: '', target: 'all', targetUserId: '', targetGroup: 'Client' });
      setActiveTab('list');
    } catch (error) {
      console.error("Error sending notification:", error);
      alert('هەڵەیەک ڕوویدا لە ناردنی نۆتیفیکەیشن.');
    } finally {
      setSending(false);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotes = notifications.filter(n => !n.read);
    if (unreadNotes.length === 0) return;
    
    const batch = writeBatch(db);
    unreadNotes.forEach(note => {
      const noteRef = doc(db, 'notifications', note.id);
      batch.update(noteRef, { read: true });
    });
    await batch.commit();
  };

  const markAsRead = async (id: string, read: boolean) => {
    if (read) return;
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'error': return <XCircle className="w-6 h-6 text-red-500" />;
      case 'info': return <Info className="w-6 h-6 text-blue-500" />;
      case 'client': return <Users className="w-6 h-6 text-indigo-500" />;
      case 'project': return <Briefcase className="w-6 h-6 text-purple-500" />;
      case 'invoice': return <FileText className="w-6 h-6 text-emerald-500" />;
      case 'task': return <CheckSquare className="w-6 h-6 text-orange-500" />;
      case 'lead': return <Target className="w-6 h-6 text-rose-500" />;
      default: return <Bell className="w-6 h-6 text-gray-500" />;
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ku-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ئاگادارکردنەوەکان</h1>
        <div className="flex gap-2">
          {role === 'Super Admin' && (
            <button 
              onClick={() => setActiveTab(activeTab === 'list' ? 'send' : 'list')}
              className="text-sm text-white font-medium bg-gray-900 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-black"
            >
              {activeTab === 'list' ? (
                <><Send className="w-4 h-4" /> ناردنی نۆتیفیکەیشن</>
              ) : (
                <><Bell className="w-4 h-4" /> لیستی نۆتیفیکەیشنەکان</>
              )}
            </button>
          )}
          {activeTab === 'list' && (
            <button 
              onClick={markAllAsRead}
              className="text-sm text-gray-900 font-medium hover:text-black bg-gray-100 px-4 py-2 rounded-xl"
            >
              خوێندنەوەی هەمووی
            </button>
          )}
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {notifications.map((note) => (
              <div 
                key={note.id} 
                onClick={() => markAsRead(note.id, note.read)}
                className={`p-4 hover:bg-gray-50 transition-colors flex gap-4 items-start cursor-pointer ${!note.read ? 'bg-blue-50/30' : ''}`}
              >
                <div className="mt-1">
                  {getIcon(note.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className={`text-sm ${!note.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {note.title}
                    </h3>
                    {!note.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{note.message}</p>
                  {note.url && (
                    <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                      بینینی بەستەر
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-2" dir="ltr">{formatDate(note.created_at)}</p>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>هیچ ئاگادارکردنەوەیەک نییە</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">ناردنی نۆتیفیکەیشنی دەستی</h2>
          <form onSubmit={handleSendNotification} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سەردێڕ (Title)</label>
              <input 
                type="text" 
                required
                value={sendForm.title}
                onChange={e => setSendForm({...sendForm, title: e.target.value})}
                placeholder="نموونە: ئۆفەری نوێ، یان ئاگادارییەکی گرنگ" 
                className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ناوەڕۆک (Body)</label>
              <textarea 
                required
                value={sendForm.message}
                onChange={e => setSendForm({...sendForm, message: e.target.value})}
                placeholder="ئەو نامەیەی دەتەوێت بیگەیەنیت..." 
                rows={4}
                className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 resize-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">لینک (URL) - ئارەزوومەندانە</label>
              <input 
                type="url" 
                value={sendForm.url}
                onChange={e => setSendForm({...sendForm, url: e.target.value})}
                placeholder="https://..." 
                className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" 
                dir="ltr"
              />
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3">دیاریکردنی نێرراو (Target)</label>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="target" 
                    value="all" 
                    checked={sendForm.target === 'all'}
                    onChange={() => setSendForm({...sendForm, target: 'all'})}
                    className="w-4 h-4 text-gray-900 focus:ring-gray-900" 
                  />
                  <span className="text-sm text-gray-700">بۆ هەموو بەکارهێنەران</span>
                </label>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="target" 
                      value="user" 
                      checked={sendForm.target === 'user'}
                      onChange={() => setSendForm({...sendForm, target: 'user'})}
                      className="w-4 h-4 text-gray-900 focus:ring-gray-900" 
                    />
                    <span className="text-sm text-gray-700">بۆ بەکارهێنەرێکی دیاریکراو</span>
                  </label>
                  {sendForm.target === 'user' && (
                    <select 
                      value={sendForm.targetUserId}
                      onChange={e => setSendForm({...sendForm, targetUserId: e.target.value})}
                      className="p-2 border border-gray-300 rounded-lg text-sm"
                      required={sendForm.target === 'user'}
                    >
                      <option value="">هەڵبژێرە...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="target" 
                      value="group" 
                      checked={sendForm.target === 'group'}
                      onChange={() => setSendForm({...sendForm, target: 'group'})}
                      className="w-4 h-4 text-gray-900 focus:ring-gray-900" 
                    />
                    <span className="text-sm text-gray-700">بۆ گرووپێکی دیاریکراو</span>
                  </label>
                  {sendForm.target === 'group' && (
                    <select 
                      value={sendForm.targetGroup}
                      onChange={e => setSendForm({...sendForm, targetGroup: e.target.value})}
                      className="p-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="Client">مشتەرییەکان (Clients)</option>
                      <option value="Manager">بەڕێوەبەران (Managers)</option>
                      <option value="Marketing Specialist">مارکێتینگەکان</option>
                      <option value="Designer">دیزاینەرەکان</option>
                      <option value="Accountant">ژمێریاران</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit"
                disabled={sending}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-50 font-medium"
              >
                <Send className="w-4 h-4" />
                {sending ? 'چاوەڕێ بکە...' : 'ناردن'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
