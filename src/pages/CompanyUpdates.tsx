import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';

export default function CompanyUpdates() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'company_updates'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'company_updates');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'company_updates', editingId), {
          ...formData,
          updated_at: new Date().toISOString()
        });
        addNotification('سەرکەوتوو بوو', 'نوێکردنەوەکە بە سەرکەوتوویی گۆڕدرا', 'success');
      } else {
        await addDoc(collection(db, 'company_updates'), {
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        addNotification('سەرکەوتوو بوو', 'نوێکردنەوەیەکی نوێ زیادکرا', 'success');
      }
      setIsModalOpen(false);
      setFormData({ title: '', description: '', image_url: '' });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'company_updates');
    }
  };

  const handleEdit = (update: any) => {
    setFormData({
      title: update.title,
      description: update.description,
      image_url: update.image_url
    });
    setEditingId(update.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('دڵنیایت لە سڕینەوەی ئەم نوێکردنەوەیە؟')) {
      try {
        await deleteDoc(doc(db, 'company_updates', id));
        addNotification('سەرکەوتوو بوو', 'نوێکردنەوەکە سڕایەوە', 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `company_updates/${id}`);
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">چاوەڕێ بکە...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            نوێترین کارەکانمان
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">بەڕێوەبردنی ئەو کارانەی کە لە پۆرتاڵی کڕیاران دەردەکەون</p>
        </div>
        <button
          onClick={() => {
            setFormData({ title: '', description: '', image_url: '' });
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          زیادکردنی نوێ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {updates.map(update => (
          <div key={update.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="relative h-56 overflow-hidden">
              <img 
                src={update.image_url} 
                alt={update.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                <button
                  onClick={() => handleEdit(update)}
                  className="p-2.5 bg-white/90 dark:bg-gray-800/90 rounded-xl text-blue-600 hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-lg backdrop-blur-md"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(update.id)}
                  className="p-2.5 bg-white/90 dark:bg-gray-800/90 rounded-xl text-red-600 hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-lg backdrop-blur-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/20 shadow-sm">
                  {new Date(update.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3 line-clamp-1">{update.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed">{update.description}</p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'دەستکاریکردنی کار' : 'زیادکردنی کاری نوێ'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ناونیشان</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                  placeholder="ناوی پرۆژە یان کارەکە..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">بەستەری وێنە (URL)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    required
                    type="url"
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full p-2.5 pr-10 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                    dir="ltr"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">وردەکاری</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-shadow resize-none"
                  placeholder="زانیاری زیاتر دەربارەی ئەم کارە..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {editingId ? 'پاشەکەوتکردن' : 'زیادکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
