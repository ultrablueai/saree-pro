'use client';

import { useMemo, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { useLocalization } from '../../hooks/useLocalization';
import { GlassPanel } from '../PremiumUI/GlassPanel';
import { PremiumButton } from '../PremiumUI/PremiumButton';
import { cn } from '../../lib/utils';

interface WhatsAppIntegrationProps {
  phoneNumber?: string;
  businessNumber?: string;
  businessName?: string;
  className?: string;
  defaultIntent?: 'support' | 'order' | 'delivery' | 'merchant';
  supportMessage?: string;
  orderMessage?: string;
}

const QUICK_ACTIONS = [
  {
    id: 'support',
    label: 'General support',
    template: 'Hello Saree Pro support, I need help with my account or an order.',
  },
  {
    id: 'order',
    label: 'Order help',
    template: 'Hello, I need help with my current order. Please assist me.',
  },
  {
    id: 'delivery',
    label: 'Delivery update',
    template: 'Hello, I need a delivery status update for my order.',
  },
  {
    id: 'merchant',
    label: 'Merchant question',
    template: 'Hello, I have a question for a merchant on Saree Pro.',
  },
] as const;

export function WhatsAppIntegration({
  phoneNumber = '+966500000000',
  businessNumber = '+966511111111',
  businessName = 'Saree Pro Support',
  className = '',
  defaultIntent = 'support',
  supportMessage,
  orderMessage,
}: WhatsAppIntegrationProps) {
  const [selectedIntent, setSelectedIntent] = useState(defaultIntent);
  const [customMessage, setCustomMessage] = useState('');
  const { t } = useLocalization();

  const activeTemplate = useMemo(
    () =>
      (
        QUICK_ACTIONS.map((item) => {
          if (item.id === 'support' && supportMessage) {
            return { ...item, template: supportMessage };
          }

          if (item.id === 'order' && orderMessage) {
            return { ...item, template: orderMessage };
          }

          return item;
        }).find((item) => item.id === selectedIntent) ?? QUICK_ACTIONS[0]
      ),
    [orderMessage, selectedIntent, supportMessage],
  );

  const composedMessage = customMessage.trim() || activeTemplate.template;
  const sanitizedPhone = phoneNumber.replace(/[^\d]/g, '');

  function openWhatsApp() {
    const text = encodeURIComponent(composedMessage);
    window.open(`https://wa.me/${sanitizedPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(composedMessage);
    } catch {
      // Ignore clipboard failures and keep the launcher path usable.
    }
  }

  return (
    <div className={cn('mx-auto flex h-full max-w-3xl flex-col gap-5', className)}>
      <GlassPanel className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-ink)]">{businessName}</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {t('whatsapp_support')}
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
              This support entry is now a real WhatsApp launcher. It opens a direct conversation
              with a prepared message instead of simulating a fake in-app chat.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-3 text-sm text-[var(--color-muted)]">
            <p className="text-xs uppercase tracking-[0.18em]">Direct line</p>
            <p className="mt-2 font-semibold text-[var(--color-ink)]">{businessNumber}</p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Quick actions
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => {
            const resolvedTemplate =
              action.id === 'support' && supportMessage
                ? supportMessage
                : action.id === 'order' && orderMessage
                  ? orderMessage
                  : action.template;
            const isActive = action.id === selectedIntent;

            return (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  setSelectedIntent(action.id);
                  setCustomMessage('');
                }}
                className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                  isActive
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-[var(--color-border)] bg-white/80 hover:-translate-y-0.5'
                }`}
              >
                <p className="font-semibold text-[var(--color-ink)]">{action.label}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  {resolvedTemplate}
                </p>
              </button>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <div className="grid gap-6 lg:grid-cols-[0.56fr_0.44fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Message preview
            </p>
            <textarea
              value={customMessage}
              onChange={(event) => setCustomMessage(event.target.value)}
              rows={7}
              placeholder={activeTemplate.template}
              className="mt-4 w-full rounded-[1.35rem] border border-[var(--color-border)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
            />
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              Leave this empty to use the prepared WhatsApp template automatically.
            </p>
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)]/75 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Selected flow
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                {activeTemplate.label}
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/85 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Final message
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-ink)]">{composedMessage}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PremiumButton
                type="button"
                onClick={openWhatsApp}
                icon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />}
              >
                Open WhatsApp
              </PremiumButton>
              <PremiumButton
                type="button"
                variant="outline"
                onClick={() => void copyMessage()}
                icon={<ClipboardDocumentCheckIcon className="h-4 w-4" />}
              >
                Copy text
              </PremiumButton>
            </div>

            <a
              href={`tel:${businessNumber}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent-strong)] transition hover:opacity-80"
            >
              <PhoneIcon className="h-4 w-4" />
              Call support instead
            </a>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

export default WhatsAppIntegration;
