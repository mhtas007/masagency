import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, writeBatch, addDoc, query, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Send, Clock, Settings, Trash2, Calendar, Users, Bell, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationCenter() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'send' | 'scheduled' | 'automated'>('send');
  const [users, setUsers] = useState<any[]>([]);
  
  // Send Form State
  const [sendForm, setSendForm] = useState({
    title: '',
    message: '',
    url: '',
    target: 'all',
    targetUserId: '',
    targetGroup: 'Client',
    isScheduled: false,
    scheduledDate: '',
    scheduledTime: ''
  });
  const [sending, setSending] = useState(false);

  // Scheduled & Automated State
  const [scheduledNotes, setScheduledNotes] = useState<any[]>([]);
  const [automatedRules, setAutomatedRules] = useState<any[]>([]);

  useEffect(() => {
    if (role !== 'Super Admin') return;

    // Fetch users
    const fetchUsers = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchUsers();

    // Listen to scheduled notifications
    const qScheduled = query(collection(db, 'scheduled_notifications'), orderBy('scheduled_for', 'asc'));
    const unsubScheduled = onSnapshot(qScheduled, (snapshot) => {
      setScheduledNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to automated rules
    const qAutomated = query(collection(db, 'automated_notifications'));
    const unsubAutomated = onSnapshot(qAutomated, (snapshot) => {
      setAutomatedRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubScheduled();
      unsubAutomated();
    };
  }, [role]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      let targetUsers: any[] = [];
      
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

      if (sendForm.isScheduled) {
        if (!sendForm.scheduledDate || !sendForm.scheduledTime) {
          alert('تکایە کات و بەروار دیاری بکە.');
          setSending(false);
          return;
        }
        
        const scheduledDateTime = new Date(`${sendForm.scheduledDate}T${sendForm.scheduledTime}`).toISOString();
        
        await addDoc(collection(db, 'scheduled_notifications'), {
          title: sendForm.title,
          message: sendForm.message,
          url: sendForm.url || null,
          target: sendForm.target,
          targetUserId: sendForm.targetUserId,
          targetGroup: sendForm.targetGroup,
          scheduled_for: scheduledDateTime,
          created_at: new Date().toISOString(),
          status: 'pending'
        });
        
        alert('نۆتیفیکەیشن بە سەرکەوتوویی خشتەکرا.');
      } else {
        // Write in-app notifications to Firestore (one per user with user_id)
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

        // ── Send real FCM push via server API ──────────────────────────────
        try {
          const pushPayload: any = {
            title: sendForm.title,
            body: sendForm.message,
            data: { type: 'info', url: sendForm.url || '' }
          };

          if (sendForm.target === 'user') {
            pushPayload.userId = sendForm.targetUserId;
          } else if (sendForm.target === 'group') {
            pushPayload.targetRole = sendForm.targetGroup;
          }
          // 'all' → no userId / targetRole → server sends to everyone

          const res = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pushPayload)
          });
          const result = await res.json();
          console.log('[FCM] Push result:', result);
        } catch (pushErr) {
          console.error('[FCM] Push API call failed:', pushErr);
        }

        alert('نۆتیفیکەیشن بە سەرکەوتوویی نێردرا.');
      }

      setSendForm({ 
        title: '', message: '', url: '', target: 'all', targetUserId: '', targetGroup: 'Client',
        isScheduled: false, scheduledDate: '', scheduledTime: ''
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      alert('هەڵەیەک ڕوویدا لە ناردنی نۆتیفیکەیشن.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    if (window.confirm('دڵنیایت لە سڕینەوەی ئەم نۆتیفیکەیشنە خشتەکراوە؟')) {
      await deleteDoc(doc(db, 'scheduled_notifications', id));
    }
  };

  if (role !== 'Super Admin') {
    return <div className="p-8 text-center text-gray-500">تەنها ئەدمین دەتوانێت ئەم پەڕەیە ببینێت.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">سەنتەری ئاگادارکردنەوەکان</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'send' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Send className="w-4 h-4" />
            ناردن و خشتەکردن
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'scheduled' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            خشتەکراوەکان
          </button>
          <button
            onClick={() => setActiveTab('automated')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'automated' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            ئۆتۆماتیکی
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'send' && (
            <form onSubmit={handleSendNotification} className="space-y-6 max-w-3xl mx-auto">
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

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">دیاریکردنی نێرراو (Target)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${sendForm.target === 'all' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                      type="radio" 
                      name="target" 
                      value="all" 
                      checked={sendForm.target === 'all'}
                      onChange={() => setSendForm({...sendForm, target: 'all'})}
                      className="w-4 h-4 text-gray-900 focus:ring-gray-900" 
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">هەموو بەکارهێنەران</span>
                      <span className="text-xs text-gray-500">ناردن بۆ هەمووان</span>
                    </div>
                  </label>
                  
                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${sendForm.target === 'group' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                      type="radio" 
                      name="target" 
                      value="group" 
                      checked={sendForm.target === 'group'}
                      onChange={() => setSendForm({...sendForm, target: 'group'})}
                      className="w-4 h-4 text-gray-900 focus:ring-gray-900" 
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">گرووپێکی دیاریکراو</span>
                      <span className="text-xs text-gray-500">بەپێی ڕۆڵەکان</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${sendForm.target === 'user' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                      type="radio" 
                      name="target" 
                      value="user" 
                      checked={sendForm.target === 'user'}
                      onChange={() => setSendForm({...sendForm, target: 'user'})}
                      className="w-4 h-4 text-gray-900 focus:ring-gray-900" 
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">بەکارهێنەرێکی دیاریکراو</span>
                      <span className="text-xs text-gray-500">بەپێی ناو یان ئیمەیڵ</span>
                    </div>
                  </label>
                </div>

                {sendForm.target === 'group' && (
                  <div className="mt-4">
                    <select 
                      value={sendForm.targetGroup}
                      onChange={e => setSendForm({...sendForm, targetGroup: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="Client">مشتەرییەکان (Clients)</option>
                      <option value="Manager">بەڕێوەبەران (Managers)</option>
                      <option value="Marketing Specialist">مارکێتینگەکان</option>
                      <option value="Designer">دیزاینەرەکان</option>
                      <option value="Accountant">ژمێریاران</option>
                    </select>
                  </div>
                )}

                {sendForm.target === 'user' && (
                  <div className="mt-4">
                    <select 
                      value={sendForm.targetUserId}
                      onChange={e => setSendForm({...sendForm, targetUserId: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900"
                      required={sendForm.target === 'user'}
                    >
                      <option value="">هەڵبژێرە...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer mb-4">
                  <input 
                    type="checkbox" 
                    checked={sendForm.isScheduled}
                    onChange={e => setSendForm({...sendForm, isScheduled: e.target.checked})}
                    className="w-4 h-4 text-gray-900 rounded focus:ring-gray-900" 
                  />
                  <span className="text-sm font-medium text-gray-900">خشتەکردنی نۆتیفیکەیشن (Schedule)</span>
                </label>

                {sendForm.isScheduled && (
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">بەروار</label>
                      <input 
                        type="date" 
                        required={sendForm.isScheduled}
                        value={sendForm.scheduledDate}
                        onChange={e => setSendForm({...sendForm, scheduledDate: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">کات</label>
                      <input 
                        type="time" 
                        required={sendForm.isScheduled}
                        value={sendForm.scheduledTime}
                        onChange={e => setSendForm({...sendForm, scheduledTime: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit"
                  disabled={sending}
                  className="bg-gray-900 text-white px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-50 font-medium"
                >
                  {sendForm.isScheduled ? <Calendar className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  {sending ? 'چاوەڕێ بکە...' : (sendForm.isScheduled ? 'خشتەکردن' : 'ناردنی ئێستا')}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'scheduled' && (
            <div className="space-y-4">
              {scheduledNotes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>هیچ نۆتیفیکەیشنێکی خشتەکراو نییە.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {scheduledNotes.map(note => (
                    <div key={note.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <h3 className="font-semibold text-gray-900">{note.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{note.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(note.scheduled_for).toLocaleString('ku-IQ')}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> ئامانج: {note.target}</span>
                          <span className={`px-2 py-0.5 rounded-full ${note.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {note.status === 'pending' ? 'چاوەڕوانکراو' : 'نێردراو'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteScheduled(note.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="سڕینەوە"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'automated' && (
            <div className="space-y-6">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm flex items-start gap-3">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>
                  لەم بەشەدا دەتوانیت یاسا دابنێیت بۆ ناردنی نۆتیفیکەیشن بە شێوەی ئۆتۆماتیکی (بۆ نموونە: کاتێک کڕیارێکی نوێ زیاد دەکرێت، نامەیەکی بەخێرهاتنی بۆ بڕوات).
                </p>
              </div>

              <div className="grid gap-4">
                {/* Example Automated Rules - In a real app, these would be editable */}
                <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">بەخێرهاتنی کڕیاری نوێ</h4>
                    <p className="text-sm text-gray-500 mt-1">کاتێک ئەکاونتی کڕیار دروست دەکرێت، ڕاستەوخۆ نۆتیفیکەیشنی بەخێرهاتنی بۆ دەچێت.</p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none cursor-pointer" dir="ltr">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                  </div>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">بیرخستنەوەی پسوڵە (Invoice)</h4>
                    <p className="text-sm text-gray-500 mt-1">٣ ڕۆژ پێش وادەی کۆتایی پسوڵە، نۆتیفیکەیشن بۆ کڕیار دەچێت.</p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none cursor-pointer" dir="ltr">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
