import React, { useState, useEffect, useRef } from 'react';
import { chatApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface Conversation {
  id: number;
  otherUser: { id: number; name: string; avatarUrl?: string };
  lastMessage?: { text: string; createdAt: string };
  unreadCount: number;
}

interface Message {
  id: number;
  text: string;
  senderId: number;
  createdAt: string;
}

export function MessagesPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi.getConversations()
      .then(res => {
        setConversations(res.data || []);
        if (res.data?.length > 0 && !selectedId) setSelectedId(res.data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    chatApi.getMessages(selectedId)
      .then(res => {
        setMessages(res.data?.messages || res.data || []);
        chatApi.markRead(selectedId).catch(() => {});
        setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, unreadCount: 0 } : c));
      })
      .catch(() => setMessages([]));
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 10s
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => {
      chatApi.getMessages(selectedId)
        .then(res => setMessages(res.data?.messages || res.data || []))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const selected = conversations.find(c => c.id === selectedId);
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedId) return;
    try {
      const res = await chatApi.sendMessage(selectedId, newMessage.trim());
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      setConversations(prev => prev.map(c =>
        c.id === selectedId
          ? { ...c, lastMessage: { text: newMessage.trim(), createdAt: new Date().toISOString() } }
          : c
      ));
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Сообщения</h1>
          <p className="text-xs text-text-muted mt-0.5">{totalUnread > 0 ? `${totalUnread} непрочитанных` : 'Все прочитаны'}</p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-text-muted">
          <div className="text-4xl mb-3 opacity-30">💬</div>
          <p className="text-sm">Пока нет сообщений</p>
          <p className="text-xs mt-1">Когда гости напишут вам — сообщения появятся здесь</p>
        </div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[500px]">
          {/* Conversation list */}
          <div className="w-72 flex-shrink-0 bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {conversations.map(conv => (
                <button key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition ${
                    selectedId === conv.id ? 'bg-primary/10' : 'hover:bg-surface-3'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">
                      {getInitials(conv.otherUser.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold truncate ${selectedId === conv.id ? 'text-primary' : 'text-text-primary'}`}>
                          {conv.otherUser.name}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-text-muted flex-shrink-0 ml-2">
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-text-muted truncate">{conv.lastMessage?.text || ''}</p>
                        {conv.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0 ml-2">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
            {selected ? (
              <>
                <div className="px-5 py-3 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold text-text-secondary">
                    {getInitials(selected.otherUser.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{selected.otherUser.name}</p>
                    <p className="text-[10px] text-text-muted">Гость</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {messages.map(msg => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          isMe
                            ? 'bg-primary/15 text-text-primary rounded-br-md'
                            : 'bg-surface-3 text-text-primary rounded-bl-md'
                        }`}>
                          <p className="text-xs leading-relaxed">{msg.text}</p>
                          <p className={`text-[9px] mt-1 ${isMe ? 'text-primary/50' : 'text-text-muted'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="px-4 py-3 border-t border-border flex gap-2">
                  <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Напишите ответ..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-xs text-text-primary placeholder-text-muted focus:border-primary focus:outline-none"
                  />
                  <button onClick={handleSend}
                    className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition">
                    ↑
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-text-muted text-sm">Выберите диалог</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
