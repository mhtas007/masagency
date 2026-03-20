import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, writeBatch, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch notifications for the current user
    const q = query(
      collection(db, 'notifications'), 
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [user]);

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

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ئاگادارکردنەوەکان</h1>
        <button 
          onClick={markAllAsRead}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          هەمووی بکە بە خوێندراوە
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <Bell className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg">هیچ ئاگادارکردنەوەیەک نییە</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 transition-colors hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50/30' : ''}`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex gap-4">
                  <div className="mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap mr-4">
                        {new Date(notification.created_at).toLocaleDateString('ku-IQ')}
                      </span>
                    </div>
                    <p className={`text-sm ${!notification.read ? 'text-gray-800' : 'text-gray-500'}`}>
                      {notification.message}
                    </p>
                    {notification.url && (
                      <a 
                        href={notification.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        بینینی زیاتر
                      </a>
                    )}
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
