import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  Megaphone, 
  BarChart3, 
  Settings, 
  LogOut,
  MonitorSmartphone,
  CreditCard,
  Bell,
  Menu,
  X,
  CheckSquare,
  Target,
  Shield
} from 'lucide-react';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'داشبۆرد', href: '/', icon: LayoutDashboard },
  { name: 'مشتەرییەکان (CRM)', href: '/clients', icon: Users },
  { name: 'پڕۆژەکان', href: '/projects', icon: Briefcase },
  { name: 'فڕۆشتن و فاتورە', href: '/invoices', icon: FileText },
  { name: 'مارکێتینگی دیجیتاڵی', href: '/marketing', icon: Megaphone },
  { name: 'راپۆرت و شیکاری', href: '/reports', icon: BarChart3 },
  { name: 'تەکنەلۆجیای MAS', href: '/mas-tech', icon: MonitorSmartphone },
  { name: 'سیستەمی دارایی', href: '/finance', icon: CreditCard },
  { name: 'ئەرکەکان (Tasks)', href: '/tasks', icon: CheckSquare },
  { name: 'چاوەڕوانکراوەکان (Leads)', href: '/leads', icon: Target },
  { name: 'تیم و دەسەڵاتەکان', href: '/team', icon: Shield },
  { name: 'ئاگادارکردنەوەکان', href: '/notifications', icon: Bell },
  { name: 'ڕێکخستنەکان', href: '/settings', icon: Settings },
];

export default function Layout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('read', '==', false));
    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    });
    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-64 bg-white border-l border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between border-b border-gray-200 px-4">
          <img src="https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png" alt="MAS Agency" className="h-10 w-auto" referrerPolicy="no-referrer" />
          <button 
            onClick={closeMobileMenu}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors',
                  isActive
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-700 hover:bg-gray-100'
                )
              }
            >
              <item.icon className="w-5 h-5 ml-3 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-black font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="mr-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate" dir="ltr">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-500 truncate">{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4 ml-2" />
            چوونە دەرەوە
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:mr-64 flex flex-col min-h-screen w-full">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <img src="https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png" alt="MAS Agency" className="h-8 w-auto" referrerPolicy="no-referrer" />
              <h2 className="text-lg font-semibold text-gray-800">سیستەمی بەڕێوەبردن</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </Link>
          </div>
        </header>
        
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

