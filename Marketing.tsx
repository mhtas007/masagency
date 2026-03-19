import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, secondaryAuth } from '../firebase';
import { X, Key } from 'lucide-react';
import { addNotification } from '../utils/notifications';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface CreatePortalModalProps {
  client: any;
  onClose: () => void;
}

export default function CreatePortalModal({ client, onClose }: CreatePortalModalProps) {
  const [email, setEmail] = useState(client.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create user in Firebase Auth using secondary app to avoid signing out current user
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;

      // Add user to users collection
      await setDoc(doc(db, 'users', newUser.uid), {
        name: client.name,
        email: email,
        role: 'Client',
        client_id: client.id,
        created_at: new Date().toISOString()
      });

      // Update client to indicate they have a portal account
      await updateDoc(doc(db, 'clients', client.id), {
        has_portal: true,
        updated_at: new Date().toISOString()
      });

      addNotification('هەژمار دروستکرا', `هەژماری پۆرتاڵ بۆ ${client.name} دروستکرا`, 'success');
      onClose();
    } catch (err: any) {
      console.error("Error creating portal account:", err);
      setError(err.message || 'هەڵەیەک ڕوویدا لە کاتی دروستکردنی هەژمار');
      if (err.code !== 'auth/email-already-in-use') {
        handleFirestoreError(err, OperationType.CREATE, 'users');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            دروستکردنی هەژماری پۆرتاڵ
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ئیمەیڵ</label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-shadow" 
              dir="ltr" 
              placeholder="client@example.com" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">پاسۆرد</label>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-shadow" 
              dir="ltr" 
              minLength={6}
              placeholder="لانی کەم ٦ پیت/ژمارە" 
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors">
              پاشگەزبوونەوە
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium transition-colors shadow-sm hover:shadow-md disabled:opacity-50">
              {loading ? 'چاوەڕێ بکە...' : 'دروستکردن'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
