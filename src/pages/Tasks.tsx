import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Trash2, Edit, X, CheckSquare, Clock, CheckCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '', status: 'To Do', deadline: '' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'tasks', editingId), {
          ...formData,
          updated_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...formData,
          created_at: new Date().toISOString()
        });
        addNotification('ئەرکی نوێ', `ئەرکی "${formData.title}" زیادکرا`, 'task');
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'tasks');
    }
  };

  const handleEdit = (task: any) => {
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'To Do',
      deadline: task.deadline || ''
    });
    setEditingId(task.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ title: '', description: '', status: 'To Do', deadline: '' });
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, 'tasks', showDeleteModal));
        setShowDeleteModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tasks/${showDeleteModal}`);
      }
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { status: newStatus });
      if (newStatus === 'Done') {
        const task = tasks.find(t => t.id === id);
        if (task) {
          addNotification('ئەرک تەواوکرا', `ئەرکی "${task.title}" تەواوکرا`, 'success');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const todoTasks = filteredTasks.filter(t => t.status === 'To Do');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'In Progress');
  const doneTasks = filteredTasks.filter(t => t.status === 'Done');

  const renderTaskCard = (task: any) => (
    <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 group hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-gray-900">{task.title}</h4>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => handleEdit(task)} className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => setShowDeleteModal(task.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {task.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
        {task.deadline ? (
          <span className="text-xs text-gray-500 flex items-center gap-1" dir="ltr">
            <Clock className="w-3 h-3" /> {task.deadline}
          </span>
        ) : <span></span>}
        <select 
          value={task.status} 
          onChange={(e) => updateStatus(task.id, e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer ${
            task.status === 'To Do' ? 'bg-gray-100 text-gray-700' : 
            task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 
            'bg-green-100 text-green-700'
          }`}
        >
          <option value="To Do">بکرێت</option>
          <option value="In Progress">لە کارکردندایە</option>
          <option value="Done">تەواوکراو</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ئەرکەکان (Tasks)</h1>
          <p className="text-gray-500 text-sm mt-1">بەڕێوەبردنی ئەرکەکانی ڕۆژانە و پڕۆژەکان</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          ئەرکی نوێ
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder="گەڕان بۆ ئەرک..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-700">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900">بکرێت (To Do)</h3>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full mr-auto">{todoTasks.length}</span>
          </div>
          <div className="space-y-3">
            {todoTasks.map(renderTaskCard)}
            {todoTasks.length === 0 && <p className="text-center text-gray-400 text-sm py-4">هیچ ئەرکێک نییە</p>}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-100/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900">لە کارکردندایە</h3>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full mr-auto">{inProgressTasks.length}</span>
          </div>
          <div className="space-y-3">
            {inProgressTasks.map(renderTaskCard)}
            {inProgressTasks.length === 0 && <p className="text-center text-gray-400 text-sm py-4">هیچ ئەرکێک نییە</p>}
          </div>
        </div>

        {/* Done Column */}
        <div className="bg-green-50/30 rounded-2xl p-4 border border-green-100/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900">تەواوکراو</h3>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full mr-auto">{doneTasks.length}</span>
          </div>
          <div className="space-y-3">
            {doneTasks.map(renderTaskCard)}
            {doneTasks.length === 0 && <p className="text-center text-gray-400 text-sm py-4">هیچ ئەرکێک نییە</p>}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'دەستکاریکردنی ئەرک' : 'ئەرکی نوێ'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ناونیشانی ئەرک <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">وەسف</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">دۆخ</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900">
                    <option value="To Do">بکرێت</option>
                    <option value="In Progress">لە کارکردندایە</option>
                    <option value="Done">تەواوکراو</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">دوا مۆڵەت (Deadline)</label>
                  <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900" />
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">سڕینەوەی ئەرک</h3>
            <p className="text-gray-500 mb-6">ئایا دڵنیایت لە سڕینەوەی ئەم ئەرکە؟</p>
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
