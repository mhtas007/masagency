import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FileText, Briefcase, Monitor, Share2, Megaphone } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function ClientPortal() {
  const { clientId } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [techServices, setTechServices] = useState<any[]>([]);
  const [socialContracts, setSocialContracts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

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

    return () => {
      unsubInvoices();
      unsubProjects();
      unsubTech();
      unsubSocial();
      unsubCampaigns();
    };
  }, [clientId]);

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">پۆرتاڵی مشتەری</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">بەخێربێیت بۆ پۆرتاڵی تایبەت بە خۆت</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard title="وەسڵەکان" value={invoices.length} icon={FileText} colorClass="bg-blue-500" />
        <StatCard title="پڕۆژەکان" value={projects.length} icon={Briefcase} colorClass="bg-purple-500" />
        <StatCard title="خزمەتگوزاری تەکنەلۆژی" value={techServices.length} icon={Monitor} colorClass="bg-green-500" />
        <StatCard title="گرێبەستی سۆشیاڵ میدیا" value={socialContracts.length} icon={Share2} colorClass="bg-orange-500" />
        <StatCard title="کەمپەینەکان" value={campaigns.length} icon={Megaphone} colorClass="bg-pink-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              دوایین وەسڵەکان
            </h2>
            <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-700 font-medium">هەمووی ببینە</Link>
          </div>
          <div className="p-5">
            {invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.slice(0, 5).map(invoice => (
                  <div key={invoice.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">وەسڵی ژمارە {invoice.invoice_number}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(invoice.date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900 dark:text-white">${invoice.total}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        invoice.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {invoice.status === 'Paid' ? 'دراوە' : invoice.status === 'Pending' ? 'چاوەڕێکراو' : 'دواکەوتوو'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">هیچ وەسڵێک نییە</p>
            )}
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-500" />
              دوایین پڕۆژەکان
            </h2>
            <Link to="/projects" className="text-sm text-purple-600 hover:text-purple-700 font-medium">هەمووی ببینە</Link>
          </div>
          <div className="p-5">
            {projects.length > 0 ? (
              <div className="space-y-4">
                {projects.slice(0, 5).map(project => (
                  <div key={project.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(project.start_date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      project.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                      project.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {project.status === 'Completed' ? 'تەواوبوو' : project.status === 'In Progress' ? 'بەردەوامە' : 'پلاندانان'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">هیچ پڕۆژەیەک نییە</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
