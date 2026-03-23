import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Trash2, Edit, Monitor, Smartphone, Globe, Code, X, ExternalLink } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';

import { useAuth } from '../contexts/AuthContext';

export default function MasTech() {
  const { role, clientId } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ client_id: '', service_name: '', type: 'Website', price: 0, status: 'In Progress', demoLink: '', stage: 'Planning' });

  useEffect(() => {
    let qServices;
    let qClients;

    if (role === 'Client' && clientId) {
      qServices = query(collection(db, 'tech_services'), where('client_id', '==', clientId));
      qClients = query(collection(db, 'clients'), where('__name__', '==', clientId));
    } else if (role !== 'Client') {
      qServices = collection(db, 'tech_services');
      qClients = collection(db, 'clients');
    } else {
      return;
    }

    const unsubServices = onSnapshot(qServices, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tech_services');
    });
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    return () => { unsubServices(); unsubClients(); };
  }, [role, clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'tech_services', editingId), {
          ...formData,
          price: Number(formData.price),
          updated_at: new Date().toISOString()
        });

        // Notify client about the update
        try {
          const usersQuery = query(collection(db, 'users'), where('client_id', '==', formData.client_id));
          const usersSnapshot = await getDocs(usersQuery);
          
          usersSnapshot.forEach(async (userDoc) => {
            await addDoc(collection(db, 'notifications'), {
              user_id: userDoc.id,
              title: 'نوێکاری لە خزمەتگوزاری تەکنەلۆژی',
              message: `گۆڕانکاری لە خزمەتگوزاری "${formData.service_name}" کرا. قۆناغی ئێستا: ${formData.stage}`,
              type: 'project',
              read: false,
              created_at: new Date().toISOString()
            });
          });
        } catch (notifErr) {
          console.error("Error sending notification to client:", notifErr);
        }

      } else {
        await addDoc(collection(db, 'tech_services'), {
          ...formData,
          price: Number(formData.price),
          created_at: new Date().toISOString()
        });
        addNotification('خزمەتگوزاری نوێ', `خزمەتگوزاری "${formData.service_name}" زیادکرا`, 'info');
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'tech_services');
    }
  };

  const handleEdit = (service: any) => {
    setFormData({
      client_id: service.client_id || '',
      service_name: service.service_name || '',
      type: service.type || 'Website',
      price: service.price || 0,
      status: service.status || 'In Progress',
      demoLink: service.demoLink || '',
      stage: service.stage || 'Planning'
    });
    setEditingId(service.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ client_id: '', service_name: '', type: 'Website', price: 0, status: 'In Progress', demoLink: '', stage: 'Planning' });
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, 'tech_services', showDeleteModal));
        setShowDeleteModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tech_services/${showDeleteModal}`);
      }
    }
  };

  const getClientName = (id: string) => {
    return clients.find(c => c.id === id)?.name || 'نەناسراو';
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'Website': return <Globe className="w-5 h-5 text-blue-500" />;
      case 'Mobile App': return <Smartphone className="w-5 h-5 text-green-500" />;
      case 'POS System': return <Monitor className="w-5 h-5 text-gray-900" />;
      case 'Custom Software': return <Code className="w-5 h-5 text-orange-500" />;
      case 'Digital Menu': return <Smartphone className="w-5 h-5 text-gray-900" />;
      default: return <Globe className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredServices = services.filter(service => 
    service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClientName(service.client_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تەکنەلۆجیای MAS</h1>
          <p className="text-gray-500 text-sm mt-1">بەڕێوەبردنی خزمەتگوزارییە تەکنەلۆجییەکان</p>
        </div>
        {role !== 'Client' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-sm hover:shadow-md font-medium"
          >
            <Plus className="w-5 h-5" />
            خزمەتگوزاری نوێ
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="گەڕان بۆ خزمەتگوزاری یان مشتەری..." 
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
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">ناوی خزمەتگوزاری</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">مشتەری</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">جۆر</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">قۆناغ</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">دۆخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{service.service_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{getClientName(service.client_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    {getTypeIcon(service.type)} {service.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                    {service.stage === 'Planning' ? 'پلان دانان' :
                     service.stage === 'Design' ? 'دیزاین' :
                     service.stage === 'Development' ? 'گەشەپێدان' :
                     service.stage === 'Testing' ? 'تاقیکردنەوە' :
                     service.stage === 'Completed' ? 'تەواوکراو' : service.stage || 'پلان دانان'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${service.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                      {service.status === 'Completed' ? 'تەواوکراو' : 'لە کارکردندایە'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      {service.demoLink && (
                        <a href={service.demoLink} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="بینینی دێمۆ">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {role !== 'Client' && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(service)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="دەستکاریکردن">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setShowDeleteModal(service.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="سڕینەوە">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">هیچ خزمەتگوزارییەک نەدۆزرایەوە</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">وشەیەکی تر تاقی بکەرەوە یان خزمەتگوزاری نوێ زیاد بکە.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'دەستکاریکردنی خزمەتگوزاری' : 'زیادکردنی خزمەتگوزاری نوێ'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ناوی خزمەتگوزاری <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.service_name} onChange={e => setFormData({...formData, service_name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow" placeholder="ناوی خزمەتگوزاری بنووسە..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">مشتەری <span className="text-red-500">*</span></label>
                  <select required value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow">
                    <option value="">هەڵبژاردنی مشتەری...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">جۆر</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow">
                    <option value="Website">وێبسایت (Website)</option>
                    <option value="Mobile App">ئەپڵیکەیشن (Mobile App)</option>
                    <option value="POS System">سیستەمی کاشێر (POS System)</option>
                    <option value="Custom Software">سۆفتوێری تایبەت</option>
                    <option value="Digital Menu">مێنوی دیجیتاڵی (Digital Menu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">نرخ (USD) <span className="text-red-500">*</span></label>
                  <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow" dir="ltr" placeholder="0.00" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">دۆخ</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow">
                    <option value="In Progress">لە کارکردندایە</option>
                    <option value="Completed">تەواوکراو</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">قۆناغی ئێستا</label>
                  <select value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow">
                    <option value="Planning">پلان دانان (Planning)</option>
                    <option value="Design">دیزاین (Design)</option>
                    <option value="Development">گەشەپێدان (Development)</option>
                    <option value="Testing">تاقیکردنەوە (Testing)</option>
                    <option value="Completed">تەواوکراو (Completed)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">لینکی دێمۆ (ئارەزوومەندانە)</label>
                  <input type="url" value={formData.demoLink} onChange={e => setFormData({...formData, demoLink: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-shadow" placeholder="https://demo.example.com" dir="ltr" />
                  <p className="text-xs text-gray-500 mt-1">ئەم لینکە لە کلاینت پۆرتال پیشان دەدرێت بۆ ئەوەی کڕیار بتوانێت پرۆژەکەی ببینێت.</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">پاشگەزبوونەوە</button>
                <button type="submit" className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-medium transition-colors shadow-sm hover:shadow-md">
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
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">سڕینەوەی خزمەتگوزاری</h3>
            <p className="text-gray-500 mb-8">ئایا دڵنیایت لە سڕینەوەی ئەم خزمەتگوزارییە؟ ئەم کردارە ناگەڕێتەوە.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors w-full">پاشگەزبوونەوە</button>
              <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors shadow-sm hover:shadow-md w-full">سڕینەوە</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
