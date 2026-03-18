import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Leads from './pages/Leads';
import Team from './pages/Team';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">چاوەڕێ بکە...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="projects" element={<Projects />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="reports" element={<Reports />} />
            <Route path="mas-tech" element={<MasTech />} />
            <Route path="finance" element={<Finance />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="leads" element={<Leads />} />
            <Route path="team" element={<Team />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
