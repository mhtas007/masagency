import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Trash2, Edit, X, UserPlus, Phone, Mail, Building, Download, Key } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';
import { exportToCSV } from '../utils/exportUtils';
import { logActivity } from '../utils/activityLogger';
import { useAuth } from '../contexts/AuthContext';
import CreatePortalModal from '../components/CreatePortalModal';

export default function Clients() {
  const { user, role, clientId } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showPortalModal, setShowPortalModal] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', company: '', phone: '', email: '', notes: '' });

  useEffect(() => {
    let q;
    if (role === 'Client' && clientId) {
      q = query(collection(db, 'clients'), where('__name__', '==', clientId));
    } else if (role !== 'Client') {
      q = collection(db, 'clients');
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    return () => unsubscribe();
  }, [role, clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'clients', editingId), {
          ...formData,
          updated_at: new Date().toISOString()
        });
        if (user) {
          logActivity(user.uid, user.email || '', 'UPDATE', 'client', editingId, `Updated client ${formData.name}`);
        }
      } else {
        const docRef = await addDoc(collection(db, 'clients'), {
          ...formData,
          created_at: new Date().toISOString()
        });
        addNotification('مشتەری نوێ', `مشتەری "${formData.name}" زیادکرا`, 'client');
        if (user) {
          logActivity(user.uid, user.email || '', 'CREATE', 'client', docRef.id, `Created client ${formData.name}`);
        }
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'clients');
    }
  };

  const handleEdit = (client: any) => {
    setFormData({
      name: client.name || '',
      company: client.company || '',
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || ''
    });
    setEditingId(client.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', company: '', phone: '', email: '', notes: '' });
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        const clientToDelete = clients.find(c => c.id === showDeleteModal);
        await deleteDoc(doc(db, 'clients', showDeleteModal));
        if (user) {
          logActivity(user.uid, user.email || '', 'DELETE', 'client', showDeleteModal, `Deleted client ${clientToDelete?.name || 'Unknown'}`);
        }
        setShowDeleteModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `clients/${showDeleteModal}`);
      }
    }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const dataToExport = filteredClients.map(client => ({
      'ناو': client.name,
      'کۆمپانیا': client.company,
      'مۆبایل': client.phone || '',
      'ئیمەیڵ': client.email || '',
      'تێبینی': client.notes || '',
      'بەرواری دروستکردن': new Date(client.created_at).toLocaleDateString('en-GB')
    }));
    exportToCSV(dataToExport, 'clients_export');
    if (user) {
      logActivity(user.uid, user.email || '', 'EXPORT', 'client', 'all', 'Exported clients to CSV');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مشتەرییەکان (CRM)</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">بەڕێوەبردنی زانیاری و پەیوەندییەکانی مشتەرییەکانت</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm font-medium"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">هەناردەکردن</span>
          </button>
          {role !== 'Client' && (
            <button 
              onClick={() => setShowModal(true)}
              className="bg-gray-900 dark:bg-primary text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black dark:hover:bg-primary/90 transition-all shadow-sm hover:shadow-md font-medium"
            >
              <UserPlus className="w-5 h-5" />
              زیادکردنی مشتەری
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="گەڕان بۆ مشتەری یان کۆمپانیا..." 
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
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">ناو</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">کۆمپانیا</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">پەیوەندی</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-center font-bold text-lg">
                        {client.name.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white font-medium">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Building className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {client.company}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                      {client.phone && (
                        <div className="flex items-center gap-2" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          <span className="text-right w-full">{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          <span dir="ltr">{client.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {role !== 'Client' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!client.has_portal && (
                          <button onClick={() => setShowPortalModal(client)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="دروستکردنی هەژماری پۆرتاڵ">
                            <Key className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleEdit(client)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="دەستکاریکردن">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteModal(client.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="سڕینەوە">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">هیچ مشتەرییەک نەدۆزرایەوە</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">وشەیەکی تر تاقی بکەرەوە یان مشتەری نوێ زیاد بکە.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'دەستکاریکردنی مشتەری' : 'زیادکردنی مشتەری نوێ'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ناوی مشتەری <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="ناوی تەواو" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ناوی کۆمپانیا <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="ناوی کۆمپانیا یان براند" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ژمارە مۆبایل</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white" dir="ltr" placeholder="0770 000 0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ئیمەیڵ</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white" dir="ltr" placeholder="example@domain.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">تێبینی زیاتر</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow h-24 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="هەر زانیارییەکی تر..."></textarea>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors">پاشگەزبوونەوە</button>
                <button type="submit" className="px-5 py-2.5 bg-gray-900 dark:bg-primary text-white rounded-xl hover:bg-black dark:hover:bg-primary/90 font-medium transition-colors shadow-sm hover:shadow-md">
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">سڕینەوەی مشتەری</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">ئایا دڵنیایت لە سڕینەوەی ئەم مشتەرییە؟ ئەم کردارە ناگەڕێتەوە و هەموو داتاکانی پەیوەست بەم مشتەرییە لەدەست دەچن.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors w-full">پاشگەزبوونەوە</button>
              <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors shadow-sm hover:shadow-md w-full">سڕینەوە</button>
            </div>
          </div>
        </div>
      )}
      {/* Create Portal Modal */}
      {showPortalModal && (
        <CreatePortalModal 
          client={showPortalModal} 
          onClose={() => setShowPortalModal(null)} 
        />
      )}
    </div>
  );
}
