import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Trash2, Edit, X, Target, Phone, Mail, Building2, UserPlus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', company: '', phone: '', email: '', status: 'New', notes: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'leads'), (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leads');
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'leads', editingId), {
          ...formData,
          updated_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'leads'), {
          ...formData,
          created_at: new Date().toISOString()
        });
        addNotification('چاوەڕوانکراوی نوێ', `چاوەڕوانکراوی "${formData.name}" زیادکرا`, 'lead');
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'leads');
    }
  };

  const handleEdit = (lead: any) => {
    setFormData({
      name: lead.name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      email: lead.email || '',
      status: lead.status || 'New',
      notes: lead.notes || ''
    });
    setEditingId(lead.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', company: '', phone: '', email: '', status: 'New', notes: '' });
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, 'leads', showDeleteModal));
        setShowDeleteModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `leads/${showDeleteModal}`);
      }
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'leads', id), { status: newStatus });
      if (newStatus === 'Converted') {
        const lead = leads.find(l => l.id === id);
        if (lead) {
          addNotification('سەرکەوتن!', `چاوەڕوانکراو "${lead.name}" بوو بە مشتەری`, 'success');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${id}`);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.company && l.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (l.phone && l.phone.includes(searchTerm))
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Contacted': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Qualified': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Lost': return 'bg-red-100 text-red-700 border-red-200';
      case 'Converted': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'New': return 'نوێ';
      case 'Contacted': return 'پەیوەندی پێوەکراوە';
      case 'Qualified': return 'گونجاوە';
      case 'Lost': return 'لەدەستچوو';
      case 'Converted': return 'بوو بە مشتەری';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">چاوەڕوانکراوەکان (Leads)</h1>
          <p className="text-gray-500 text-sm mt-1">بەڕێوەبردنی ئەو کەسانەی کە هێشتا نەبوونەتە مشتەری</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-sm font-medium"
        >
          <UserPlus className="w-5 h-5" />
          زیادکردنی نوێ
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="گەڕان بۆ ناو، کۆمپانیا، یان تەلەفۆن..." 
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
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">کۆمپانیا</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">پەیوەندی</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">دۆخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{lead.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {lead.company ? (
                      <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-gray-400" /> {lead.company}</span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 space-y-1">
                    {lead.phone && <div className="flex items-center gap-1.5" dir="ltr"><Phone className="w-3 h-3 text-gray-400" /> {lead.phone}</div>}
                    {lead.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400" /> {lead.email}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select 
                      value={lead.status} 
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900 ${getStatusColor(lead.status)}`}
                    >
                      <option value="New">نوێ</option>
                      <option value="Contacted">پەیوەندی پێوەکراوە</option>
                      <option value="Qualified">گونجاوە</option>
                      <option value="Lost">لەدەستچوو</option>
                      <option value="Converted">بوو بە مشتەری</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(lead)} className="p-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowDeleteModal(lead.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Target className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">هیچ چاوەڕوانکراوێک نەدۆزرایەوە</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'دەستکاریکردنی زانیاری' : 'زیادکردنی نوێ'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ناوی کەس <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ناوی کۆمپانیا / براند</label>
                  <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ژمارە تەلەفۆن</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ئیمەیڵ</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">دۆخ</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900">
                    <option value="New">نوێ</option>
                    <option value="Contacted">پەیوەندی پێوەکراوە</option>
                    <option value="Qualified">گونجاوە</option>
                    <option value="Lost">لەدەستچوو</option>
                    <option value="Converted">بوو بە مشتەری</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">تێبینی</label>
                  <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900"></textarea>
                </div>
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
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">سڕینەوە</h3>
            <p className="text-gray-500 mb-6">ئایا دڵنیایت لە سڕینەوەی ئەم تۆمارە؟</p>
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
