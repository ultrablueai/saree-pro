'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShoppingCartIcon, TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { getCartByUserId, updateCartItemQuantity, removeFromCart, type CartItem } from '@/lib/cart';

export default function CartIcon({ userId }: { userId: string }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadCart() {
      try {
        const items = await getCartByUserId(userId);
        if (isActive) {
          setCartItems(items);
        }
      } catch (error) {
        console.error('ÙØ´Ù„ Ø¬Ù„Ø¨ Ø§Ù„Ø³Ù„Ø©:', error);
      }
    }

    void loadCart();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const handleUpdateQuantity = async (menuItemId: string, newQuantity: number) => {
    try {
      await updateCartItemQuantity(userId, menuItemId, newQuantity);
      if (newQuantity <= 0) {
        setCartItems(prev => prev.filter(item => item.menuItemId !== menuItemId));
      } else {
        setCartItems(prev =>
          prev.map(item =>
            item.menuItemId === menuItemId ? { ...item, quantity: newQuantity } : item
          )
        );
      }
    } catch (error) {
      console.error('ÙØ´Ù„ ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙƒÙ…ÙŠØ©:', error);
    }
  };

  const handleRemoveItem = async (menuItemId: string) => {
    try {
      await removeFromCart(userId, menuItemId);
      setCartItems(prev => prev.filter(item => item.menuItemId !== menuItemId));
    } catch (error) {
      console.error('ÙØ´Ù„ Ø­Ø°Ù Ø§Ù„Ø¹Ù†ØµØ±:', error);
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.menuItemPrice, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ShoppingCartIcon className="w-6 h-6" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Ø³Ù„Ø© Ø§Ù„ØªØ³ÙˆÙ‚</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Ø§Ù„Ø³Ù„Ø© ÙØ§Ø±ØºØ©</div>
            ) : (
              <>
                {cartItems.map(item => (
                  <div key={item.id} className="p-3 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                      {item.menuItemImageUrl && (
                        <Image
                          src={item.menuItemImageUrl}
                          alt={item.menuItemName}
                          width={64}
                          height={64}
                          unoptimized
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{item.menuItemName}</h4>
                        <p className="text-xs text-gray-500">{item.merchantName}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {(item.menuItemPrice / 100).toFixed(2)} Ø±ÙŠØ§Ù„
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.menuItemId, item.quantity - 1)}
                              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              <MinusIcon className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.menuItemId, item.quantity + 1)}
                              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.menuItemId)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-600">Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙØ±Ø¹ÙŠ:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {(subtotal / 100).toFixed(2)} Ø±ÙŠØ§Ù„
                    </span>
                  </div>
                  <button className="w-full bg-[#d66b42] hover:bg-[#b85a35] text-white py-2 rounded-lg font-medium transition-colors">
                    Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø·Ù„Ø¨
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
