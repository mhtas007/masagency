import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, onSnapshot, query, orderBy, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { onMessage } from 'firebase/messaging';
import { db, messaging } from '../firebase';
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
  Shield,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationPermission } from './NotificationPermission';
import { showBrowserNotification } from '../utils/notifications';

const adminNavigation = [
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
  { name: 'سەنتەری ئاگادارکردنەوە', href: '/notification-center', icon: Megaphone },
  { name: 'ڕێکخستنەکان', href: '/settings', icon: Settings },
];

const clientNavigation = [
  { name: 'پۆرتاڵی مشتەری', href: '/', icon: LayoutDashboard },
  { name: 'پڕۆژەکان', href: '/projects', icon: Briefcase },
  { name: 'فڕۆشتن و فاتورە', href: '/invoices', icon: FileText },
  { name: 'مارکێتینگی دیجیتاڵی', href: '/marketing', icon: Megaphone },
  { name: 'تەکنەلۆجیای MAS', href: '/mas-tech', icon: MonitorSmartphone },
  { name: 'ئاگادارکردنەوەکان', href: '/notifications', icon: Bell },
];

export default function Layout() {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const setupMessaging = async () => {
      try {
        const msg = await messaging();
        if (msg) {
          onMessage(msg, (payload) => {
            console.log('Foreground message received:', payload);
            if (payload.notification) {
              // Show a browser notification
              showBrowserNotification(payload.notification.title || 'New Notification', {
                body: payload.notification.body,
                icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png'
              });
            }
          });
        }
      } catch (error) {
        console.error('Error setting up foreground messaging:', error);
      }
    };
    setupMessaging();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'notifications'), 
      where('user_id', '==', user.uid),
      where('read', '==', false)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);

      // Check for new notifications to show browser alert
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only show notification if it was created recently (e.g., last 10 seconds)
          // to avoid showing notifications for old unread messages on load
          const createdAt = new Date(data.created_at).getTime();
          const now = new Date().getTime();
          if (now - createdAt < 10000) {
            showBrowserNotification(data.title || 'ئاگادارکردنەوەی نوێ', {
              body: data.message,
              icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png'
            });
          }
        }
      });
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    // Client-side scheduled notification processing has been moved to the server
    // for better reliability and to ensure notifications are sent even when the browser is closed.
  }, [role]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navigation = role === 'Client' ? clientNavigation : adminNavigation;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-200" dir="rtl">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4">
          <img src="https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png" alt="MAS Agency" className="h-10 w-auto" referrerPolicy="no-referrer" />
          <button 
            onClick={closeMobileMenu}
            className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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
                    ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )
              }
            >
              <item.icon className="w-5 h-5 ml-3 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-black dark:text-white font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="mr-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate" dir="ltr">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4 ml-2" />
            چوونە دەرەوە
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:mr-64 flex flex-col min-h-screen w-full">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <img src="https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png" alt="MAS Agency" className="h-8 w-auto" referrerPolicy="no-referrer" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">سیستەمی بەڕێوەبردن</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'dark' ? 'دۆخی ڕووناکی' : 'دۆخی تاریک'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/notifications" className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
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
      <NotificationPermission />
    </div>
  );
}

