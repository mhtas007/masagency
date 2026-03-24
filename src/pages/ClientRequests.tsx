import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { addNotification } from '../utils/notifications';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, CheckCircle, Clock, Send, X, User, ShieldCheck, CheckCircle2, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function ClientRequests() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role === 'Client') {
      navigate('/');
      return;
    }

    const q = query(collection(db, 'client_requests'), orderBy('updated_at', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(reqs);
      
      // Update selected request if it exists
      if (selectedRequest) {
        const updated = reqs.find(r => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
      
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'client_requests');
      setLoading(false);
    });

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsub(); unsubClients(); };
  }, [role, selectedRequest?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedRequest?.replies]);

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'نەناسراو';
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedRequest) return;

    try {
      const newReply = {
        message: replyMessage,
        sender_id: user?.uid,
        sender_name: user?.email?.split('@')[0] || 'Admin',
        created_at: new Date().toISOString()
      };

      const replies = selectedRequest.replies || [];
      
      await updateDoc(doc(db, 'client_requests', selectedRequest.id), {
        replies: [...replies, newReply],
        status: 'replied',
        updated_at: new Date().toISOString()
      });

      // Send notification to the client
      await addNotification(
        'وەڵام بۆ داواکارییەکەت',
        `وەڵامێکی نوێ هەیە بۆ داواکارییەکەت: ${selectedRequest.subject}`,
        'client',
        undefined,
        selectedRequest.user_id,
        '/'
      );

      setReplyMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `client_requests/${selectedRequest.id}`);
    }
  };

  const handleCloseRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, 'client_requests', id), {
        status: 'closed',
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `client_requests/${id}`);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm('دڵنیایت لە سڕینەوەی ئەم چاتە؟')) return;
    try {
      await deleteDoc(doc(db, 'client_requests', id));
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `client_requests/${id}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">چاوەڕێ بکە...</div>;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          داواکاری کڕیاران
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">وەڵامدانەوەی پرسیار و داواکارییەکانی کڕیاران</p>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex relative">
        {/* Left Sidebar - List of Requests */}
        <div className={`w-full md:w-1/3 border-l border-gray-100 dark:border-gray-700 flex flex-col bg-gray-50/50 dark:bg-gray-800/50 ${selectedRequest ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-white">نامەکان ({requests.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">هیچ داواکارییەک نییە</div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="relative group/item">
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className={`w-full text-right p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-colors ${selectedRequest?.id === req.id ? 'bg-white dark:bg-gray-700 border-r-4 border-r-primary' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-900 dark:text-white truncate pr-2">{getClientName(req.client_id)}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(req.updated_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium truncate mb-2">{req.subject}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[70%]">{req.message}</p>
                      {req.status === 'pending' && <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
                      {req.status === 'replied' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                      {req.status === 'closed' && <span className="w-2 h-2 rounded-full bg-gray-400"></span>}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRequest(req.id);
                    }}
                    className="absolute top-4 left-4 p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity"
                    title="سڕینەوە"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Area - Chat Interface */}
        <div className={`w-full md:w-2/3 flex flex-col bg-white dark:bg-gray-800 absolute md:relative inset-0 z-10 md:z-auto transition-transform duration-300 ${selectedRequest ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
          {selectedRequest ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className="md:hidden p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{getClientName(selectedRequest.client_id)}</h3>
                    <p className="text-xs text-gray-500">{selectedRequest.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDeleteRequest(selectedRequest.id)}
                    className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors flex items-center gap-2"
                    title="سڕینەوەی چات"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:block">سڕینەوە</span>
                  </button>
                  {selectedRequest.status !== 'closed' && (
                    <button
                      onClick={() => handleCloseRequest(selectedRequest.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      داخستن
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-gray-900/30">
                {/* Initial Request */}
                <div className="flex gap-4 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-tr-sm shadow-sm border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                      {selectedRequest.message}
                    </div>
                    <span className="text-xs text-gray-400 mt-1 block px-1">
                      {new Date(selectedRequest.created_at).toLocaleString('en-GB')}
                    </span>
                  </div>
                </div>

                {/* Replies */}
                {selectedRequest.replies?.map((reply: any, idx: number) => {
                  const isAdmin = reply.sender_id === user?.uid || reply.sender_name === 'Admin';
                  return (
                    <div key={idx} className={`flex gap-4 max-w-[80%] ${isAdmin ? 'mr-auto flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-primary/10 text-primary' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className={`p-4 rounded-2xl shadow-sm ${isAdmin ? 'bg-primary text-white rounded-tl-sm' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tr-sm'}`}>
                          {reply.message}
                        </div>
                        <span className={`text-xs text-gray-400 mt-1 block px-1 ${isAdmin ? 'text-left' : 'text-right'}`}>
                          {new Date(reply.created_at).toLocaleString('en-GB')}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              {selectedRequest.status !== 'closed' ? (
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                  <form onSubmit={handleReply} className="flex items-end gap-2">
                    <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2">
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="وەڵامەکەت لێرە بنووسە..."
                        className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400 p-2 min-h-[44px] max-h-[120px]"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReply(e);
                          }
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!replyMessage.trim()}
                      className="p-3.5 bg-primary text-white rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors shadow-sm shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                  <p className="text-xs text-gray-400 mt-2 text-center">بۆ ناردن Enter دابگرە، بۆ دێڕی نوێ Shift + Enter</p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 text-center">
                  <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    ئەم داواکارییە داخراوە
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">نامەیەک هەڵبژێرە بۆ بینین</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
