import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Briefcase, DollarSign, TrendingUp } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { role } = useAuth();
  const [stats, setStats] = useState({
    clients: 0,
    projects: 0,
    revenueUSD: 0,
    revenueIQD: 0
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (role === 'Client') return;

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setStats(prev => ({ ...prev, clients: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    const unsubProjects = onSnapshot(query(collection(db, 'projects'), where('status', 'in', ['Pending', 'In Progress', 'Review'])), (snapshot) => {
      setStats(prev => ({ ...prev, projects: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      const invoicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setInvoices(invoicesData);
      
      let totalUSD = 0;
      let totalIQD = 0;
      invoicesData.forEach(inv => {
        if (inv.status === 'Paid') {
          totalUSD += inv.price_usd || 0;
          totalIQD += inv.price_iqd || 0;
        }
      });
      setStats(prev => ({ ...prev, revenueUSD: totalUSD, revenueIQD: totalIQD }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    });

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => { 
      unsubClients(); 
      unsubProjects(); 
      unsubInvoices(); 
      unsubTransactions(); 
    };
  }, [role]);

  const processRevenueData = () => {
    const months = ['کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'];
    const data = months.map(name => ({ name, revenue: 0 }));

    transactions.forEach(t => {
      if (t.date && t.type === 'Income') {
        const date = new Date(t.date);
        const monthIndex = date.getMonth();
        data[monthIndex].revenue += t.amount;
      }
    });

    invoices.forEach(inv => {
      if (inv.status === 'Paid' && inv.created_at) {
        const date = new Date(inv.created_at);
        const monthIndex = date.getMonth();
        data[monthIndex].revenue += inv.price_usd || 0;
      }
    });

    const currentMonth = new Date().getMonth();
    return data.slice(0, Math.max(currentMonth + 1, 6)); 
  };

  const chartData = processRevenueData();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">کۆی داهات (USD)</h3>
            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">${stats.revenueUSD.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">کۆی داهات (IQD)</h3>
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">{stats.revenueIQD.toLocaleString()} د.ع</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">پرۆژە چالاکەکان</h3>
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-900 dark:text-white">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.projects}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">مشتەرییەکان</h3>
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-900 dark:text-white">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.clients}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">ئاستی داهاتی مانگانە (USD)</h3>
        <div className="h-80 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} />
              <Tooltip cursor={{fill: 'rgba(156, 163, 175, 0.1)'}} contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }} />
              <Bar dataKey="revenue" fill="#F27D26" radius={[4, 4, 0, 0]} name="داهات" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
