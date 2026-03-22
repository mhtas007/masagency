import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FileText, Briefcase, Monitor, Share2, Megaphone, Send, ChevronRight, ChevronLeft, ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { addNotification } from '../utils/notifications';

const SLIDES = [
  {
    title: 'بەخێربێیت بۆ پۆرتاڵی کڕیاران',
    description: 'لێرە دەتوانیت چاودێری هەموو کارەکانت بکەیت بە شێوەیەکی ڕاستەوخۆ و شەفاف.',
    icon: Monitor,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20'
  },
  {
    title: 'چاودێری پرۆژەکانت بکە',
    description: 'دەتوانیت قۆناغی پرۆژەکانت ببینی و لە ڕێگەی لینکی دێمۆوە سەیری پێشکەوتنەکان بکەیت.',
    icon: Briefcase,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20'
  },
  {
    title: 'پەیوەندی ڕاستەوخۆ',
    description: 'هەر داواکارییەک یان پرسیارێکت هەیە، دەتوانیت ڕاستەوخۆ لێرەوە بینێریت و وەڵام وەربگریت.',
    icon: Send,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20'
  }
];

const LATEST_TECHNOLOGIES = [
  { name: 'React 18 & Next.js 14', desc: 'خێراترین و نوێترین تەکنەلۆجیا بۆ وێبسایت', tag: 'Web' },
  { name: 'Flutter 3.19', desc: 'دروستکردنی ئەپڵیکەیشن بۆ هەردوو سیستەمی iOS و Android', tag: 'Mobile' },
  { name: 'AI Integration', desc: 'بەستنەوەی سیستەمەکان بە ژیری دەستکردەوە', tag: 'AI' },
  { name: 'Cloud Computing', desc: 'پاراستن و خێرایی زانیارییەکان لەسەر کڵاود', tag: 'Cloud' }
];

export default function ClientPortal() {
  const { clientId, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [techServices, setTechServices] = useState<any[]>([]);
  const [socialContracts, setSocialContracts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [requestSubject, setRequestSubject] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const unsubSocial = onSnapshot(
      query(collection(db, 'social_contracts'), where('client_id', '==', clientId)),
      (snapshot) => setSocialContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'social_contracts')
    );

    const unsubCampaigns = onSnapshot(
      query(collection(db, 'campaigns'), where('client_id', '==', clientId)),
      (snapshot) => setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'campaigns')
    );

    const unsubRequests = onSnapshot(
      query(collection(db, 'client_requests'), where('client_id', '==', clientId)),
      (snapshot) => setMyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())),
      (error) => handleFirestoreError(error, OperationType.LIST, 'client_requests')
    );

    return () => {
      unsubInvoices();
      unsubProjects();
      unsubTech();
      unsubSocial();
      unsubCampaigns();
      unsubRequests();
    };
  }, [clientId]);

  // Auto-advance slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestSubject.trim() || !requestMessage.trim() || !clientId || !user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'client_requests'), {
        client_id: clientId,
        user_id: user.uid,
        subject: requestSubject,
        message: requestMessage,
        status: 'pending',
        replies: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Notify admins
      await addDoc(collection(db, 'notifications'), {
        user_id: 'admin', // Ideally target specific admin IDs, but this works if admins listen to all or we have a generic admin channel
        title: 'داواکاری نوێ لە کڕیارەوە',
        message: `داواکارییەکی نوێ هەیە بە ناونیشانی: ${requestSubject}`,
        type: 'client',
        read: false,
        created_at: new Date().toISOString()
      });

      setRequestSubject('');
      setRequestMessage('');
      addNotification('سەرکەوتوو بوو', 'داواکارییەکەت بە سەرکەوتوویی نێردرا', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'client_requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  const getStagePercentage = (stage: string) => {
    switch(stage) {
      case 'Planning': return 20;
      case 'Design': return 40;
      case 'Development': return 70;
      case 'Testing': return 90;
      case 'Completed': return 100;
      default: return 0;
    }
  };

  const getStageName = (stage: string) => {
    switch(stage) {
      case 'Planning': return 'پلان دانان';
      case 'Design': return 'دیزاین';
      case 'Development': return 'گەشەپێدان';
      case 'Testing': return 'تاقیکردنەوە';
      case 'Completed': return 'تەواوکراو';
      default: return stage || 'پلان دانان';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Slider */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">بەخێربێیت بۆ پۆرتاڵی تایبەتیت</h1>
            <p className="text-gray-300 mb-8 max-w-lg">ئێمە لێرەین بۆ ئەوەی باشترین خزمەتگوزاریت پێشکەش بکەین. چاودێری پرۆژەکانت بکە و لەگەڵمان لە پەیوەندیدا بە.</p>
            
            {/* Slider Content */}
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-h-[160px] flex items-center transition-all duration-500">
              <div className="flex items-start gap-5 w-full">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${SLIDES[currentSlide].bg}`}>
                  {React.createElement(SLIDES[currentSlide].icon, { className: `w-7 h-7 ${SLIDES[currentSlide].color}` })}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{SLIDES[currentSlide].title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{SLIDES[currentSlide].description}</p>
                </div>
              </div>
            </div>
            
            {/* Slider Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {SLIDES.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Latest Technologies */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            نوێترین تەکنەلۆجیاکان
          </h2>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {LATEST_TECHNOLOGIES.map((tech, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 hover:border-primary/30 transition-colors group">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-primary transition-colors">{tech.name}</h3>
                  <span className="text-[10px] bg-white dark:bg-gray-600 px-2 py-1 rounded-md text-gray-500 dark:text-gray-300 shadow-sm">{tech.tag}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="پرۆژەکان" value={projects.length} icon={Briefcase} colorClass="bg-purple-500" />
        <StatCard title="وەسڵەکان" value={invoices.length} icon={FileText} colorClass="bg-blue-500" />
        <StatCard title="خزمەتگوزاری تەکنەلۆژی" value={techServices.length} icon={Monitor} colorClass="bg-green-500" />
        <StatCard title="گرێبەستی سۆشیاڵ" value={socialContracts.length} icon={Share2} colorClass="bg-orange-500" />
        <StatCard title="کەمپەینەکان" value={campaigns.length} icon={Megaphone} colorClass="bg-pink-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Projects & Tech Services Progress */}
        <div className="space-y-8">
          {/* Projects Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-500" />
                پێشکەوتنی پرۆژەکانت
              </h2>
              <Link to="/projects" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                هەمووی <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {projects.length > 0 ? (
                <div className="space-y-6">
                  {projects.map(project => (
                    <div key={project.id} className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{project.project_name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{project.service_type}</p>
                        </div>
                        {project.demoLink && (
                          <a 
                            href={project.demoLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm bg-white dark:bg-gray-600 px-3 py-1.5 rounded-lg text-primary hover:bg-primary hover:text-white transition-colors shadow-sm border border-gray-200 dark:border-gray-500"
                          >
                            <ExternalLink className="w-4 h-4" />
                            بینینی دێمۆ
                          </a>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">قۆناغی ئێستا: {getStageName(project.stage)}</span>
                          <span className="text-gray-900 dark:text-white font-bold">{getStagePercentage(project.stage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-primary to-purple-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${getStagePercentage(project.stage)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Briefcase className="w-16 h-16 mb-4 opacity-20" />
                  <p>هیچ پرۆژەیەک نییە</p>
                </div>
              )}
            </div>
          </div>

          {/* Tech Services Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-green-500" />
                خزمەتگوزارییە تەکنەلۆژییەکانت
              </h2>
              <Link to="/mas-tech" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                هەمووی <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {techServices.length > 0 ? (
                <div className="space-y-6">
                  {techServices.map(service => (
                    <div key={service.id} className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{service.service_name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{service.type}</p>
                        </div>
                        {service.demoLink && (
                          <a 
                            href={service.demoLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm bg-white dark:bg-gray-600 px-3 py-1.5 rounded-lg text-primary hover:bg-primary hover:text-white transition-colors shadow-sm border border-gray-200 dark:border-gray-500"
                          >
                            <ExternalLink className="w-4 h-4" />
                            بینینی دێمۆ
                          </a>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">قۆناغی ئێستا: {getStageName(service.stage)}</span>
                          <span className="text-gray-900 dark:text-white font-bold">{getStagePercentage(service.stage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-primary to-green-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${getStagePercentage(service.stage)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Monitor className="w-16 h-16 mb-4 opacity-20" />
                  <p>هیچ خزمەتگوزارییەکی تەکنەلۆژیت نییە</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Send Request & My Requests */}
        <div className="space-y-6">
          {/* Send Request Form */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-l from-emerald-50 to-white dark:from-emerald-900/10 dark:to-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-500" />
                ناردنی داواکاری یان پرسیار
              </h2>
              <p className="text-sm text-gray-500 mt-1">ڕاستەوخۆ پەیوەندیمان پێوە بکە بۆ هەر داواکارییەکی نوێ</p>
            </div>
            <form onSubmit={handleSendRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">بابەت</label>
                <input 
                  required
                  type="text" 
                  value={requestSubject}
                  onChange={e => setRequestSubject(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-shadow"
                  placeholder="نموونە: داواکاری گۆڕانکاری لە دیزاین..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">وردەکاری</label>
                <textarea 
                  required
                  rows={4}
                  value={requestMessage}
                  onChange={e => setRequestMessage(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-shadow resize-none"
                  placeholder="وردەکاری داواکارییەکەت لێرە بنووسە..."
                ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || !requestSubject.trim() || !requestMessage.trim()}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'چاوەڕێ بکە...' : (
                  <>
                    <Send className="w-5 h-5" />
                    ناردنی داواکاری
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Recent Requests Status */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                داواکارییەکانی پێشووم
              </h2>
            </div>
            <div className="p-6 max-h-[300px] overflow-y-auto">
              {myRequests.length > 0 ? (
                <div className="space-y-4">
                  {myRequests.slice(0, 5).map(req => (
                    <div key={req.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-600">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">{req.subject}</h3>
                        {req.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full">چاوەڕێکراو</span>}
                        {req.status === 'replied' && <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded-full">وەڵامدراوەتەوە</span>}
                        {req.status === 'closed' && <span className="bg-gray-100 text-gray-800 text-[10px] px-2 py-1 rounded-full">داخراو</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{req.message}</p>
                      {req.replies && req.replies.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">دوایین وەڵام:</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{req.replies[req.replies.length - 1].message}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-6">
                  <p>هیچ داواکارییەکت نەناردووە</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
