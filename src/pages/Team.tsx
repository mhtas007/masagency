import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Trash2, Edit, X, Shield, User } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';

export default function Team() {
  const { role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Marketing Specialist' });

  const isAdmin = role === 'Super Admin';

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), {
          ...formData,
          updated_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'users'), {
          ...formData,
          created_at: new Date().toISOString()
        });
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'users');
    }
  };

  const handleEdit = (user: any) => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'Marketing Specialist'
    });
    setEditingId(user.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', email: '', role: 'Marketing Specialist' });
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, 'users', showDeleteModal));
        setShowDeleteModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${showDeleteModal}`);
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تیم و دەسەڵاتەکان</h1>
          <p className="text-gray-500 text-sm mt-1">بەڕێوەبردنی کارمەندان و دیاریکردنی دەسەڵاتەکانیان</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            کارمەندی نوێ
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="گەڕان بۆ ناو یان ئیمەیڵ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white shadow-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">ناو</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">ئیمەیڵ</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">ڕۆڵ (دەسەڵات)</th>
                {isAdmin && <th className="px-6 py-4 text-sm font-semibold text-gray-600">کردارەکان</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <p className="text-sm font-bold text-gray-900">{u.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600" dir="ltr">{u.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${u.role === 'Super Admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                      {u.role}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(u)} className="p-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteModal(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center text-gray-500">
                    <Shield className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">هیچ کارمەندێک نەدۆزرایەوە</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'دەستکاریکردنی کارمەند' : 'زیادکردنی کارمەند'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ناو <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ئیمەیڵ <span className="text-red-500">*</span></label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" dir="ltr" />
                <p className="text-xs text-gray-500 mt-1">ئەم ئیمەیڵە دەبێت پێشتر لە سیستەمەکەدا (Firebase Auth) تۆمارکرابێت.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ڕۆڵ (دەسەڵات)</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900">
                  <option value="Super Admin">بەڕێوەبەری گشتی (Super Admin)</option>
                  <option value="Manager">بەڕێوەبەر (Manager)</option>
                  <option value="Marketing Specialist">شارەزای مارکێتینگ</option>
                  <option value="Designer">دیزاینەر</option>
                  <option value="Accountant">ژمێریار</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">پاشگەزبوونەوە</button>
                <button type="submit" className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-medium">
                  {editingId ? 'نوێکردنەوە' : 'پاشەکەوتکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">سڕینەوە</h3>
            <p className="text-gray-500 mb-6">ئایا دڵنیایت لە سڕینەوەی ئەم کارمەندە؟</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium w-full">پاشگەزبوونەوە</button>
              <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium w-full">سڕینەوە</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
