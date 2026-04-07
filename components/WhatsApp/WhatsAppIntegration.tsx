'use client';

import { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  PhoneIcon, 
  VideoCameraIcon,
  MicrophoneIcon,
  PaperClipIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { useLocalization } from '../../hooks/useLocalization';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { PremiumButton } from '../PremiumUI/PremiumButton';
import { cn } from '../../lib/utils';

interface WhatsAppMessage {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'location';
  timestamp: Date;
  isFromCustomer: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  metadata?: {
    fileName?: string;
    location?: {
      lat: number;
      lng: number;
      address: string;
    };
  };
}

interface WhatsAppIntegrationProps {
  phoneNumber?: string;
  businessNumber?: string;
  className?: string;
  onOrderPlaced?: (orderData: any) => void;
}

export function WhatsAppIntegration({
  phoneNumber = '+966500000000',
  businessNumber = '+966511111111',
  className = '',
  onOrderPlaced,
}: WhatsAppIntegrationProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderData, setOrderData] = useState({
    items: [] as string[],
    address: '',
    notes: '',
  });
  
  const { t, isRTL } = useLocalization();

  useEffect(() => {
    // Simulate WhatsApp connection
    setTimeout(() => {
      setIsConnected(true);
      setMessages([
        {
          id: '1',
          content: 'Welcome to Saree Pro! 🍔 How can we help you today?',
          type: 'text',
          timestamp: new Date(),
          isFromCustomer: false,
          status: 'delivered',
        }
      ]);
    }, 1000);
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message: WhatsAppMessage = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      type: 'text',
      timestamp: new Date(),
      isFromCustomer: true,
      status: 'sending',
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate sending to WhatsApp
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'sent' as const }
            : msg
        )
      );
    }, 1000);

    // Simulate response
    setTimeout(() => {
      const response = generateAIResponse(message.content);
      setMessages(prev => [...prev, response]);
    }, 2000);
  };

  const generateAIResponse = (userMessage: string): WhatsAppMessage => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Order-related keywords
    if (lowerMessage.includes('order') || lowerMessage.includes('طلب')) {
      setShowOrderForm(true);
      return {
        id: Date.now().toString(),
        content: 'I\'d be happy to help you place an order! 📝 What would you like to order today?',
        type: 'text',
        timestamp: new Date(),
        isFromCustomer: false,
        status: 'delivered',
      };
    }
    
    // Menu-related keywords
    if (lowerMessage.includes('menu') || lowerMessage.includes('قائمة')) {
      return {
        id: Date.now().toString(),
        content: '📋 Here\'s our menu:\n\n🍔 Burgers - 25 SAR\n🍕 Pizza - 35 SAR\n🥗 Shawarma - 20 SAR\n🥗 Falafel - 15 SAR\n\nWhat would you like?',
        type: 'text',
        timestamp: new Date(),
        isFromCustomer: false,
        status: 'delivered',
      };
    }
    
    // Location-related keywords
    if (lowerMessage.includes('location') || lowerMessage.includes('موقع')) {
      return {
        id: Date.now().toString(),
        content: '📍 We deliver to all areas in Riyadh! Delivery time is 30-45 minutes. What\'s your address?',
        type: 'text',
        timestamp: new Date(),
        isFromCustomer: false,
        status: 'delivered',
      };
    }
    
    // Default response
    const responses = [
      'Thank you for your message! Our team will get back to you shortly. 👍',
      'I\'m here to help! You can place orders, check our menu, or ask about delivery. 🍴',
      'Great choice! Would you like to add any drinks or sides to your order? 🥤',
    ];
    
    return {
      id: Date.now().toString(),
      content: responses[Math.floor(Math.random() * responses.length)],
      type: 'text',
      timestamp: new Date(),
      isFromCustomer: false,
      status: 'delivered',
    };
  };

  const handleOrderSubmit = () => {
    if (orderData.items.length === 0 || !orderData.address) return;

    const fullOrder = {
      id: Date.now().toString(),
      items: orderData.items,
      address: orderData.address,
      notes: orderData.notes,
      timestamp: new Date(),
      total: calculateOrderTotal(),
    };

    onOrderPlaced?.(fullOrder);
    
    const confirmationMessage: WhatsAppMessage = {
      id: Date.now().toString(),
      content: `✅ Order placed successfully!\n\n📦 Items: ${orderData.items.join(', ')}\n📍 Address: ${orderData.address}\n💰 Total: ${calculateOrderTotal()} SAR\n\nEstimated delivery: 30-45 minutes`,
      type: 'text',
      timestamp: new Date(),
      isFromCustomer: false,
      status: 'delivered',
    };

    setMessages(prev => [...prev, confirmationMessage]);
    setShowOrderForm(false);
    setOrderData({ items: [], address: '', notes: '' });
  };

  const calculateOrderTotal = (): number => {
    const prices: Record<string, number> = {
      'burger': 25,
      'pizza': 35,
      'shawarma': 20,
      'falafel': 15,
      'drink': 10,
    };

    return orderData.items.reduce((total, item) => {
      return total + (prices[item.toLowerCase()] || 20);
    }, 0);
  };

  const addToOrder = (item: string) => {
    setOrderData(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('Hello! I\'d like to place an order.');
    window.open(`https://wa.me/${phoneNumber.replace(/[^\d]/g, '')}?text=${message}`, '_blank');
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={cn('flex flex-col h-full max-w-md mx-auto', className)}>
      {/* Header */}
      <GlassPanel className="p-4 bg-green-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">🍴</span>
            </div>
            <div>
              <h3 className="font-semibold">Saree Pro</h3>
              <p className="text-xs opacity-90">
                {isConnected ? 'Online' : 'Connecting...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.open(`tel:${businessNumber}`)}
              className="p-2 rounded-full hover:bg-green-700 transition-colors"
              title="Call"
            >
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-full hover:bg-green-700 transition-colors"
              title="Video Call"
            >
              <VideoCameraIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex mb-4',
              message.isFromCustomer ? 'justify-end' : 'justify-start'
            )}
          >
            <div className={cn(
              'max-w-xs lg:max-w-md px-4 py-2 rounded-2xl',
              message.isFromCustomer
                ? 'bg-green-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
            )}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              <div className={cn(
                'flex items-center justify-between mt-1 text-xs',
                message.isFromCustomer ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'
              )}>
                <span>{formatTime(message.timestamp)}</span>
                <span className="flex items-center space-x-1">
                  {message.status === 'sending' && '⏳'}
                  {message.status === 'sent' && '✓'}
                  {message.status === 'delivered' && '✓✓'}
                  {message.status === 'read' && '✓✓'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Order Form */}
        {showOrderForm && (
          <GlassPanel className="p-4 mb-4">
            <h4 className="font-semibold mb-3">Place Your Order</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Items</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Burger', 'Pizza', 'Shawarma', 'Falafel', 'Drink'].map(item => (
                    <button
                      key={item}
                      onClick={() => addToOrder(item)}
                      className={cn(
                        'p-2 rounded-lg border text-sm transition-colors',
                        orderData.items.includes(item)
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={orderData.address}
                  onChange={(e) => setOrderData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your delivery address"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  value={orderData.notes}
                  onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special instructions..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold">
                  Total: {calculateOrderTotal()} SAR
                </span>
                <div className="space-x-2">
                  <PremiumButton
                    size="sm"
                    onClick={() => setShowOrderForm(false)}
                    variant="outline"
                  >
                    Cancel
                  </PremiumButton>
                  <PremiumButton
                    size="sm"
                    onClick={handleOrderSubmit}
                    disabled={orderData.items.length === 0 || !orderData.address}
                  >
                    Place Order
                  </PremiumButton>
                </div>
              </div>
            </div>
          </GlassPanel>
        )}
      </div>

      {/* Input Area */}
      <GlassPanel className="p-4">
        <div className="flex items-center space-x-2">
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Attach File"
          >
            <PaperClipIcon className="w-5 h-5 text-gray-500" />
          </button>
          
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Emoji"
          >
            <FaceSmileIcon className="w-5 h-5 text-gray-500" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />

          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Voice Message"
          >
            <MicrophoneIcon className="w-5 h-5 text-gray-500" />
          </button>

          <PremiumButton
            size="sm"
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            icon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
            iconPosition="right"
          >
            Send
          </PremiumButton>
        </div>
      </GlassPanel>

      {/* Quick Actions */}
      <GlassPanel className="p-3 m-4">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setNewMessage('I want to place an order')}
            className="p-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            📦 Order
          </button>
          <button
            onClick={() => setNewMessage('Show me the menu')}
            className="p-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            📋 Menu
          </button>
          <button
            onClick={() => setNewMessage('What are your delivery areas?')}
            className="p-2 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            📍 Delivery
          </button>
          <button
            onClick={openWhatsApp}
            className="p-2 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
          >
            📱 WhatsApp
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
