import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  FileText, Briefcase, Monitor, Share2, Megaphone, Send, 
  ChevronRight, ChevronLeft, ExternalLink, Clock, CheckCircle,
  MessageSquare, Sparkles, User, Zap, ShieldCheck, CreditCard,
  Phone, Mail, X, Paperclip, CheckCircle2, Circle, Trash2
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import ClientOnboarding from '../components/ClientOnboarding';

const QUICK_REPLIES = [
  "پێویستم بە هاوکارییە لە پرۆژەکەم",
  "پرسیارێک دەربارەی پارەدان",
  "داواکردنی کۆبوونەوە",
  "کێشەیەکی تەکنیکی هەیە"
];

export default function ClientPortal() {
  const { clientId, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [techServices, setTechServices] = useState<any[]>([]);
  const [companyUpdates, setCompanyUpdates] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId) return;

    const unsubInvoices = onSnapshot(
      query(collection(db, 'invoices'), where('client_id', '==', clientId)),
      (snapshot) => setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'invoices')
    );

    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), where('client_id', '==', clientId)),
      (snapshot) => setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'projects')
    );

    const unsubTech = onSnapshot(
      query(collection(db, 'tech_services'), where('client_id', '==', clientId)),
      (snapshot) => setTechServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'tech_services')
    );

    const unsubUpdates = onSnapshot(
      query(collection(db, 'company_updates'), orderBy('created_at', 'desc')),
      (snapshot) => setCompanyUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'company_updates')
    );

    const unsubRequests = onSnapshot(
      query(collection(db, 'client_requests'), where('client_id', '==', clientId)),
      (snapshot) => setMyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())),
      (error) => handleFirestoreError(error, OperationType.LIST, 'client_requests')
    );

    return () => {
      unsubInvoices();
      unsubProjects();
      unsubTech();
      unsubUpdates();
      unsubRequests();
    };
  }, [clientId]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [myRequests, isChatOpen]);

  const handleSendRequest = async (messageText: string) => {
    if (!messageText.trim() || !clientId || !user) return;

    setIsSubmitting(true);
    try {
      // Find an active/pending request to append to, or create a new one
      const activeRequest = myRequests.find(r => r.status !== 'closed');

      if (activeRequest) {
        // Append as a reply
        const newReply = {
          message: messageText,
          sender_id: user.uid,
          sender_name: user.email?.split('@')[0] || 'Client',
          created_at: new Date().toISOString()
        };
        await updateDoc(doc(db, 'client_requests', activeRequest.id), {
          replies: [...(activeRequest.replies || []), newReply],
          status: 'pending', // Re-open if it was replied
          updated_at: new Date().toISOString()
        });
      } else {
        // Create new request
        await addDoc(collection(db, 'client_requests'), {
          client_id: clientId,
          user_id: user.uid,
          subject: messageText.substring(0, 30) + (messageText.length > 30 ? '...' : ''),
          message: messageText,
          status: 'pending',
          replies: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      // Notify admins
      await addDoc(collection(db, 'notifications'), {
        user_id: 'admin',
        title: 'نامەی نوێ لە کڕیارەوە',
        message: `نامەیەکی نوێ هەیە: ${messageText.substring(0, 50)}`,
        type: 'client',
        read: false,
        created_at: new Date().toISOString()
      });

      setChatMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'client_requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'client_requests', requestId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `client_requests/${requestId}`);
    }
  };

  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.price_usd || 0), 0);
  const totalUnpaid = invoices.filter(i => i.status === 'Unpaid' || i.status === 'Overdue').reduce((sum, i) => sum + (i.price_usd || 0), 0);

  const PROJECT_STAGES = ['Planning', 'Design', 'Development', 'Testing', 'Completed'];
  const getStageName = (stage: string) => {
    switch(stage) {
      case 'Planning': return 'پلان دانان';
      case 'Design': return 'دیزاین';
      case 'Development': return 'گەشەپێدان';
      case 'Testing': return 'تاقیکردنەوە';
      case 'Completed': return 'تەواوکراو';
      default: return 'پلان دانان';
    }
  };

  return (
    <div className="space-y-8 pb-24 font-sans">
      <ClientOnboarding />
      {/* 1. Premium Hero Section with Glassmorphism */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-primary/90 rounded-[2.5rem] p-8 md:p-12 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold mb-4 tracking-tight"
            >
              بەخێربێیت بۆ پۆرتاڵی تایبەتیت
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-300 text-lg max-w-xl leading-relaxed"
            >
              ئێمە لێرەین بۆ ئەوەی باشترین خزمەتگوزاریت پێشکەش بکەین. چاودێری پرۆژەکانت بکە و لەگەڵمان لە پەیوەندیدا بە بە شێوەیەکی ڕاستەوخۆ و شەفاف.
            </motion.p>
          </div>

          {/* 4. Account Manager Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl flex items-center gap-5 min-w-[300px]"
          >
            <div className="relative">
              <img src="https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff" alt="Manager" className="w-16 h-16 rounded-full border-2 border-white/50" />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm text-gray-300 mb-1">بەڕێوەبەری هەژمارەکەت</p>
              <h3 className="text-xl font-bold text-white">تیمی پاڵپشتی</h3>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setIsChatOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><MessageSquare className="w-4 h-4" /></button>
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><Phone className="w-4 h-4" /></button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 5. Financial Summary & Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">کۆی پارەی دراو</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${totalPaid.toLocaleString()}</h3>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">بڕی ماوە (قەرز)</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${totalUnpaid.toLocaleString()}</h3>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">پرۆژە چالاکەکان</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{projects.filter(p => p.status !== 'Completed').length}</h3>
            </div>
          </div>

          {/* 6. Project Timeline UI */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" />
              بەرەوپێشچوونی پرۆژەکان
            </h2>
            
            {projects.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                <p className="text-gray-500 dark:text-gray-400">هیچ پرۆژەیەکی چالاک نییە</p>
              </div>
            ) : (
              <div className="space-y-8">
                {projects.map(project => {
                  const currentStageIndex = PROJECT_STAGES.indexOf(project.stage || 'Planning');
                  
                  return (
                    <div key={project.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{project.project_name}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {project.service_type || 'پرۆژە'}
                          </span>
                        </div>
                        {project.demoLink && (
                          <a href={project.demoLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors font-medium">
                            <ExternalLink className="w-4 h-4" />
                            بینینی دێمۆ
                          </a>
                        )}
                      </div>

                      {/* Timeline Steps */}
                      <div className="relative">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 rounded-full"></div>
                        <div 
                          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-1000"
                          style={{ width: `${(currentStageIndex / (PROJECT_STAGES.length - 1)) * 100}%`, right: 0, left: 'auto' }}
                        ></div>
                        
                        <div className="relative flex justify-between w-full">
                          {PROJECT_STAGES.map((stage, index) => {
                            const isCompleted = index <= currentStageIndex;
                            const isActive = index === currentStageIndex;
                            
                            return (
                              <div key={stage} className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors duration-500 border-4 border-white dark:border-gray-800 ${isCompleted ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                                </div>
                                <span className={`text-xs mt-2 font-medium ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {getStageName(stage)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. Tech Service Health */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Monitor className="w-6 h-6 text-indigo-500" />
              خزمەتگوزارییە تەکنیکییەکان
            </h2>
            
            {techServices.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                <p className="text-gray-500 dark:text-gray-400">هیچ خزمەتگوزارییەکی تەکنیکی نییە</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {techServices.map(service => (
                  <div key={service.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{service.service_name}</h3>
                        <p className="text-sm text-gray-500">{service.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        چالاکە
                      </span>
                      {service.demoLink && (
                        <a href={service.demoLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                          بینینی سیستەم <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-8">
          
          {/* 1. Latest Works Feed (نوێترین کارەکان) */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                نوێترین کارەکانمان
              </h2>
              <Link to="/company-updates" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                بینینی هەمووی
              </Link>
            </div>
            
            <div className="space-y-6">
              {companyUpdates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Monitor className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">هیچ نوێکردنەوەیەک نییە</p>
                </div>
              ) : (
                companyUpdates.slice(0, 3).map(update => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={update.id} 
                    className="group cursor-pointer block"
                  >
                    <div className="relative h-48 rounded-2xl overflow-hidden mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
                      <img 
                        src={update.image_url} 
                        alt={update.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded-full mb-2 border border-white/20">
                          {new Date(update.created_at).toLocaleDateString('en-GB')}
                        </span>
                        <h3 className="font-bold text-white text-lg leading-tight line-clamp-1 drop-shadow-md">{update.title}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed px-1">{update.description}</p>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* 9. Quick Actions Menu */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">کردارە خێراکان</h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setIsChatOpen(true)} className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-primary/5 hover:text-primary border border-gray-100 dark:border-gray-700 rounded-2xl transition-all group">
                <MessageSquare className="w-6 h-6 mb-2 text-gray-400 group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium">داواکاری نوێ</span>
              </button>
              <Link to="/invoices" className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-primary/5 hover:text-primary border border-gray-100 dark:border-gray-700 rounded-2xl transition-all group">
                <FileText className="w-6 h-6 mb-2 text-gray-400 group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium">بینینی فاتورەکان</span>
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* 2 & 3. Professional Chat UI (Floating Widget) */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 w-[380px] h-[600px] max-h-[80vh] bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 overflow-hidden"
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-primary to-blue-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">تیمی پاڵپشتی MAS</h3>
                  <p className="text-xs text-white/80">ئێمە لێرەین بۆ یارمەتیدانت</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900/50 space-y-4">
              <div className="text-center mb-6">
                <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full">ئەمڕۆ</span>
              </div>
              
              {/* Welcome Message */}
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tr-sm shadow-sm border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                  سڵاو! چۆن دەتوانین یارمەتیت بدەین ئەمڕۆ؟ تکایە پرسیارەکەت بنووسە یان یەکێک لەم هەڵبژاردنانەی خوارەوە دیاری بکە.
                </div>
              </div>

              {/* Render User Requests as Chat History */}
              {myRequests.map((req) => (
                <div key={req.id} className="space-y-4 relative group/chat">
                  {/* Delete entire chat button */}
                  <div className="absolute top-0 right-0 -mr-2 -mt-2 opacity-0 group-hover/chat:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={() => {
                        if (window.confirm('دڵنیایت لە سڕینەوەی ئەم چاتە؟')) {
                          handleDeleteRequest(req.id);
                        }
                      }}
                      className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-sm"
                      title="سڕینەوەی چات"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* User's initial message */}
                  <div className="flex gap-3 max-w-[85%] mr-auto flex-row-reverse">
                    <div className="bg-primary text-white p-3 rounded-2xl rounded-tl-sm shadow-sm text-sm">
                      {req.message}
                    </div>
                  </div>
                  
                  {/* Replies */}
                  {req.replies?.map((reply: any, idx: number) => (
                    <div key={idx} className={`flex gap-3 max-w-[85%] ${reply.sender_id === user?.uid ? 'mr-auto flex-row-reverse' : ''}`}>
                      {reply.sender_id !== user?.uid && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className={`p-3 rounded-2xl shadow-sm text-sm ${reply.sender_id === user?.uid ? 'bg-primary text-white rounded-tl-sm' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-tr-sm'}`}>
                        {reply.message}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Replies */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_REPLIES.map((reply, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSendRequest(reply)}
                  className="whitespace-nowrap px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 hover:text-primary text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full transition-colors border border-transparent hover:border-primary/20"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-800 shrink-0">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendRequest(chatMessage); }}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-full border border-transparent focus-within:border-primary/30 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all"
              >
                <button type="button" className="p-2 text-gray-400 hover:text-primary transition-colors rounded-full">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="نامەکەت لێرە بنووسە..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 text-gray-900 dark:text-white placeholder-gray-400"
                />
                <button 
                  type="submit" 
                  disabled={!chatMessage.trim() || isSubmitting}
                  className="p-2.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 left-6 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 hover:bg-primary/90 transition-all z-40 group"
      >
        {isChatOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
        {!isChatOpen && myRequests.some(r => r.status === 'replied') && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-bounce"></span>
        )}
      </button>

    </div>
  );
}
