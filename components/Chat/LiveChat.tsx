'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  FaceSmileIcon,
  PhotoIcon,
  MapPinIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { useLocalization } from '../../hooks/useLocalization';
import { chatService, ChatMessage, ChatRoom, TypingIndicator } from '../../lib/chat';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { PremiumButton } from '../PremiumUI/PremiumButton';
import { cn } from '../../lib/utils';

interface LiveChatProps {
  roomId: string;
  className?: string;
  onMessageSend?: (message: ChatMessage) => void;
}

export function LiveChat({ roomId, className = '', onMessageSend }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const { t, isRTL } = useLocalization();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadMessages();
    setupTypingListener();
    
    return () => {
      cleanupTypingListener();
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const roomMessages = await chatService.getRoomMessages(roomId);
      setMessages(roomMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupTypingListener = () => {
    const indicators = chatService.getTypingIndicators(roomId);
    setTypingIndicators(indicators);
  };

  const cleanupTypingListener = () => {
    // Cleanup listener if needed
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    try {
      let message: ChatMessage;

      if (selectedFile) {
        const type = selectedFile.type.startsWith('image/') ? 'image' : 'file';
        message = await chatService.sendFile(roomId, selectedFile, type);
        setSelectedFile(null);
      } else {
        message = await chatService.sendMessage(roomId, newMessage.trim());
      }

      setMessages(prev => [...prev, message]);
      setNewMessage('');
      setIsTyping(false);
      chatService.sendTypingIndicator(roomId, 'paused');
      
      onMessageSend?.(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      chatService.sendTypingIndicator(roomId, 'typing');
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chatService.sendTypingIndicator(roomId, 'paused');
    }, 1000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleLocationShare = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location',
          };
          
          const message = await chatService.sendLocation(roomId, location);
          setMessages(prev => [...prev, message]);
        },
        (error) => {
          console.error('Failed to get location:', error);
        }
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageBubbleClass = (message: ChatMessage) => {
    const isOwn = message.senderId === 'current-user'; // Replace with actual user ID
    return cn(
      'max-w-xs lg:max-w-md px-4 py-2 rounded-2xl',
      isOwn 
        ? 'bg-blue-600 text-white ml-auto' 
        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
    );
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.senderId === 'current-user'; // Replace with actual user ID
    
    return (
      <div
        key={message.id}
        className={cn(
          'flex items-end space-x-2 mb-4',
          isOwn ? 'flex-row-reverse space-x-reverse' : ''
        )}
      >
        {!isOwn && (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
            {message.senderName.charAt(0).toUpperCase()}
          </div>
        )}
        
        <div className="flex flex-col">
          {!isOwn && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {message.senderName}
            </span>
          )}
          
          <div className={getMessageBubbleClass(message)}>
            {message.type === 'text' && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            
            {message.type === 'image' && (
              <img
                src={message.metadata?.fileName}
                alt="Shared image"
                className="rounded-lg max-w-full h-auto"
              />
            )}
            
            {message.type === 'file' && (
              <div className="flex items-center space-x-2">
                <PaperClipIcon className="w-4 h-4" />
                <span className="text-sm">{message.metadata?.fileName}</span>
              </div>
            )}
            
            {message.type === 'location' && (
              <div className="flex items-center space-x-2">
                <MapPinIcon className="w-4 h-4" />
                <span className="text-sm">{message.metadata?.location?.address}</span>
              </div>
            )}
            
            {message.type === 'order_update' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Order Update: {message.metadata?.orderStatus}
                </p>
              </div>
            )}
            
            <div className={cn(
              'flex items-center justify-between mt-1 text-xs',
              isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
            )}>
              <span>{formatMessageTime(message.timestamp)}</span>
              <span className="flex items-center space-x-1">
                {message.status === 'sending' && '⏳'}
                {message.status === 'sent' && '✓'}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'read' && '✓✓'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-96', className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(renderMessage)}
        
        {/* Typing Indicators */}
        {typingIndicators.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
              {typingIndicators[0].userName.charAt(0).toUpperCase()}
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <GlassPanel className="mx-4 p-3 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {selectedFile.type.startsWith('image/') ? (
                <PhotoIcon className="w-5 h-5 text-blue-600" />
              ) : (
                <PaperClipIcon className="w-5 h-5 text-blue-600" />
              )}
              <span className="text-sm font-medium truncate max-w-xs">
                {selectedFile.name}
              </span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className="text-gray-400">×</span>
            </button>
          </div>
        </GlassPanel>
      )}

      {/* Input Area */}
      <GlassPanel className="p-4 m-4">
        <div className="flex items-end space-x-2">
          {/* Actions Button */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
            </button>
            
            {showActions && (
              <div className={cn(
                'absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1',
                isRTL ? 'right-0 left-auto' : ''
              )}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 w-full px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <PaperClipIcon className="w-4 h-4" />
                  <span className="text-sm">File</span>
                </button>
                
                <button
                  onClick={handleLocationShare}
                  className="flex items-center space-x-2 w-full px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <MapPinIcon className="w-4 h-4" />
                  <span className="text-sm">Location</span>
                </button>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('contact') || 'Type a message...'}
              className="w-full px-4 py-3 bg-transparent outline-none resize-none text-gray-900 dark:text-white placeholder-gray-400"
              rows={1}
              style={{
                minHeight: '48px',
                maxHeight: '120px',
              }}
            />
          </div>

          {/* Send Button */}
          <PremiumButton
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && !selectedFile}
            size="sm"
            icon={<PaperAirplaneIcon className="w-4 h-4" />}
            iconPosition="right"
          >
            {t('send') || 'Send'}
          </PremiumButton>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx"
        />
      </GlassPanel>
    </div>
  );
}
