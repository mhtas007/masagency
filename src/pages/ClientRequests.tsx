import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, CheckCircle, Clock, Send, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function ClientRequests() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'Client') {
      navigate('/');
      return;
    }

    const q = query(collection(db, 'client_requests'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'client_requests');
      setLoading(false);
    });

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsub(); unsubClients(); };
  }, [role]);

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
      await addDoc(collection(db, 'notifications'), {
        user_id: selectedRequest.user_id,
        title: 'وەڵام بۆ داواکارییەکەت',
        message: `وەڵامێکی نوێ هەیە بۆ داواکارییەکەت: ${selectedRequest.subject}`,
        type: 'client',
        read: false,
        created_at: new Date().toISOString()
      });

      setReplyMessage('');
      setSelectedRequest({ ...selectedRequest, replies: [...replies, newReply], status: 'replied' });
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

  if (loading) return <div className="p-8 text-center text-gray-500">چاوەڕێ بکە...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">داواکاری کڕیاران</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">وەڵامدانەوەی پرسیار و داواکارییەکانی کڕیاران</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests List */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-[calc(100vh-200px)] flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="font-semibold text-gray-900 dark:text-white">لیستی داواکارییەکان</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {requests.length === 0 ? (
              <p className="text-center text-gray-500 py-8">هیچ داواکارییەک نییە</p>
            ) : (
              requests.map(req => (
                <div 
                  key={req.id} 
                  onClick={() => setSelectedRequest(req)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedRequest?.id === req.id ? 'bg-primary/5 border-primary/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-300'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate pr-2">{req.subject}</h3>
                    {req.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full whitespace-nowrap">چاوەڕێکراو</span>}
                    {req.status === 'replied' && <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded-full whitespace-nowrap">وەڵامدراوەتەوە</span>}
                    {req.status === 'closed' && <span className="bg-gray-100 text-gray-800 text-[10px] px-2 py-1 rounded-full whitespace-nowrap">داخراو</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{getClientName(req.client_id)}</p>
                  <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString('en-GB')}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Request Details & Chat */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-[calc(100vh-200px)] flex flex-col">
          {selectedRequest ? (
            <>
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">{selectedRequest.subject}</h2>
                  <p className="text-sm text-gray-500">{getClientName(selectedRequest.client_id)}</p>
                </div>
                {selectedRequest.status !== 'closed' && (
                  <button 
                    onClick={() => handleCloseRequest(selectedRequest.id)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    داخستن
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50">
                {/* Original Message */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-tr-none shadow-sm border border-gray-100 dark:border-gray-700 flex-1">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedRequest.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(selectedRequest.created_at).toLocaleString('en-GB')}</p>
                  </div>
                </div>

                {/* Replies */}
                {selectedRequest.replies?.map((reply: any, index: number) => (
                  <div key={index} className={`flex gap-4 ${reply.sender_id === user?.uid ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${reply.sender_id === user?.uid ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                      {reply.sender_name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm border flex-1 ${reply.sender_id === user?.uid ? 'bg-blue-50 border-blue-100 rounded-tl-none' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-tr-none'}`}>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{reply.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(reply.created_at).toLocaleString('en-GB')}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              {selectedRequest.status !== 'closed' ? (
                <form onSubmit={handleReply} className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                      placeholder="وەڵامەکەت لێرە بنووسە..." 
                      className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 dark:bg-gray-700 dark:text-white"
                    />
                    <button 
                      type="submit" 
                      disabled={!replyMessage.trim()}
                      className="bg-primary text-white p-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center w-12"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center text-gray-500">
                  ئەم داواکارییە داخراوە
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p>داواکارییەک هەڵبژێرە بۆ بینینی وردەکارییەکان</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
