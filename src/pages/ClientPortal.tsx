import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  FileText, Briefcase, Monitor, Share2, Megaphone, Send, 
  ChevronRight, ChevronLeft, ExternalLink, Clock, CheckCircle,
  MessageSquare, Sparkles, User, Zap, ShieldCheck, CreditCard,
  Phone, Mail, X, Paperclip, CheckCircle2, Circle, Trash2, ArrowLeft
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';
import { motion, AnimatePresence } from 'motion/react';
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
      await addNotification(
        'نامەی نوێ لە کڕیارەوە',
        `نامەیەکی نوێ هەیە: ${messageText.substring(0, 50)}`,
        'client',
        'Admin',
        undefined,
        '/client-requests'
      );

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
      {/* 1. Premium Hero Section */}
      <div className="relative bg-white dark:bg-gray-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Subtle Background Accents */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6 border border-primary/20"
            >
              <Sparkles className="w-4 h-4" />
              پۆرتاڵی کڕیار
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 dark:text-white tracking-tight leading-tight"
            >
              بەخێربێیت بۆ پۆرتاڵی تایبەتیت
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 dark:text-gray-400 text-base md:text-lg leading-relaxed"
            >
              ئێمە لێرەین بۆ ئەوەی باشترین خزمەتگوزاریت پێشکەش بکەین. چاودێری پرۆژەکانت بکە و لەگەڵمان لە پەیوەندیدا بە بە شێوەیەکی ڕاستەوخۆ و شەفاف.
            </motion.p>
          </div>

          {/* Account Manager Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full lg:w-auto bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-5 md:p-6 rounded-3xl flex items-center gap-5 lg:min-w-[320px] shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="relative shrink-0">
              <img src="https://ui-avatars.com/api/?name=Admin&background=F27D26&color=fff" alt="Manager" className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-white dark:border-gray-800 shadow-sm" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-0.5 font-medium">بەڕێوەبەری هەژمارەکەت</p>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">تیمی پاڵپشتی</h3>
              <div className="flex gap-2 mt-2.5">
                <button onClick={() => setIsChatOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl transition-colors text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm">
                  <MessageSquare className="w-4 h-4" />
                  نامە
                </button>
                <button className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl transition-colors text-gray-700 dark:text-gray-300 shadow-sm">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. Latest Works - Prominent Top Section */}
      {companyUpdates.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-yellow-500" />
              نوێترین کارەکانمان
            </h2>
            <Link to="/company-updates" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1">
              بینینی هەمووی
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {companyUpdates.slice(0, 3).map((update, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={update.id} 
                className="group cursor-pointer bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 dark:border-gray-700 hover:-translate-y-1"
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={update.image_url} 
                    alt={update.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full mb-3 border border-white/20 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      {new Date(update.created_at).toLocaleDateString('en-GB')}
                    </span>
                    <h3 className="font-bold text-white text-xl leading-tight line-clamp-1 drop-shadow-lg mb-2">{update.title}</h3>
                    <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">{update.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 5. Financial Summary & Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">کۆی پارەی دراو</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">${totalPaid.toLocaleString()}</h3>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">بڕی ماوە (قەرز)</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">${totalUnpaid.toLocaleString()}</h3>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6" />
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">پرۆژە چالاکەکان</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{projects.filter(p => p.status !== 'Completed').length}</h3>
            </motion.div>
          </div>

          {/* 6. Project Timeline UI */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Briefcase className="w-6 h-6" />
                </div>
                بەرەوپێشچوونی پرۆژەکان
              </h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                نوێ دەبێتەوە (Live)
              </span>
            </div>
            
            {projects.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <Briefcase className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">هیچ پرۆژەیەکی چالاک نییە</p>
              </div>
            ) : (
              <div className="space-y-8">
                {projects.map(project => {
                  const currentStageIndex = PROJECT_STAGES.indexOf(project.stage || 'Planning');
                  const progressPercentage = (currentStageIndex / (PROJECT_STAGES.length - 1)) * 100;
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={project.id} 
                      className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                      {/* Background Progress Indicator */}
                      <div 
                        className="absolute top-0 right-0 bottom-0 bg-primary/5 dark:bg-primary/10 transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>

                      <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{project.project_name}</h3>
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                                {project.service_type || 'پرۆژە'}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                {Math.round(progressPercentage)}% تەواوبووە
                              </span>
                            </div>
                          </div>
                          {project.demoLink && (
                            <a href={project.demoLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 text-sm text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 px-5 py-2.5 rounded-xl transition-all font-bold shadow-sm hover:shadow-md">
                              <ExternalLink className="w-4 h-4" />
                              بینینی دێمۆ
                            </a>
                          )}
                        </div>

                        {/* Timeline Steps */}
                        <div className="relative pt-6 pb-4 md:pb-8">
                          {/* Desktop Horizontal Timeline */}
                          <div className="hidden md:block relative">
                            {/* Track */}
                            <div className="absolute top-1/2 right-0 w-full h-1.5 bg-gray-100 dark:bg-gray-700 -translate-y-1/2 rounded-full overflow-hidden">
                              <div 
                                className="absolute top-0 right-0 h-full bg-primary transition-all duration-1000 ease-out rounded-full"
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>
                            
                            <div className="relative flex justify-between w-full">
                              {PROJECT_STAGES.map((stage, index) => {
                                const isCompleted = index <= currentStageIndex;
                                const isActive = index === currentStageIndex;
                                
                                return (
                                  <div key={stage} className="flex flex-col items-center relative group">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-4 border-white dark:border-gray-800 shadow-sm ${isCompleted ? 'bg-primary text-white scale-110' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-4 h-4" />}
                                    </div>
                                    <span className={`absolute -bottom-8 whitespace-nowrap text-sm font-bold transition-colors duration-300 ${isActive ? 'text-primary' : isCompleted ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                      {getStageName(stage)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Mobile Vertical Timeline */}
                          <div className="md:hidden relative border-r-2 border-gray-100 dark:border-gray-700 pr-6 space-y-6">
                            {/* Active Track */}
                            <div 
                              className="absolute top-0 right-[-2px] w-0.5 bg-primary transition-all duration-1000 ease-out"
                              style={{ height: `${progressPercentage}%` }}
                            ></div>

                            {PROJECT_STAGES.map((stage, index) => {
                              const isCompleted = index <= currentStageIndex;
                              const isActive = index === currentStageIndex;
                              
                              return (
                                <div key={stage} className="relative">
                                  <div className={`absolute top-1/2 -right-[35px] -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-4 border-white dark:border-gray-800 shadow-sm ${isCompleted ? 'bg-primary text-white scale-110' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                                  </div>
                                  <div className={`bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border ${isActive ? 'border-primary/30 shadow-sm' : 'border-gray-100 dark:border-gray-700'}`}>
                                    <span className={`text-sm font-bold transition-colors duration-300 ${isActive ? 'text-primary' : isCompleted ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                      {getStageName(stage)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. Tech Service Health */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
                  <Monitor className="w-6 h-6" />
                </div>
                خزمەتگوزارییە تەکنیکییەکان
              </h2>
            </div>
            
            {techServices.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <Monitor className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">هیچ خزمەتگوزارییەکی تەکنیکی نییە</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {techServices.map(service => (
                  <motion.div 
                    whileHover={{ y: -2 }}
                    key={service.id} 
                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{service.service_name}</h3>
                        <p className="text-sm text-gray-500 font-medium">{service.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span>
                        چالاکە
                      </span>
                      {service.demoLink && (
                        <a href={service.demoLink} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-colors">
                          بینینی سیستەم <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-8">
          
          {/* 9. Quick Actions Menu */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500" />
              کردارە خێراکان
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsChatOpen(true)} className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 hover:bg-primary/5 hover:border-primary/30 border border-gray-100 dark:border-gray-700 rounded-2xl transition-all group hover:shadow-md hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-3 shadow-sm group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                  <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">داواکاری نوێ</span>
              </button>
              <Link to="/invoices" className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 hover:bg-primary/5 hover:border-primary/30 border border-gray-100 dark:border-gray-700 rounded-2xl transition-all group hover:shadow-md hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-3 shadow-sm group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                  <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">بینینی فاتورەکان</span>
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
            className="fixed bottom-0 left-0 right-0 md:bottom-24 md:left-6 md:right-auto w-full md:w-[400px] h-[85vh] md:h-[650px] max-h-[100vh] md:max-h-[85vh] bg-white dark:bg-gray-800 md:rounded-[2rem] rounded-t-[2rem] shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 overflow-hidden"
          >
            {/* Chat Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">تیمی پاڵپشتی MAS</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    ئێستا ئۆنلاینین
                  </p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50/50 dark:bg-gray-900/20">
              <div className="text-center mb-6">
                <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full">ئەمڕۆ</span>
              </div>
              
              {/* Welcome Message */}
              <div className="flex gap-3 max-w-[90%]">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-tr-sm shadow-sm border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
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
                  <div className="flex gap-3 max-w-[90%] mr-auto flex-row-reverse">
                    <div className="bg-primary text-white p-4 rounded-2xl rounded-tl-sm shadow-sm text-sm leading-relaxed">
                      {req.message}
                    </div>
                  </div>
                  
                  {/* Replies */}
                  {req.replies?.map((reply: any, idx: number) => (
                    <div key={idx} className={`flex gap-3 max-w-[90%] ${reply.sender_id === user?.uid ? 'mr-auto flex-row-reverse' : ''}`}>
                      {reply.sender_id !== user?.uid && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${reply.sender_id === user?.uid ? 'bg-primary text-white rounded-tl-sm' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-tr-sm'}`}>
                        {reply.message}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Replies */}
            <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto hide-scrollbar shrink-0">
              {QUICK_REPLIES.map((reply, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSendRequest(reply)}
                  className="whitespace-nowrap px-4 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-primary/10 hover:text-primary text-gray-600 dark:text-gray-300 text-xs font-bold rounded-full transition-colors border border-gray-200 dark:border-gray-600 hover:border-primary/30"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-800 shrink-0 border-t border-gray-100 dark:border-gray-700 pb-safe">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendRequest(chatMessage); }}
                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm"
              >
                <button type="button" className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors rounded-xl">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="نامەکەت لێرە بنووسە..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm md:text-base text-gray-900 dark:text-white px-2 placeholder-gray-400"
                  disabled={isSubmitting}
                />
                <button 
                  type="submit" 
                  disabled={!chatMessage.trim() || isSubmitting}
                  className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                >
                  <Send className="w-5 h-5 rtl:rotate-180" />
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
