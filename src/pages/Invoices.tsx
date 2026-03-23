import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Search, Trash2, Edit, FileText, Printer, X, Download } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';
import { exportToCSV } from '../utils/exportUtils';
import { logActivity } from '../utils/activityLogger';
import { useAuth } from '../contexts/AuthContext';

// The printable component
const InvoicePrintTemplate = ({ invoice, client }: { invoice: any, client: any }) => {
  if (!invoice || !client) return null;

  return (
    <div className="p-12 bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative" dir="rtl" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <img src="https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png" alt="Watermark" className="w-[500px] grayscale" referrerPolicy="no-referrer" />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-gray-100 dark:border-gray-800 pb-8 mb-10 relative z-10">
        <div className="flex items-center gap-6">
          <img src="https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png" alt="MAS Agency" className="h-24 w-auto" referrerPolicy="no-referrer" />
          <div className="border-r-2 border-gray-200 dark:border-gray-700 pr-6 mr-2">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">MAS Agency</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm tracking-wide">خزمەتگوزاری دیجیتاڵی و تەکنەلۆجیا</p>
          </div>
        </div>
        <div className="text-left">
          <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-widest uppercase">فاتورە <span className="text-gray-300 dark:text-gray-600">INVOICE</span></h2>
          <div className="space-y-1.5 text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 inline-block min-w-[250px]">
            <p className="flex justify-between gap-8"><span className="text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs font-bold">ژمارەی فاتورە:</span> <span className="font-bold text-gray-900 dark:text-white" dir="ltr">#{invoice.id.substring(0, 8).toUpperCase()}</span></p>
            <p className="flex justify-between gap-8"><span className="text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs font-bold">بەروار:</span> <span className="font-bold text-gray-900 dark:text-white" dir="ltr">{new Date(invoice.created_at).toLocaleDateString('en-GB')}</span></p>
            <p className="flex justify-between gap-8 items-center"><span className="text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs font-bold">دۆخ:</span> <span className={`font-bold px-2 py-0.5 rounded text-xs ${invoice.status === 'Paid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : invoice.status === 'Unpaid' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>{invoice.status === 'Paid' ? 'دراوە' : invoice.status === 'Unpaid' ? 'نەدراوە' : 'دواکەوتوو'}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12 relative z-10">
        {/* Bill To */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white"></span>
            بۆ بەڕێز / کۆمپانیای
          </h3>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-gray-900 dark:bg-white"></div>
            <p className="font-bold text-2xl text-gray-900 dark:text-white mb-1">{client.name}</p>
            {client.company && <p className="text-gray-600 dark:text-gray-300 font-medium mb-4">{client.company}</p>}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {client.phone && <p className="flex items-center gap-2"><span dir="ltr" className="font-medium text-gray-800 dark:text-gray-200">{client.phone}</span></p>}
              {client.email && <p className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">{client.email}</p>}
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="text-left flex flex-col items-end">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2 flex-row-reverse">
            <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white"></span>
            زانیاری کۆمپانیا
          </h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 text-right">
            <p className="font-bold text-gray-900 dark:text-white text-lg">MAS Agency</p>
            <p className="font-medium">هەولێر، کوردستان</p>
            <p className="font-medium">mhtasahmad@gmail.com</p>
            <p dir="ltr" className="font-medium">+964 750 813 4034</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8 relative z-10 shadow-sm">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              <th className="py-4 px-6 font-bold text-sm">وەسف / خزمەتگوزاری</th>
              <th className="py-4 px-6 font-bold text-sm text-center w-24">بڕ</th>
              <th className="py-4 px-6 font-bold text-sm text-center w-32">نرخی دانە</th>
              <th className="py-4 px-6 font-bold text-sm text-left w-32">کۆی گشتی</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item: any, index: number) => (
                <tr key={index} className="bg-white dark:bg-gray-900">
                  <td className="py-5 px-6 text-gray-900 dark:text-white font-medium">{item.description}</td>
                  <td className="py-5 px-6 text-center text-gray-600 dark:text-gray-400 font-medium">{item.quantity}</td>
                  <td className="py-5 px-6 text-center text-gray-600 dark:text-gray-400 font-medium" dir="ltr">${item.unit_price.toLocaleString()}</td>
                  <td className="py-5 px-6 text-left font-bold text-gray-900 dark:text-white" dir="ltr">${(item.quantity * item.unit_price).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr className="bg-white dark:bg-gray-900">
                <td className="py-5 px-6 text-gray-900 dark:text-white font-medium">خزمەتگوزاری گشتی</td>
                <td className="py-5 px-6 text-center text-gray-600 dark:text-gray-400 font-medium">1</td>
                <td className="py-5 px-6 text-center text-gray-600 dark:text-gray-400 font-medium" dir="ltr">${invoice.price_usd.toLocaleString()}</td>
                <td className="py-5 px-6 text-left font-bold text-gray-900 dark:text-white" dir="ltr">${invoice.price_usd.toLocaleString()}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-between items-start relative z-10">
        <div className="w-1/2 pt-4">
          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">شێوازی پارەدان</h4>
          <p className="text-sm text-gray-900 dark:text-white font-bold bg-gray-50 dark:bg-gray-800 inline-block px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">{invoice.payment_method || 'دیارینەکراوە'}</p>
        </div>
        <div className="w-1/2 md:w-1/3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-gray-800 dark:border-gray-700">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-gray-700 to-gray-500 dark:from-gray-600 dark:to-gray-400"></div>
          <div className="flex justify-between mb-4 text-sm">
            <span className="font-medium text-gray-300 dark:text-gray-400">کۆی گشتی (USD)</span>
            <span className="font-bold text-white text-lg" dir="ltr">${invoice.price_usd.toLocaleString()}</span>
          </div>
          <div className="flex justify-between pt-4 border-t border-gray-700 dark:border-gray-600">
            <span className="font-bold text-gray-300 dark:text-gray-400">کۆی گشتی (IQD)</span>
            <span className="font-black text-white text-xl" dir="ltr">{invoice.price_iqd.toLocaleString()} <span className="text-sm font-medium text-gray-400 dark:text-gray-500">د.ع</span></span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-12 left-12 right-12 text-center text-gray-500 dark:text-gray-400 text-sm pt-8 border-t border-gray-200 dark:border-gray-800">
        <p className="font-bold text-gray-900 dark:text-white mb-1 text-base">سوپاس بۆ متمانەتان بە MAS Agency</p>
        <p>ئەگەر هەر پرسیارێکتان هەیە دەربارەی ئەم فاتورەیە، تکایە پەیوەندیمان پێوە بکەن.</p>
      </div>
    </div>
  );
};

export default function Invoices() {
  const { user, role, clientId: authClientId } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('Unpaid');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);
  const [exchangeRate, setExchangeRate] = useState(1500); // Default IQD to USD rate

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    let qInvoices;
    let qClients;

    if (role === 'Client' && authClientId) {
      qInvoices = query(collection(db, 'invoices'), where('client_id', '==', authClientId));
      qClients = query(collection(db, 'clients'), where('__name__', '==', authClientId));
    } else if (role !== 'Client') {
      qInvoices = collection(db, 'invoices');
      qClients = collection(db, 'clients');
    } else {
      return;
    }

    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    });
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    return () => { unsubInvoices(); unsubClients(); };
  }, [role, authClientId]);

  const calculateTotalUSD = () => {
    return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalUSD = calculateTotalUSD();
    const totalIQD = totalUSD * exchangeRate;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'invoices', editingId), {
          client_id: clientId,
          items,
          price_usd: totalUSD,
          price_iqd: totalIQD,
          exchange_rate: exchangeRate,
          status,
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        });
        if (user) {
          logActivity(user.uid, user.email || '', 'UPDATE', 'invoice', editingId, `Updated invoice #${editingId.substring(0, 8).toUpperCase()}`);
        }
      } else {
        const docRef = await addDoc(collection(db, 'invoices'), {
          client_id: clientId,
          items,
          price_usd: totalUSD,
          price_iqd: totalIQD,
          exchange_rate: exchangeRate,
          status,
          payment_method: paymentMethod,
          created_at: new Date().toISOString()
        });
        const client = clients.find(c => c.id === clientId);
        addNotification('فاتورەی نوێ', `فاتورەیەک بە بڕی $${totalUSD} بۆ "${client?.name || 'مشتەری'}" دروستکرا`, 'invoice');
        if (user) {
          logActivity(user.uid, user.email || '', 'CREATE', 'invoice', docRef.id, `Created invoice #${docRef.id.substring(0, 8).toUpperCase()} for ${client?.name || 'Unknown'}`);
        }
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'invoices');
    }
  };

  const handleEdit = (invoice: any) => {
    setClientId(invoice.client_id || '');
    setStatus(invoice.status || 'Unpaid');
    setPaymentMethod(invoice.payment_method || '');
    setItems(invoice.items && invoice.items.length > 0 ? invoice.items : [{ description: 'خزمەتگوزاری گشتی', quantity: 1, unit_price: invoice.price_usd || 0 }]);
    setExchangeRate(invoice.exchange_rate || 1500);
    setEditingId(invoice.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setClientId('');
    setStatus('Unpaid');
    setPaymentMethod('');
    setItems([{ description: '', quantity: 1, unit_price: 0 }]);
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, 'invoices', showDeleteModal));
        if (user) {
          logActivity(user.uid, user.email || '', 'DELETE', 'invoice', showDeleteModal, `Deleted invoice #${showDeleteModal.substring(0, 8).toUpperCase()}`);
        }
        setShowDeleteModal(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `invoices/${showDeleteModal}`);
      }
    }
  };

  const getClient = (id: string) => {
    return clients.find(c => c.id === id);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'Unpaid': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredInvoices = invoices.filter(invoice => 
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (getClient(invoice.client_id)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const exportData = filteredInvoices.map(inv => ({
      'Invoice ID': inv.id,
      'Client Name': getClient(inv.client_id)?.name || 'Unknown',
      'Amount (USD)': inv.price_usd,
      'Amount (IQD)': inv.price_iqd,
      'Status': inv.status,
      'Payment Method': inv.payment_method || 'N/A',
      'Date': new Date(inv.created_at).toLocaleDateString()
    }));
    exportToCSV(exportData, 'Invoices');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فڕۆشتن و فاتورە</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">بەڕێوەبردنی فاتورەکان و پارەدانەکان</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm font-medium flex-1 sm:flex-none"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">دەرکردن</span>
          </button>
          {role !== 'Client' && (
            <button 
              onClick={() => setShowModal(true)}
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-gray-100 transition-all shadow-sm hover:shadow-md font-medium flex-1 sm:flex-none"
            >
              <Plus className="w-5 h-5" />
              دروستکردنی فاتورە
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
              placeholder="گەڕان بۆ فاتورە یان مشتەری..." 
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
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">ژمارەی فاتورە</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">مشتەری</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">بڕی پارە (IQD)</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">بڕی پارە (USD)</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">دۆخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium" dir="ltr">#{invoice.id.substring(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{getClient(invoice.client_id)?.name || 'نەناسراو'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{invoice.price_iqd?.toLocaleString()} د.ع</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">${invoice.price_usd?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                      {invoice.status === 'Paid' ? 'دراوە' : invoice.status === 'Unpaid' ? 'نەدراوە' : 'دواکەوتوو'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setShowPrintModal(invoice)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors" title="چاپکردن / PDF">
                        <Printer className="w-4 h-4" />
                      </button>
                      {role !== 'Client' && (
                        <>
                          <button onClick={() => handleEdit(invoice)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="دەستکاریکردن">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setShowDeleteModal(invoice.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="سڕینەوە">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">هیچ فاتورەیەک نەدۆزرایەوە</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">وشەیەکی تر تاقی بکەرەوە یان فاتورەیەکی نوێ دروست بکە.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'دەستکاریکردنی فاتورە' : 'دروستکردنی فاتورەی نوێ (پڕۆفیشناڵ)'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">مشتەری <span className="text-red-500">*</span></label>
                  <select required value={clientId} onChange={e => setClientId(e.target.value)} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">هەڵبژاردنی مشتەری...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">نرخی ئاڵوگۆڕ (1 USD بۆ IQD) <span className="text-red-500">*</span></label>
                  <input type="number" required value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white" dir="ltr" />
                </div>
              </div>

              {/* Items Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">خزمەتگوزارییەکان / کاڵاکان</h3>
                  <button type="button" onClick={handleAddItem} className="text-sm text-gray-900 dark:text-white font-medium flex items-center gap-1 hover:text-black dark:hover:text-gray-300 transition-colors px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <Plus className="w-4 h-4" /> زیادکردنی خزمەتگوزاری
                  </button>
                </div>
                
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex-1 w-full">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 sm:hidden">وەسف</label>
                        <input type="text" required placeholder="وەسفی خزمەتگوزاری..." value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                      </div>
                      <div className="w-full sm:w-24">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 sm:hidden">بڕ</label>
                        <input type="number" required min="1" placeholder="بڕ" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white" dir="ltr" />
                      </div>
                      <div className="w-full sm:w-32">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 sm:hidden">نرخ ($)</label>
                        <input type="number" required min="0" placeholder="نرخ ($)" value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-gray-900 dark:focus:border-gray-400 transition-shadow bg-white dark:bg-gray-700 text-gray-900 dark:text-white" dir="ltr" />
                      </div>
                      <div className="w-full sm:w-32 pt-2 text-left font-medium text-gray-700 dark:text-gray-300 hidden sm:block" dir="ltr">
                        ${(item.quantity * item.unit_price).toLocaleString()}
                      </div>
                      {items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(index)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-2 sm:mt-0 self-end sm:self-auto">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 w-64">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600 dark:text-gray-400">کۆی گشتی (USD):</span>
                      <span className="font-bold text-gray-900 dark:text-white" dir="ltr">${calculateTotalUSD().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">کۆی گشتی (IQD):</span>
                      <span className="font-bold text-gray-800 dark:text-gray-300" dir="ltr">{(calculateTotalUSD() * exchangeRate).toLocaleString()} د.ع</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شێوازی پارەدان</label>
                  <input type="text" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="نموونە: کاش، حەواڵە، FastPay..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">دۆخ</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="Unpaid">نەدراوە (Unpaid)</option>
                    <option value="Paid">دراوە (Paid)</option>
                    <option value="Overdue">دواکەوتوو (Overdue)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium">پاشگەزبوونەوە</button>
                <button type="submit" className="px-5 py-2.5 bg-gray-900 dark:bg-primary text-white rounded-xl hover:bg-black dark:hover:bg-primary/90 font-medium shadow-sm hover:shadow-md">
                  {editingId ? 'نوێکردنەوەی فاتورە' : 'دروستکردن و پاشەکەوتکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl w-full max-w-5xl my-8 flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-t-2xl border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-10 no-print">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">پێشبینینی فاتورە</h2>
              <div className="flex gap-3">
                <button onClick={handlePrint} className="px-4 py-2 bg-gray-900 dark:bg-primary text-white rounded-xl hover:bg-black dark:hover:bg-primary/90 flex items-center gap-2 shadow-sm">
                  <Printer className="w-4 h-4" /> چاپکردن / PDF
                </button>
                <button onClick={() => setShowPrintModal(null)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 flex justify-center print-container">
              <div className="shadow-2xl bg-white">
                <InvoicePrintTemplate 
                  invoice={showPrintModal} 
                  client={getClient(showPrintModal.client_id)} 
                />
              </div>
            </div>
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">سڕینەوەی فاتورە</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">ئایا دڵنیایت لە سڕینەوەی ئەم فاتورەیە؟ ئەم کردارە ناگەڕێتەوە.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors w-full">پاشگەزبوونەوە</button>
              <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors shadow-sm hover:shadow-md w-full">سڕینەوە</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
