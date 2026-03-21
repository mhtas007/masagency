import React, { useState, useRef, useEffect } from 'react';
import { Calculator, Printer, Save, Settings, History, Calendar, DollarSign, Bell, Send, Plus, X } from 'lucide-react';
import { collection, addDoc, doc, getDoc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface MasMenuSettings {
  itemCostUSD: number;
  standCostIQD: number;
  designBasicUSD: number;
  designProUSD: number;
  featureFeedbackUSD: number;
  featureReservationUSD: number;
  featureAdminUSD: number;
  featureOrderUSD: number;
  telegramBotToken: string;
  telegramChatId: string;
}

const defaultSettings: MasMenuSettings = {
  itemCostUSD: 0.75,
  standCostIQD: 750,
  designBasicUSD: 75,
  designProUSD: 150,
  featureFeedbackUSD: 25,
  featureReservationUSD: 15,
  featureAdminUSD: 50,
  featureOrderUSD: 50,
  telegramBotToken: '',
  telegramChatId: ''
};

export default function MasMenu() {
  const { role } = useAuth();
  
  const [settings, setSettings] = useState<MasMenuSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');
  const [invoices, setInvoices] = useState<any[]>([]);

  // Calculator State
  const [clientName, setClientName] = useState('');
  const [numItems, setNumItems] = useState(1);
  const [numLanguages, setNumLanguages] = useState(1);
  const [numStands, setNumStands] = useState(0);
  const [designType, setDesignType] = useState<'basic' | 'pro'>('basic');
  const [features, setFeatures] = useState({
    feedback: false,
    reservation: false,
    adminPanel: false,
    orderRequest: false,
  });
  
  // New Features State
  const [discountUSD, setDiscountUSD] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [setupFeeUSD, setSetupFeeUSD] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Paid' | 'Cancelled'>('Draft');
  
  // Subscription State
  const [hasMonthlyCost, setHasMonthlyCost] = useState(false);
  const [monthlyCostUSD, setMonthlyCostUSD] = useState(0);
  const [activationDate, setActivationDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (role === 'Client') return;

    // Fetch Settings
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'mas_menu');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings({ ...defaultSettings, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();

    // Fetch Invoices
    const q = query(collection(db, 'mas_menu_invoices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setInvoices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [role]);

  if (role === 'Client') {
    return <Navigate to="/" replace />;
  }

  // Calculations
  const itemsTotalUSD = numItems * numLanguages * settings.itemCostUSD;
  const standsTotalIQD = numStands * settings.standCostIQD;
  const designTotalUSD = designType === 'basic' ? settings.designBasicUSD : settings.designProUSD;
  
  let featuresTotalUSD = 0;
  if (features.feedback) featuresTotalUSD += settings.featureFeedbackUSD;
  if (features.reservation) featuresTotalUSD += settings.featureReservationUSD;
  if (features.adminPanel) featuresTotalUSD += settings.featureAdminUSD;
  if (features.orderRequest) featuresTotalUSD += settings.featureOrderUSD;

  const subTotalUSD = itemsTotalUSD + designTotalUSD + featuresTotalUSD + setupFeeUSD;
  const taxAmountUSD = subTotalUSD * (taxPercent / 100);
  const grandTotalUSD = subTotalUSD + taxAmountUSD - discountUSD;
  const grandTotalIQD = standsTotalIQD;

  const handleSaveInvoice = async () => {
    if (!clientName) {
      alert('تکایە ناوی کڕیار بنووسە');
      return;
    }
    try {
      await addDoc(collection(db, 'mas_menu_invoices'), {
        clientName,
        numItems,
        numLanguages,
        numStands,
        designType,
        features,
        discountUSD,
        taxPercent,
        setupFeeUSD,
        notes,
        status,
        subscription: hasMonthlyCost ? {
          active: true,
          monthlyCostUSD,
          activationDate,
          expirationDate
        } : null,
        totals: {
          usd: grandTotalUSD,
          iqd: grandTotalIQD,
          subTotalUSD,
          taxAmountUSD
        },
        createdAt: new Date().toISOString(),
      });
      alert('فاتورەکە بە سەرکەوتوویی پاشەکەوت کرا');
      setActiveTab('history');
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('هەڵەیەک ڕوویدا لە پاشەکەوتکردن');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'mas_menu'), settings);
      alert('ڕێکخستنەکان پاشەکەوت کران');
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('هەڵەیەک ڕوویدا لە پاشەکەوتکردنی ڕێکخستنەکان');
    }
  };

  if (loadingSettings) {
    return <div className="p-6 flex justify-center items-center h-64">چاوەڕێ بکە...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-600" />
            سیستەمی ماس مێنو (Mas Menu)
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">بەڕێوەبردن و هەژمارکردنی تێچووی پڕۆژەکانی مێنوی دیجیتاڵی</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calculator' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              هەژمارکەر
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              مێژووی فاتورەکان
            </button>
          </div>
          
          {(role === 'Super Admin' || role === 'Manager') && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              ڕێکخستنی نرخەکان
            </button>
          )}
        </div>
      </div>

      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calculator Form */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">زانیاری پڕۆژە</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ناوی کڕیار / ڕێستۆرانت</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="ناوی کڕیار بنووسە..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ژمارەی ئایتمەکان</label>
                  <input
                    type="number"
                    min="1"
                    value={numItems}
                    onChange={(e) => setNumItems(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ژمارەی زمانەکان</label>
                  <input
                    type="number"
                    min="1"
                    value={numLanguages}
                    onChange={(e) => setNumLanguages(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ژمارەی ستاندەکان (دانە)</label>
                <input
                  type="number"
                  min="0"
                  value={numStands}
                  onChange={(e) => setNumStands(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">هەر ستاندێک: {settings.standCostIQD} دینار</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">جۆری دیزاینی مێنو</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDesignType('basic')}
                    className={`p-4 rounded-xl border-2 text-center transition-colors ${designType === 'basic' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-300'}`}
                  >
                    <div className="font-semibold">سەرەتا (Basic)</div>
                    <div className="text-sm mt-1">${settings.designBasicUSD}</div>
                  </button>
                  <button
                    onClick={() => setDesignType('pro')}
                    className={`p-4 rounded-xl border-2 text-center transition-colors ${designType === 'pro' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-300'}`}
                  >
                    <div className="font-semibold">پرۆفیشناڵ (Pro)</div>
                    <div className="text-sm mt-1">${settings.designProUSD}</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">تایبەتمەندییە زیادەکان</label>
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={features.feedback}
                        onChange={(e) => setFeatures({...features, feedback: e.target.checked})}
                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">فیدباک (Feedback)</span>
                    </div>
                    <span className="text-emerald-600 font-medium">${settings.featureFeedbackUSD}</span>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={features.reservation}
                        onChange={(e) => setFeatures({...features, reservation: e.target.checked})}
                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">سیستەمی حجز (Reservation)</span>
                    </div>
                    <span className="text-emerald-600 font-medium">${settings.featureReservationUSD}</span>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={features.adminPanel}
                        onChange={(e) => setFeatures({...features, adminPanel: e.target.checked})}
                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">ئەدمین پانێڵی تایبەت</span>
                    </div>
                    <span className="text-emerald-600 font-medium">${settings.featureAdminUSD}</span>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={features.orderRequest}
                        onChange={(e) => setFeatures({...features, orderRequest: e.target.checked})}
                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">داواکاری (Order Request)</span>
                    </div>
                    <span className="text-emerald-600 font-medium">${settings.featureOrderUSD}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Financial Details Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">زانیاری دارایی و داشکاندن</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">داشکاندن (USD)</label>
                  <input
                    type="number"
                    min="0"
                    value={discountUSD}
                    onChange={(e) => setDiscountUSD(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">باج (Tax %)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تێچووی دانان (Setup Fee USD)</label>
                  <input
                    type="number"
                    min="0"
                    value={setupFeeUSD}
                    onChange={(e) => setSetupFeeUSD(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">دۆخی فاتورە</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Draft">ڕەشنووس (Draft)</option>
                    <option value="Sent">نێردراو (Sent)</option>
                    <option value="Paid">دراوە (Paid)</option>
                    <option value="Cancelled">هەڵوەشاوەتەوە (Cancelled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تێبینییەکان</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="تێبینی بنووسە بۆ فاتورەکە..."
                />
              </div>
            </div>

            {/* Subscription Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  بەشداریکردنی مانگانە
                </h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={hasMonthlyCost} onChange={e => setHasMonthlyCost(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {hasMonthlyCost && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تێچووی مانگانە ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={monthlyCostUSD}
                      onChange={(e) => setMonthlyCostUSD(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">بەرواری دەستپێک</label>
                      <input
                        type="date"
                        value={activationDate}
                        onChange={(e) => setActivationDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">بەرواری بەسەرچوون</label>
                      <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">سێرڤەر بە شێوەیەکی ئۆتۆماتیکی نۆتیفیکەیشن و نامەی تێلیگرام دەنێرێت پێش بەسەرچوونی کاتەکە.</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSaveInvoice}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl hover:bg-black dark:hover:bg-gray-600 transition-colors font-medium"
              >
                <Save className="w-5 h-5" />
                پاشەکەوتکردن
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
              >
                <Printer className="w-5 h-5" />
                چاپکردن
              </button>
              <button
                onClick={() => {
                  const message = `فاتورەی ماس مێنو\nکڕیار: ${clientName}\nکۆی گشتی: $${grandTotalUSD.toFixed(2)}\n${numStands > 0 ? `کۆی گشتی ستاند: ${grandTotalIQD.toLocaleString()} IQD\n` : ''}${hasMonthlyCost ? `تێچووی مانگانە: $${monthlyCostUSD.toFixed(2)}\n` : ''}سوپاس بۆ هەڵبژاردنی ماس مێنو.`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
              >
                <Send className="w-5 h-5" />
                ناردن
              </button>
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 h-fit sticky top-6">
            <div ref={invoiceRef} className="print-container bg-white text-gray-900 p-8 rounded-xl" dir="rtl">
              <div className="flex justify-between items-start mb-10 border-b border-gray-200 pb-6">
                <div>
                  <h2 className="text-3xl font-bold text-emerald-600 mb-2">Mas Menu</h2>
                  <p className="text-gray-500">مێنوی دیجیتاڵی پێشکەوتوو</p>
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">فاتورە (Invoice)</h3>
                  <p className="text-gray-500">بەروار: {new Date().toLocaleDateString('en-GB')}</p>
                  <p className="text-gray-500 font-medium mt-1">بۆ: {clientName || 'کڕیار'}</p>
                  <p className="text-sm font-medium mt-2 px-2 py-1 rounded-md inline-block bg-gray-100 text-gray-700">دۆخ: {status}</p>
                </div>
              </div>

              <div className="space-y-6">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-800 text-gray-900">
                      <th className="py-3 px-2 font-bold w-1/2">وەسف (Description)</th>
                      <th className="py-3 px-2 font-bold text-center">بڕ</th>
                      <th className="py-3 px-2 font-bold text-left">کۆی گشتی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="py-4 px-2">
                        <div className="font-medium text-gray-900">تێچووی ئایتمەکان</div>
                        <div className="text-sm text-gray-500">{numItems} ئایتم × {numLanguages} زمان × ${settings.itemCostUSD}</div>
                      </td>
                      <td className="py-4 px-2 text-center text-gray-700">-</td>
                      <td className="py-4 px-2 text-left font-medium text-gray-900">${itemsTotalUSD.toFixed(2)}</td>
                    </tr>
                    
                    <tr className="hover:bg-gray-50">
                      <td className="py-4 px-2">
                        <div className="font-medium text-gray-900">دیزاینی مێنو</div>
                        <div className="text-sm text-gray-500">جۆری {designType === 'basic' ? 'سەرەتا (Basic)' : 'پرۆفیشناڵ (Pro)'}</div>
                      </td>
                      <td className="py-4 px-2 text-center text-gray-700">1</td>
                      <td className="py-4 px-2 text-left font-medium text-gray-900">${designTotalUSD.toFixed(2)}</td>
                    </tr>

                    {featuresTotalUSD > 0 && (
                      <tr className="hover:bg-gray-50">
                        <td className="py-4 px-2">
                          <div className="font-medium text-gray-900">تایبەتمەندییە زیادەکان</div>
                          <div className="text-sm text-gray-500">
                            {[
                              features.feedback && 'فیدباک',
                              features.reservation && 'حجز',
                              features.adminPanel && 'ئەدمین پانێڵ',
                              features.orderRequest && 'داواکاری'
                            ].filter(Boolean).join(' + ')}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center text-gray-700">-</td>
                        <td className="py-4 px-2 text-left font-medium text-gray-900">${featuresTotalUSD.toFixed(2)}</td>
                      </tr>
                    )}

                    {setupFeeUSD > 0 && (
                      <tr className="hover:bg-gray-50">
                        <td className="py-4 px-2">
                          <div className="font-medium text-gray-900">تێچووی دانان (Setup Fee)</div>
                        </td>
                        <td className="py-4 px-2 text-center text-gray-700">1</td>
                        <td className="py-4 px-2 text-left font-medium text-gray-900">${setupFeeUSD.toFixed(2)}</td>
                      </tr>
                    )}

                    {hasMonthlyCost && (
                      <tr className="hover:bg-gray-50 bg-emerald-50/50">
                        <td className="py-4 px-2">
                          <div className="font-medium text-emerald-800">بەشداریکردنی مانگانە (Subscription)</div>
                          <div className="text-sm text-emerald-600">
                            لە {activationDate || '---'} تا {expirationDate || '---'}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center text-gray-700">مانگانە</td>
                        <td className="py-4 px-2 text-left font-medium text-emerald-700">${monthlyCostUSD.toFixed(2)}</td>
                      </tr>
                    )}

                    {numStands > 0 && (
                      <tr className="hover:bg-gray-50">
                        <td className="py-4 px-2">
                          <div className="font-medium text-gray-900">ستاندی مێنو (NFC/QR)</div>
                          <div className="text-sm text-gray-500">ستاند + دیزاین + پرینت</div>
                        </td>
                        <td className="py-4 px-2 text-center text-gray-700">{numStands}</td>
                        <td className="py-4 px-2 text-left font-medium text-gray-900">{standsTotalIQD.toLocaleString()} IQD</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-10 pt-6 border-t-2 border-gray-800 flex flex-col items-end gap-2">
                <div className="flex justify-between w-64 text-sm text-gray-600">
                  <span>کۆی گشتی پێش باج:</span>
                  <span>${subTotalUSD.toFixed(2)}</span>
                </div>
                {taxPercent > 0 && (
                  <div className="flex justify-between w-64 text-sm text-gray-600">
                    <span>باج ({taxPercent}%):</span>
                    <span>${taxAmountUSD.toFixed(2)}</span>
                  </div>
                )}
                {discountUSD > 0 && (
                  <div className="flex justify-between w-64 text-sm text-red-600">
                    <span>داشکاندن:</span>
                    <span>-${discountUSD.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between w-64 text-lg mt-2 pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-900">کۆی گشتی (USD):</span>
                  <span className="font-bold text-emerald-600">${grandTotalUSD.toFixed(2)}</span>
                </div>
                {numStands > 0 && (
                  <div className="flex justify-between w-64 text-lg">
                    <span className="font-bold text-gray-900">کۆی گشتی (IQD):</span>
                    <span className="font-bold text-emerald-600">{grandTotalIQD.toLocaleString()} IQD</span>
                  </div>
                )}
                {hasMonthlyCost && (
                  <div className="flex justify-between w-64 text-sm mt-2 pt-2 border-t border-gray-200">
                    <span className="font-medium text-gray-600">تێچووی مانگانە:</span>
                    <span className="font-medium text-gray-900">${monthlyCostUSD.toFixed(2)} / مانگ</span>
                  </div>
                )}
              </div>

              {notes && (
                <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2">تێبینییەکان:</h4>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{notes}</p>
                </div>
              )}

              <div className="mt-16 text-center text-sm text-gray-500">
                <p>سوپاس بۆ هەڵبژاردنی ماس مێنو.</p>
                <p className="mt-1">بۆ هەر پرسیارێک پەیوەندیمان پێوە بکە.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">مێژووی فاتورەکان</h2>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">هیچ فاتورەیەک نییە.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white">ناوی کڕیار</th>
                    <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white">بەروار</th>
                    <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white">کۆی دۆلار</th>
                    <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white">کۆی دینار</th>
                    <th className="py-3 px-4 font-semibold text-gray-900 dark:text-white">بەشداریکردن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{inv.clientName}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(inv.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="py-3 px-4 text-emerald-600 font-medium">${inv.totals.usd.toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{inv.totals.iqd.toLocaleString()} IQD</td>
                      <td className="py-3 px-4">
                        {inv.subscription?.active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            چالاکە (${inv.subscription.monthlyCostUSD}/مانگ)
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">نییە</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                ڕێکخستنی نرخەکان و تێلیگرام
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="settings-form" onSubmit={handleSaveSettings} className="space-y-8">
                
                {/* Pricing Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-500" />
                    نرخە بنەڕەتییەکان
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">نرخی یەک ئایتم بۆ یەک زمان ($)</label>
                      <input type="number" step="0.01" value={settings.itemCostUSD} onChange={e => setSettings({...settings, itemCostUSD: parseFloat(e.target.value) || 0})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">نرخی یەک ستاند (دینار)</label>
                      <input type="number" value={settings.standCostIQD} onChange={e => setSettings({...settings, standCostIQD: parseInt(e.target.value) || 0})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">دیزاینی سەرەتا ($)</label>
                      <input type="number" value={settings.designBasicUSD} onChange={e => setSettings({...settings, designBasicUSD: parseInt(e.target.value) || 0})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">دیزاینی پرۆفیشناڵ ($)</label>
                      <input type="number" value={settings.designProUSD} onChange={e => setSettings({...settings, designProUSD: parseInt(e.target.value) || 0})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                </div>

                {/* Features Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-gray-500" />
                    تایبەتمەندییە زیادەکان ($)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">فیدباک</label>
                      <input type="number" value={settings.featureFeedbackUSD} onChange={e => setSettings({...settings, featureFeedbackUSD: parseInt(e.target.value) || 0})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">حجز</label>
                      <input type="number" value={settings.featureReservationUSD} onChange={e => setSettings({...settings, featureReservationUSD: parseInt(e.target.value) || 0})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ئەدمین پانێڵ</label>
                      <input type="number" value={settings.featureAdminUSD} onChange={e => setSettings({...settings, featureAdminUSD: parseInt(e.target.value) || 0})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">داواکاری</label>
                      <input type="number" value={settings.featureOrderUSD} onChange={e => setSettings({...settings, featureOrderUSD: parseInt(e.target.value) || 0})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                </div>

                {/* Telegram Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-500" />
                    ڕێکخستنی تێلیگرام (بۆ نۆتیفیکەیشنی خاوەن کار)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">تۆکنی بۆت (Bot Token)</label>
                      <input type="text" value={settings.telegramBotToken} onChange={e => setSettings({...settings, telegramBotToken: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" dir="ltr" placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ئایدی چات (Chat ID)</label>
                      <input type="text" value={settings.telegramChatId} onChange={e => setSettings({...settings, telegramChatId: e.target.value})} className="w-full p-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500" dir="ltr" placeholder="-1001234567890" />
                    </div>
                    <p className="text-xs text-gray-500">ئەم زانیارییانە بەکاردێت بۆ ناردنی نامەی ئۆتۆماتیکی کاتێک بەشداریکردنی کڕیارێک نزیک دەبێتەوە لە بەسەرچوون.</p>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowSettings(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors">
                پاشگەزبوونەوە
              </button>
              <button type="submit" form="settings-form" className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors shadow-sm">
                پاشەکەوتکردن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
