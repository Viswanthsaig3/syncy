'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { socketManager } from '@/lib/socket';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ChatProps {
  className?: string;
}

export const Chat: React.FC<ChatProps> = ({ className }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    addChatMessage,
    currentRoom,
    currentUser,
    roomUsers,
  } = useAppStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen]);

  // Set up socket event listeners
  useEffect(() => {
    if (!currentRoom) return;

    const handleChatMessage = (data: any) => {
      addChatMessage(data);
    };

    socketManager.on('chat-message-received', handleChatMessage);

    return () => {
      socketManager.off('chat-message-received', handleChatMessage);
    };
  }, [currentRoom, addChatMessage]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !currentRoom) return;

    try {
      socketManager.sendChatMessage(currentRoom, message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOwnMessage = (userId: string) => {
    return currentUser?.id === userId;
  };

  if (!currentRoom) return null;

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={cn(
          'fixed bottom-4 right-4 p-3 bg-primary-600 text-white rounded-full shadow-lg',
          'hover:bg-primary-700 transition-colors z-40',
          className
        )}
      >
        <MessageCircle className="w-6 h-6" />
        {chatMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {chatMessages.length}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isChatOpen && (
        <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-xl border z-50 flex flex-col max-h-96">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-900">Chat</h3>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                {roomUsers.length}
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col max-w-[85%]',
                    isOwnMessage(msg.userId) ? 'ml-auto' : 'mr-auto'
                  )}
                >
                  <div
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm',
                      isOwnMessage(msg.userId)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    )}
                  >
                    {!isOwnMessage(msg.userId) && (
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        {msg.userName}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                  </div>
                  <div
                    className={cn(
                      'text-xs text-gray-500 mt-1',
                      isOwnMessage(msg.userId) ? 'text-right' : 'text-left'
                    )}
                  >
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  message.trim()
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-xs text-gray-500 mt-1">
              Press Enter to send • {message.length}/500
            </div>
          </div>
        </div>
      )}
    </>
  );
};
