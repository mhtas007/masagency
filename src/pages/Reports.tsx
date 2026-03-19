import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

import { useAuth } from '../contexts/AuthContext';

export default function Reports() {
  const { role } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (role === 'Client') return;

    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    });
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });
    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });
    return () => { unsubInvoices(); unsubProjects(); unsubTransactions(); };
  }, [role]);

  // Process Revenue Data
  const processRevenueData = () => {
    const months = ['کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'];
    const data = months.map(name => ({ name, revenue: 0, expenses: 0 }));

    transactions.forEach(t => {
      if (t.date) {
        const date = new Date(t.date);
        const monthIndex = date.getMonth();
        if (t.type === 'Income') {
          data[monthIndex].revenue += t.amount;
        } else if (t.type === 'Expense') {
          data[monthIndex].expenses += t.amount;
        }
      }
    });

    // Also add paid invoices to revenue
    invoices.forEach(inv => {
      if (inv.status === 'Paid' && inv.created_at) {
        const date = new Date(inv.created_at);
        const monthIndex = date.getMonth();
        data[monthIndex].revenue += inv.price_usd || 0;
      }
    });

    // Filter to show only months up to current month or with data
    const currentMonth = new Date().getMonth();
    return data.slice(0, Math.max(currentMonth + 1, 6)); // Show at least 6 months
  };

  // Process Project Data
  const processProjectData = () => {
    const data = [
      { name: 'چاوەڕێکراو', count: 0 },
      { name: 'لە کارکردندایە', count: 0 },
      { name: 'پێداچوونەوە', count: 0 },
      { name: 'تەواوکراو', count: 0 },
    ];

    projects.forEach(p => {
      if (p.status === 'Pending') data[0].count++;
      else if (p.status === 'In Progress') data[1].count++;
      else if (p.status === 'Review') data[2].count++;
      else if (p.status === 'Completed') data[3].count++;
    });

    return data;
  };

  const revenueData = processRevenueData();
  const projectData = processProjectData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">راپۆرت و شیکاری</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">داهات و خەرجی مانگانە (USD)</h3>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#F3F4F6'}} />
                <Bar dataKey="revenue" fill="#111827" radius={[4, 4, 0, 0]} name="داهات" />
                <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="خەرجی" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Projects Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">دۆخی پرۆژەکان</h3>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                <Tooltip cursor={{fill: '#F3F4F6'}} />
                <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} name="ژمارەی پرۆژەکان" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
