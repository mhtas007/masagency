import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Trash2, ArrowUpRight, ArrowDownRight, Edit, X, DollarSign } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';

import { useAuth } from '../contexts/AuthContext';

export default function Finance() {
  const { role } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ description: '', amount: 0, type: 'Income', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (role === 'Client') return;

    const unsub = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });
    return () => unsub();
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'transactions', editingId), {
          ...formData,
          amount: Number(formData.amount),
          updated_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...formData,
          amount: Number(formData.amount),
          created_at: new Date().toISOString()
        });
        const typeText = formData.type === 'Income' ? 'داهات' : 'خەرجی';
        addNotification(`تۆماری دارایی نوێ (${typeText})`, `بڕی $${formData.amount} تۆمارکرا بۆ: ${formData.description}`, formData.type === 'Income' ? 'success' : 'warning');
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
    }
  };

  const handleEdit = (transaction: any) => {
    setFormData({
      description: transaction.description || '',
      amount: transaction.amount || 0,
      type: transaction.type || 'Income',
      date: transaction.date || new Date().toISOString().split('T')[0]
    });
    setEditingId(transaction.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ description: '', amount: 0, type: 'Income', date: new Date().toISOString().split('T')[0] });
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, 'transactions', showDeleteModal));
        setShowDeleteModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `transactions/${showDeleteModal}`);
      }
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">سیستەمی دارایی</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">بەڕێوەبردنی داهات و خەرجییەکان</p>
        </div>
        {role !== 'Client' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <Plus className="w-5 h-5" />
            تۆمارکردنی نوێ
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">کۆی داهات (USD)</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">${totalIncome.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <ArrowDownRight className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">کۆی خەرجی (USD)</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">${totalExpense.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-900 dark:text-white group-hover:scale-110 transition-transform">
              <DollarSign className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">قازانجی سافی (USD)</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">${(totalIncome - totalExpense).toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="گەڕان بۆ وەسف..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm transition-shadow"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">وەسف</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">بەروار</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">جۆر</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">بڕ (USD)</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{t.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300" dir="ltr">{t.date}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${t.type === 'Income' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}`}>
                      {t.type === 'Income' ? 'داهات' : 'خەرجی'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold" dir="ltr">
                    <span className={t.type === 'Income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {t.type === 'Income' ? '+' : '-'}${t.amount?.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {role !== 'Client' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="دەستکاریکردن">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteModal(t.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="سڕینەوە">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">هیچ تۆمارێک نەدۆزرایەوە</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">وشەیەکی تر تاقی بکەرەوە یان تۆمارێکی نوێ زیاد بکە.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'دەستکاریکردنی تۆمار' : 'تۆمارکردنی دارایی نوێ'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">وەسف <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" placeholder="نموونە: کڕینی لاپتۆپ، داهاتی پرۆژە..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">جۆر</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow">
                    <option value="Income">داهات (Income)</option>
                    <option value="Expense">خەرجی (Expense)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">بڕ (USD) <span className="text-red-500">*</span></label>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" dir="ltr" placeholder="0.00" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">بەروار <span className="text-red-500">*</span></label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors">پاشگەزبوونەوە</button>
                <button type="submit" className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 font-medium transition-colors shadow-sm hover:shadow-md">
                  {editingId ? 'نوێکردنەوە' : 'پاشەکەوتکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">سڕینەوەی تۆمار</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">ئایا دڵنیایت لە سڕینەوەی ئەم تۆمارە؟ ئەم کردارە ناگەڕێتەوە.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors w-full">پاشگەزبوونەوە</button>
              <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors shadow-sm hover:shadow-md w-full">سڕینەوە</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
