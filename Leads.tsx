import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError('ئیمەیڵ یان وشەی نهێنی هەڵەیە، تکایە دڵنیابەرەوە.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src="https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png" alt="MAS Agency" className="h-24 w-auto mb-4" referrerPolicy="no-referrer" />
          <p className="text-gray-500">سیستەمی بەڕێوەبردنی ئەجێنسی</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ئیمەیڵ</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900" 
              dir="ltr"
              placeholder="admin@masagency.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وشەی نهێنی</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900" 
              dir="ltr"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition-colors shadow-sm disabled:opacity-70"
          >
            {loading ? 'چاوەڕێ بکە...' : 'چوونە ژوورەوە'}
          </button>
        </form>
      </div>
    </div>
  );
}

