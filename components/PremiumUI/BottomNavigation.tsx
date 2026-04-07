'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  UserIcon, 
  BellIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeSolidIcon,
  ShoppingBagIcon as ShoppingBagSolidIcon,
  UserIcon as UserSolidIcon,
  BellIcon as BellSolidIcon
} from '@heroicons/react/24/solid';
import { useLocalization } from '../../hooks/useLocalization';
import { cn } from '../../lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  activeIcon: React.ElementType;
  href: string;
  badge?: number;
}

interface BottomNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
}

export function BottomNavigation({ 
  activeTab = 'home', 
  onTabChange,
  className = ''
}: BottomNavigationProps) {
  const { t } = useLocalization();
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(activeTab);

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: t('home'),
      icon: HomeIcon,
      activeIcon: HomeSolidIcon,
      href: '/',
    },
    {
      id: 'orders',
      label: t('orders'),
      icon: ShoppingBagIcon,
      activeIcon: ShoppingBagSolidIcon,
      href: '/orders',
      badge: 3, // Example badge count
    },
    {
      id: 'chat',
      label: t('contact'),
      icon: ChatBubbleLeftRightIcon,
      activeIcon: ChatBubbleLeftRightIcon,
      href: '/chat',
    },
    {
      id: 'notifications',
      label: t('notifications'),
      icon: BellIcon,
      activeIcon: BellSolidIcon,
      href: '/notifications',
      badge: 5, // Example badge count
    },
    {
      id: 'profile',
      label: t('profile'),
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      href: '/profile',
    },
  ];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    onTabChange?.(tabId);
    
    // Navigate to corresponding page
    const item = navItems.find(item => item.id === tabId);
    if (item) {
      router.push(item.href);
    }
  };

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 z-50',
      className
    )}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = isActive ? item.activeIcon : item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 min-w-0 flex-1',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Hook for managing bottom navigation state
export function useBottomNavigation() {
  const [activeTab, setActiveTab] = useState('home');
  
  return {
    activeTab,
    setActiveTab,
  };
}
