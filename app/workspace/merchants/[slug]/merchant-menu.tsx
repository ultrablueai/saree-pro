'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, MinusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { addToCart, getCartByUserId, type CartItem } from '@/lib/cart';
import { getSessionUser } from '@/lib/auth';
import type { Merchant } from '@/lib/merchant-search';

interface Props {
  merchantId: string;
  merchant: Merchant;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceAmount: number;
  isAvailable: boolean;
  categoryName: string | null;
}

export function MerchantMenu({ merchantId, merchant }: Props) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [merchantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get user session
      const session = await getSessionUser();
      if (session) {
        setUserId(session.id);
        const cart = await getCartByUserId(session.id);
        setCartItems(cart);
      }

      // Get menu items
      const response = await fetch(`/api/merchants/${merchantId}/menu`);
      const data = await response.json();
      setMenuItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (item: MenuItem) => {
    if (!userId) return;

    setAddingToCart(item.id);
    try {
      await addToCart(userId, merchantId, item.id, 1);
      
      // Refresh cart
      const cart = await getCartByUserId(userId);
      setCartItems(cart);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  const getCartItemQuantity = (menuItemId: string) => {
    const cartItem = cartItems.find(item => item.menuItemId === menuItemId);
    return cartItem?.quantity || 0;
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.menuItemPrice), 0);

  // Group by category
  const groupedMenuItems = menuItems.reduce((acc, item) => {
    const category = item.categoryName || 'أخرى';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Menu Items */}
      <div className="lg:col-span-2 space-y-6">
        {Object.keys(groupedMenuItems).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">لا توجد عناصر في القائمة حالياً</p>
          </div>
        ) : (
          Object.entries(groupedMenuItems).map(([category, items]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-[#2d1f1a] mb-4">{category}</h2>
              <div className="space-y-4">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                  >
                    {/* Image */}
                    <div className="w-24 h-24 flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#d66b42] to-[#b85a35] rounded-lg flex items-center justify-center">
                          <span className="text-white text-3xl">🍽️</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-[#2d1f1a]">{item.name}</h3>
                        <p className="text-lg font-bold text-[#d66b42]">
                          {(item.priceAmount / 100).toFixed(2)} ريال
                        </p>
                      </div>
                      <p className="text-sm text-[#6b5c55] mb-3 line-clamp-2">{item.description}</p>

                      <div className="flex items-center justify-between">
                        {item.isAvailable ? (
                          getCartItemQuantity(item.id) > 0 ? (
                            <div className="flex items-center gap-2">
                              <button className="p-1 rounded-full bg-gray-100 hover:bg-gray-200">
                                <MinusIcon className="w-4 h-4" />
                              </button>
                              <span className="text-sm font-medium w-8 text-center">
                                {getCartItemQuantity(item.id)}
                              </span>
                              <button className="p-1 rounded-full bg-gray-100 hover:bg-gray-200">
                                <PlusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(item)}
                              disabled={addingToCart === item.id}
                              className="flex items-center gap-2 px-4 py-2 bg-[#d66b42] hover:bg-[#b85a35] text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              <PlusIcon className="w-4 h-4" />
                              <span>إضافة</span>
                            </button>
                          )
                        ) : (
                          <span className="text-sm text-red-500">غير متوفر</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCartIcon className="w-6 h-6 text-[#6b5c55]" />
            <h3 className="text-xl font-bold text-[#2d1f1a]">السلة</h3>
            {totalItems > 0 && (
              <span className="ml-auto bg-[#d66b42] text-white px-2 py-1 rounded-full text-xs">
                {totalItems}
              </span>
            )}
          </div>

          {cartItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">السلة فارغة</p>
          ) : (
            <>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-[#2d1f1a]">{item.menuItemName}</p>
                      <p className="text-[#6b5c55]">x{item.quantity}</p>
                    </div>
                    <p className="font-semibold text-[#d66b42]">
                      {((item.quantity * item.menuItemPrice) / 100).toFixed(2)} ريال
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b5c55]">المجموع الفرعي:</span>
                  <span className="font-medium text-[#2d1f1a]">{(subtotal / 100).toFixed(2)} ريال</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b5c55]">رسوم التوصيل:</span>
                  <span className="font-medium text-[#2d1f1a]">{(merchant.deliveryFeeAmount / 100).toFixed(2)} ريال</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                  <span className="text-[#2d1f1a]">الإجمالي:</span>
                  <span className="text-[#d66b42]">{((subtotal + merchant.deliveryFeeAmount) / 100).toFixed(2)} ريال</span>
                </div>
              </div>

              <button className="w-full mt-4 bg-[#d66b42] hover:bg-[#b85a35] text-white py-3 rounded-lg font-medium transition-colors">
                إتمام الطلب
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
