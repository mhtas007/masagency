import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { secondaryAuth, db } from './firebase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';
import Marketing from './pages/Marketing';
import Reports from './pages/Reports';
import MasTech from './pages/MasTech';
import Finance from './pages/Finance';
import Notifications from './pages/Notifications';
import NotificationCenter from './pages/NotificationCenter';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Leads from './pages/Leads';
import Team from './pages/Team';
import ClientPortal from './pages/ClientPortal';
import { ThemeProvider } from './contexts/ThemeContext';
import SplashScreen from './components/SplashScreen';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">چاوەڕێ بکە...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const DashboardRouter = () => {
  const { role } = useAuth();
  if (role === 'Client') {
    return <ClientPortal />;
  }
  return <Dashboard />;
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // One-time script to create the requested user and update another
    const manageAdmins = async () => {
      try {
        // 1. Create kurdb234@gmail.com
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, 'kurdb234@gmail.com', 'Mhtas2026');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: 'Kurd Admin',
          email: 'kurdb234@gmail.com',
          role: 'Super Admin',
          created_at: new Date().toISOString()
        });
        console.log('Admin user created successfully');
      } catch (err: any) {
        console.log('Admin user creation skipped or failed:', err.message);
      }

      try {
        // 2. Update mhtasahmad@gmail.com to Super Admin
        const q = query(collection(db, 'users'), where('email', '==', 'mhtasahmad@gmail.com'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, 'users', userDoc.id), {
            role: 'Super Admin',
            updated_at: new Date().toISOString()
          });
          console.log('Role updated successfully for mhtasahmad@gmail.com');
        }
      } catch (err: any) {
        console.log('Role update failed:', err.message);
      }
    };
    manageAdmins();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<DashboardRouter />} />
              <Route path="clients" element={<Clients />} />
              <Route path="projects" element={<Projects />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="reports" element={<Reports />} />
              <Route path="mas-tech" element={<MasTech />} />
              <Route path="finance" element={<Finance />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="notification-center" element={<NotificationCenter />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="leads" element={<Leads />} />
              <Route path="team" element={<Team />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
