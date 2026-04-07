'use client';

import { useRouter, usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  UserIcon, 
  BellIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CogIcon,
  UsersIcon,
  DocumentTextIcon,
  WalletIcon,
  TruckIcon
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
  activeIcon?: React.ElementType;
  href: string;
  badge?: number;
  roles?: string[]; // RBAC - which roles can see this item
}

interface SidebarNavigationProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  className?: string;
  userRole?: string;
}

export function SidebarNavigation({ 
  isCollapsed = false, 
  onToggle,
  className = '',
  userRole = 'customer'
}: SidebarNavigationProps) {
  const { t, isRTL } = useLocalization();
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    // Common items for all roles
    {
      id: 'home',
      label: t('home'),
      icon: HomeIcon,
      activeIcon: HomeSolidIcon,
      href: '/',
      roles: ['customer', 'driver', 'merchant', 'admin'],
    },
    {
      id: 'orders',
      label: t('orders'),
      icon: ShoppingBagIcon,
      activeIcon: ShoppingBagSolidIcon,
      href: '/orders',
      badge: 3,
      roles: ['customer', 'driver', 'merchant', 'admin'],
    },
    {
      id: 'chat',
      label: t('contact'),
      icon: ChatBubbleLeftRightIcon,
      href: '/chat',
      roles: ['customer', 'driver', 'merchant', 'admin'],
    },
    {
      id: 'notifications',
      label: t('notifications'),
      icon: BellIcon,
      activeIcon: BellSolidIcon,
      href: '/notifications',
      badge: 5,
      roles: ['customer', 'driver', 'merchant', 'admin'],
    },
    {
      id: 'profile',
      label: t('profile'),
      icon: UserIcon,
      activeIcon: UserSolidIcon,
      href: '/profile',
      roles: ['customer', 'driver', 'merchant', 'admin'],
    },

    // Driver specific items
    {
      id: 'earnings',
      label: 'Earnings',
      icon: WalletIcon,
      href: '/driver/earnings',
      roles: ['driver'],
    },
    {
      id: 'quests',
      label: t('quest'),
      icon: ChartBarIcon,
      href: '/driver/quests',
      roles: ['driver'],
    },

    // Merchant specific items
    {
      id: 'kitchen',
      label: t('kitchen_queue'),
      icon: TruckIcon,
      href: '/merchant/kitchen',
      roles: ['merchant'],
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: DocumentTextIcon,
      href: '/merchant/menu',
      roles: ['merchant'],
    },

    // Admin specific items
    {
      id: 'users',
      label: 'Users',
      icon: UsersIcon,
      href: '/admin/users',
      roles: ['admin'],
    },
    {
      id: 'financial',
      label: t('financial_ledger'),
      icon: WalletIcon,
      href: '/admin/financial',
      roles: ['admin'],
    },
    {
      id: 'compliance',
      label: t('compliance'),
      icon: DocumentTextIcon,
      href: '/admin/compliance',
      roles: ['admin'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: CogIcon,
      href: '/admin/settings',
      roles: ['admin'],
    },
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64',
      className
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Saree Pro
              </h2>
            )}
            <button
              onClick={onToggle}
              title="Toggle Sidebar"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg
                className={cn(
                  'w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform',
                  isRTL ? 'rotate-180' : ''
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  'w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                  isCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="ml-3 font-medium truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {userRole.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {userRole}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Online
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
