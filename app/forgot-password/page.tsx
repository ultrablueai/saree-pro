'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button } from '@/components/Button';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        setStep('code');
        setMessage('ØªÙ… Ø¥Ø±Ø³Ø§Ù„ ÙƒÙˆØ¯ Ø§Ù„ØªØ­Ù‚Ù‚ Ø¥Ù„Ù‰ Ø¨Ø±ÙŠØ¯Ùƒ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ');
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'ÙØ´Ù„ Ø¥Ø±Ø³Ø§Ù„ ÙƒÙˆØ¯ Ø§Ù„ØªØ­Ù‚Ù‚'));
      }
    });
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('Ø£Ø¯Ø®Ù„ ÙƒÙˆØ¯ Ø§Ù„ØªØ­Ù‚Ù‚ Ø£ÙˆÙ„Ù‹Ø§');
      return;
    }

    setStep('password');
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('ÙƒÙ„Ù…ØªØ§ Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚ØªÙŠÙ†');
      return;
    }

    if (newPassword.length < 6) {
      setError('ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† 6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„');
      return;
    }

    startTransition(async () => {
      try {
        setMessage('ØªÙ… ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø¨Ù†Ø¬Ø§Ø­');
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'ÙØ´Ù„ ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±'));
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2d1f1a] mb-2">Saree Pro</h1>
          <p className="text-[#6b5c55]">Ø§Ø³ØªØ¹Ø§Ø¯Ø© ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={isPending} className="w-full">
                {isPending ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„...' : 'Ø¥Ø±Ø³Ø§Ù„ ÙƒÙˆØ¯ Ø§Ù„ØªØ­Ù‚Ù‚'}
              </Button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  ÙƒÙˆØ¯ Ø§Ù„ØªØ­Ù‚Ù‚
                </label>
                <input
                  id="code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                  placeholder="Ø£Ø¯Ø®Ù„ ÙƒÙˆØ¯ Ø§Ù„ØªØ­Ù‚Ù‚"
                  dir="ltr"
                  maxLength={6}
                />
              </div>

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                  {message}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full">
                Ø§Ù„ØªØ­Ù‚Ù‚
              </Button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  dir="ltr"
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  ØªØ£ÙƒÙŠØ¯ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  dir="ltr"
                  minLength={6}
                />
              </div>

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                  {message}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={isPending} className="w-full">
                {isPending ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØºÙŠÙŠØ±...' : 'ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-[#d66b42] hover:text-[#b85a35] font-medium">
              Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
