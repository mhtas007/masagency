import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Trash2, Edit, Facebook, Instagram, Twitter, Youtube, Megaphone, X, FileText, Calendar, CheckCircle, Clock } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';

import { useAuth } from '../contexts/AuthContext';

export default function Marketing() {
  const { role, clientId } = useAuth();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'contracts'>('campaigns');
  
  // Campaigns State
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ client_id: '', campaign_name: '', platform: 'Facebook', budget: 0, status: 'Active' });

  // Contracts State
  const [contracts, setContracts] = useState<any[]>([]);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showDeleteContractModal, setShowDeleteContractModal] = useState<string | null>(null);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [contractFormData, setContractFormData] = useState({ 
    client_id: '', 
    contract_name: 'بەڕێوەبردنی سۆشیاڵ میدیا', 
    duration_months: 6, 
    monthly_fee: 0, 
    paid_months: 0, 
    start_date: new Date().toISOString().split('T')[0], 
    status: 'Active' 
  });

  // Shared State
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let qCampaigns;
    let qContracts;
    let qClients;

    if (role === 'Client' && clientId) {
      qCampaigns = query(collection(db, 'campaigns'), where('client_id', '==', clientId));
      qContracts = query(collection(db, 'social_contracts'), where('client_id', '==', clientId));
      qClients = query(collection(db, 'clients'), where('__name__', '==', clientId));
    } else if (role !== 'Client') {
      qCampaigns = collection(db, 'campaigns');
      qContracts = collection(db, 'social_contracts');
      qClients = collection(db, 'clients');
    } else {
      return;
    }

    const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
      setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'campaigns');
    });
    
    const unsubContracts = onSnapshot(qContracts, (snapshot) => {
      setContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'social_contracts');
    });

    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    
    return () => { unsubCampaigns(); unsubContracts(); unsubClients(); };
  }, [role, clientId]);

  // --- Campaign Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'campaigns', editingId), {
          ...formData,
          budget: Number(formData.budget),
          updated_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'campaigns'), {
          ...formData,
          budget: Number(formData.budget),
          created_at: new Date().toISOString()
        });
        addNotification('کەمپەینی نوێ', `کەمپەینی "${formData.campaign_name}" زیادکرا`, 'info');
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'campaigns');
    }
  };

  const handleEdit = (campaign: any) => {
    setFormData({
      client_id: campaign.client_id || '',
      campaign_name: campaign.campaign_name || '',
      platform: campaign.platform || 'Facebook',
      budget: campaign.budget || 0,
      status: campaign.status || 'Active'
    });
    setEditingId(campaign.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ client_id: '', campaign_name: '', platform: 'Facebook', budget: 0, status: 'Active' });
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, 'campaigns', showDeleteModal));
        setShowDeleteModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `campaigns/${showDeleteModal}`);
      }
    }
  };

  // --- Contract Handlers ---
  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContractId) {
        await updateDoc(doc(db, 'social_contracts', editingContractId), {
          ...contractFormData,
          duration_months: Number(contractFormData.duration_months),
          monthly_fee: Number(contractFormData.monthly_fee),
          paid_months: Number(contractFormData.paid_months),
          updated_at: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'social_contracts'), {
          ...contractFormData,
          duration_months: Number(contractFormData.duration_months),
          monthly_fee: Number(contractFormData.monthly_fee),
          paid_months: Number(contractFormData.paid_months),
          created_at: new Date().toISOString()
        });
        addNotification('گرێبەستی نوێ', `گرێبەستی سۆشیاڵ میدیا "${contractFormData.contract_name}" زیادکرا`, 'info');
      }
      closeContractModal();
    } catch (error) {
      handleFirestoreError(error, editingContractId ? OperationType.UPDATE : OperationType.CREATE, 'social_contracts');
    }
  };

  const handleEditContract = (contract: any) => {
    setContractFormData({
      client_id: contract.client_id || '',
      contract_name: contract.contract_name || 'بەڕێوەبردنی سۆشیاڵ میدیا',
      duration_months: contract.duration_months || 6,
      monthly_fee: contract.monthly_fee || 0,
      paid_months: contract.paid_months || 0,
      start_date: contract.start_date || new Date().toISOString().split('T')[0],
      status: contract.status || 'Active'
    });
    setEditingContractId(contract.id);
    setShowContractModal(true);
  };

  const closeContractModal = () => {
    setShowContractModal(false);
    setEditingContractId(null);
    setContractFormData({ 
      client_id: '', 
      contract_name: 'بەڕێوەبردنی سۆشیاڵ میدیا', 
      duration_months: 6, 
      monthly_fee: 0, 
      paid_months: 0, 
      start_date: new Date().toISOString().split('T')[0], 
      status: 'Active' 
    });
  };

  const confirmDeleteContract = async () => {
    if (showDeleteContractModal) {
      try {
        await deleteDoc(doc(db, 'social_contracts', showDeleteContractModal));
        setShowDeleteContractModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `social_contracts/${showDeleteContractModal}`);
      }
    }
  };

  // --- Helpers ---
  const getClientName = (id: string) => {
    return clients.find(c => c.id === id)?.name || 'نەناسراو';
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case 'Facebook': return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'Instagram': return <Instagram className="w-5 h-5 text-pink-600" />;
      case 'Twitter': return <Twitter className="w-5 h-5 text-blue-400" />;
      case 'Youtube': return <Youtube className="w-5 h-5 text-red-600" />;
      default: return <span className="w-5 h-5 bg-gray-200 rounded-full inline-block"></span>;
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClientName(campaign.client_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContracts = contracts.filter(contract => 
    contract.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClientName(contract.client_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مارکێتینگی دیجیتاڵی</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">بەڕێوەبردنی کەمپەینەکان و گرێبەستەکانی سۆشیاڵ میدیا</p>
        </div>
        <div className="flex gap-2">
          {role !== 'Client' && (
            activeTab === 'campaigns' ? (
              <button 
                onClick={() => setShowModal(true)}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow-md font-medium"
              >
                <Megaphone className="w-5 h-5" />
                کەمپەینی نوێ
              </button>
            ) : (
              <button 
                onClick={() => setShowContractModal(true)}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow-md font-medium"
              >
                <FileText className="w-5 h-5" />
                گرێبەستی نوێ
              </button>
            )
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'campaigns' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          کەمپەینەکان
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'contracts' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          گرێبەستەکانی سۆشیاڵ میدیا
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input 
              type="text" 
              placeholder={activeTab === 'campaigns' ? "گەڕان بۆ کەمپەین یان مشتەری..." : "گەڕان بۆ گرێبەست یان مشتەری..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm transition-shadow"
            />
          </div>
        </div>
        
        {activeTab === 'campaigns' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">ناوی کەمپەین</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">مشتەری</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">پلاتفۆڕم</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">بودجە (USD)</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">دۆخ</th>
                  {role !== 'Client' && <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">کردارەکان</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{campaign.campaign_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{getClientName(campaign.client_id)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                      {getPlatformIcon(campaign.platform)} {campaign.platform}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium" dir="ltr">${campaign.budget?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${campaign.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                        {campaign.status === 'Active' ? 'چالاک' : 'وەستاو'}
                      </span>
                    </td>
                    {role !== 'Client' && (
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(campaign)} className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="دەستکاریکردن">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setShowDeleteModal(campaign.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="سڕینەوە">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                          <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">هیچ کەمپەینێک نەدۆزرایەوە</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">وشەیەکی تر تاقی بکەرەوە یان کەمپەینی نوێ زیاد بکە.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">ناوی گرێبەست</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">مشتەری</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">ماوەی گرێبەست</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">پارەدان (مانگانە)</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">دۆخی پارەدان</th>
                  {role !== 'Client' && <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">کردارەکان</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredContracts.map((contract) => {
                  const unpaidMonths = contract.duration_months - contract.paid_months;
                  const isFullyPaid = unpaidMonths <= 0;
                  
                  return (
                    <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{contract.contract_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{getClientName(contract.client_id)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span>{contract.duration_months} مانگ</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium" dir="ltr">${contract.monthly_fee?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{contract.paid_months} مانگ دراوە</span>
                          </div>
                          {!isFullyPaid && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{unpaidMonths} مانگ ماوە</span>
                            </div>
                          )}
                        </div>
                      </td>
                      {role !== 'Client' && (
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditContract(contract)} className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="دەستکاریکردن">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => setShowDeleteContractModal(contract.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="سڕینەوە">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                          <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">هیچ گرێبەستێک نەدۆزرایەوە</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">وشەیەکی تر تاقی بکەرەوە یان گرێبەستی نوێ زیاد بکە.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'دەستکاریکردنی کەمپەین' : 'زیادکردنی کەمپەینی نوێ'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ناوی کەمپەین <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.campaign_name} onChange={e => setFormData({...formData, campaign_name: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" placeholder="ناوی کەمپەین بنووسە..." />
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">پلاتفۆڕم</label>
                  <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow">
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Twitter">Twitter</option>
                    <option value="Youtube">Youtube</option>
                    <option value="Snapchat">Snapchat</option>
                    <option value="TikTok">TikTok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">بودجە (USD)</label>
                  <input type="number" required value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" dir="ltr" placeholder="0.00" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">دۆخ</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow">
                    <option value="Active">چالاک</option>
                    <option value="Paused">وەستاو</option>
                  </select>
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

      {/* Add/Edit Contract Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingContractId ? 'دەستکاریکردنی گرێبەست' : 'زیادکردنی گرێبەستی نوێ'}
              </h2>
              <button onClick={closeContractModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleContractSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ناوی گرێبەست <span className="text-red-500">*</span></label>
                  <input required type="text" value={contractFormData.contract_name} onChange={e => setContractFormData({...contractFormData, contract_name: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" placeholder="بەڕێوەبردنی سۆشیاڵ میدیا" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">مشتەری <span className="text-red-500">*</span></label>
                  <select required value={contractFormData.client_id} onChange={e => setContractFormData({...contractFormData, client_id: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow">
                    <option value="">هەڵبژاردنی مشتەری...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ماوەی گرێبەست (مانگ)</label>
                  <select value={contractFormData.duration_months} onChange={e => setContractFormData({...contractFormData, duration_months: Number(e.target.value)})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow">
                    <option value={3}>٣ مانگ</option>
                    <option value={6}>٦ مانگ</option>
                    <option value={12}>١ ساڵ (١٢ مانگ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">بەرواری دەستپێک</label>
                  <input type="date" required value={contractFormData.start_date} onChange={e => setContractFormData({...contractFormData, start_date: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">کرێی مانگانە (USD) <span className="text-red-500">*</span></label>
                  <input type="number" required value={contractFormData.monthly_fee} onChange={e => setContractFormData({...contractFormData, monthly_fee: Number(e.target.value)})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" dir="ltr" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">چەند مانگ پارە دراوە؟</label>
                  <input type="number" required min="0" max={contractFormData.duration_months} value={contractFormData.paid_months} onChange={e => setContractFormData({...contractFormData, paid_months: Number(e.target.value)})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow" dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">دۆخ</label>
                  <select value={contractFormData.status} onChange={e => setContractFormData({...contractFormData, status: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow">
                    <option value="Active">چالاک</option>
                    <option value="Completed">تەواوکراو</option>
                    <option value="Cancelled">هەڵوەشاوەتەوە</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={closeContractModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors">پاشگەزبوونەوە</button>
                <button type="submit" className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 font-medium transition-colors shadow-sm hover:shadow-md">
                  {editingContractId ? 'نوێکردنەوە' : 'پاشەکەوتکردن'}
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">سڕینەوەی کەمپەین</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">ئایا دڵنیایت لە سڕینەوەی ئەم کەمپەینە؟ ئەم کردارە ناگەڕێتەوە.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors w-full">پاشگەزبوونەوە</button>
              <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors shadow-sm hover:shadow-md w-full">سڕینەوە</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contract Confirmation Modal */}
      {showDeleteContractModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">سڕینەوەی گرێبەست</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">ئایا دڵنیایت لە سڕینەوەی ئەم گرێبەستە؟ ئەم کردارە ناگەڕێتەوە.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteContractModal(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors w-full">پاشگەزبوونەوە</button>
              <button onClick={confirmDeleteContract} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors shadow-sm hover:shadow-md w-full">سڕینەوە</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
