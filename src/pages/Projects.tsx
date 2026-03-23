import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Trash2, Edit, Calendar, FolderPlus, X, Download } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';
import { exportToCSV } from '../utils/exportUtils';
import { logActivity } from '../utils/activityLogger';
import { useAuth } from '../contexts/AuthContext';

export default function Projects() {
  const { user, role, clientId } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ client_id: '', project_name: '', service_type: '', status: 'Pending', deadline: '', demoLink: '', stage: 'Planning' });

  useEffect(() => {
    let qProjects;
    let qClients;

    if (role === 'Client' && clientId) {
      qProjects = query(collection(db, 'projects'), where('client_id', '==', clientId));
      qClients = query(collection(db, 'clients'), where('__name__', '==', clientId));
    } else if (role !== 'Client') {
      qProjects = collection(db, 'projects');
      qClients = collection(db, 'clients');
    } else {
      return;
    }

    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    return () => { unsubProjects(); unsubClients(); };
  }, [role, clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'projects', editingId), {
          ...formData,
          updated_at: new Date().toISOString()
        });
        if (user) {
          logActivity(user.uid, user.email || '', 'UPDATE', 'project', editingId, `Updated project ${formData.project_name}`);
        }
        
        // Notify client about the update
        try {
          const usersQuery = query(collection(db, 'users'), where('client_id', '==', formData.client_id));
          const usersSnapshot = await getDocs(usersQuery);
          
          usersSnapshot.forEach(async (userDoc) => {
            await addDoc(collection(db, 'notifications'), {
              user_id: userDoc.id,
              title: 'نوێکاری لە پرۆژەکەت',
              message: `گۆڕانکاری لە پرۆژەی "${formData.project_name}" کرا. قۆناغی ئێستا: ${formData.stage}`,
              read: false,
              created_at: new Date().toISOString()
            });
          });
        } catch (notifErr) {
          console.error("Error sending notification to client:", notifErr);
        }
        
      } else {
        const docRef = await addDoc(collection(db, 'projects'), {
          ...formData,
          created_at: new Date().toISOString()
        });
        addNotification('پڕۆژەی نوێ', `پڕۆژەی "${formData.project_name}" زیادکرا`, 'project');
        if (user) {
          logActivity(user.uid, user.email || '', 'CREATE', 'project', docRef.id, `Created project ${formData.project_name}`);
        }
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'projects');
    }
  };

  const handleEdit = (project: any) => {
    setFormData({
      client_id: project.client_id || '',
      project_name: project.project_name || '',
      service_type: project.service_type || '',
      status: project.status || 'Pending',
      deadline: project.deadline || '',
      demoLink: project.demoLink || '',
      stage: project.stage || 'Planning'
    });
    setEditingId(project.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ client_id: '', project_name: '', service_type: '', status: 'Pending', deadline: '', demoLink: '', stage: 'Planning' });
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        const projectToDelete = projects.find(p => p.id === showDeleteModal);
        await deleteDoc(doc(db, 'projects', showDeleteModal));
        if (user) {
          logActivity(user.uid, user.email || '', 'DELETE', 'project', showDeleteModal, `Deleted project ${projectToDelete?.project_name || 'Unknown'}`);
        }
        setShowDeleteModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `projects/${showDeleteModal}`);
      }
    }
  };

  const getClientName = (id: string) => {
    return clients.find(c => c.id === id)?.name || 'نەناسراو';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30';
      case 'In Progress': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800/30';
      case 'Review': return 'bg-gray-200 dark:bg-gray-700/50 text-gray-900 dark:text-gray-300 border-gray-300 dark:border-gray-600';
      case 'Completed': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800/30';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const filteredProjects = projects.filter(project => 
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClientName(project.client_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const dataToExport = filteredProjects.map(project => ({
      'ناوی پرۆژە': project.project_name,
      'مشتەری': getClientName(project.client_id),
      'جۆری خزمەتگوزاری': project.service_type || '',
      'دۆخ': project.status === 'Pending' ? 'چاوەڕێکراو' : 
             project.status === 'In Progress' ? 'لە کارکردندایە' : 
             project.status === 'Review' ? 'پێداچوونەوە' : 
             project.status === 'Completed' ? 'تەواوکراو' : project.status,
      'وادە': project.deadline || '',
      'بەرواری دروستکردن': new Date(project.created_at).toLocaleDateString('en-GB')
    }));
    exportToCSV(dataToExport, 'projects_export');
    if (user) {
      logActivity(user.uid, user.email || '', 'EXPORT', 'project', 'all', 'Exported projects to CSV');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">پرۆژەکان</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">بەڕێوەبردن و چاودێریکردنی پرۆژەکانی ئەجێنسی</p>
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
              <FolderPlus className="w-5 h-5" />
              زیادکردنی پرۆژە
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
              placeholder="گەڕان بۆ پرۆژە یان مشتەری..." 
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
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">ناوی پرۆژە</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">مشتەری</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">جۆری خزمەتگوزاری</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">دۆخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">قۆناغ</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">وادە</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{project.project_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{getClientName(project.client_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      {project.service_type || 'نەزانراو'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                      {project.status === 'Pending' ? 'چاوەڕێکراو' : 
                       project.status === 'In Progress' ? 'لە کارکردندایە' : 
                       project.status === 'Review' ? 'پێداچوونەوە' : 
                       project.status === 'Completed' ? 'تەواوکراو' : project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30">
                      {project.stage === 'Planning' ? 'پلان دانان' :
                       project.stage === 'Design' ? 'دیزاین' :
                       project.stage === 'Development' ? 'گەشەپێدان' :
                       project.stage === 'Testing' ? 'تاقیکردنەوە' :
                       project.stage === 'Completed' ? 'تەواوکراو' : project.stage || 'پلان دانان'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2" dir="ltr">
                      {project.deadline && <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      <span>{project.deadline || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {role !== 'Client' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(project)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="دەستکاریکردن">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteModal(project.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="سڕینەوە">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">هیچ پرۆژەیەک نەدۆزرایەوە</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">وشەیەکی تر تاقی بکەرەوە یان پرۆژەی نوێ زیاد بکە.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'دەستکاریکردنی پرۆژە' : 'زیادکردنی پرۆژەی نوێ'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ناوی پرۆژە <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" placeholder="ناوی پرۆژە بنووسە..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">مشتەری <span className="text-red-500">*</span></label>
                  <select required value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow">
                    <option value="">هەڵبژاردنی مشتەری...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">جۆری خزمەتگوزاری</label>
                  <input type="text" value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" placeholder="نموونە: وێبسایت، سۆشیاڵ میدیا..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">دۆخ</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow">
                    <option value="Pending">چاوەڕێکراو (Pending)</option>
                    <option value="In Progress">لە کارکردندایە (In Progress)</option>
                    <option value="Review">پێداچوونەوە (Review)</option>
                    <option value="Completed">تەواوکراو (Completed)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">قۆناغی پرۆژە (Stage)</label>
                  <select value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow">
                    <option value="Planning">پلان دانان (Planning)</option>
                    <option value="Design">دیزاین (Design)</option>
                    <option value="Development">گەشەپێدان (Development)</option>
                    <option value="Testing">تاقیکردنەوە (Testing)</option>
                    <option value="Completed">تەواوکراو (Completed)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">لینکی دێمۆ (Demo Link)</label>
                  <input type="url" value={formData.demoLink} onChange={e => setFormData({...formData, demoLink: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" placeholder="https://..." dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">وادە (Deadline)</label>
                  <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" />
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">سڕینەوەی پرۆژە</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">ئایا دڵنیایت لە سڕینەوەی ئەم پرۆژەیە؟ ئەم کردارە ناگەڕێتەوە.</p>
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
