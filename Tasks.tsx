import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, Users, Briefcase, FileText, CheckSquare, Target } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

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
        <button 
          onClick={markAllAsRead}
          className="text-sm text-gray-900 font-medium hover:text-black bg-gray-100 px-4 py-2 rounded-xl"
        >
          خوێندنەوەی هەمووی
        </button>
      </div>

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
    </div>
  );
}
