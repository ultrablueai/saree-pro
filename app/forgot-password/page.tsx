'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/Button';

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
        // هنا يمكن إرسال كود التحقق عبر البريد
        // مؤقتاً سننتقل للخطوة التالية مباشرة
        setStep('code');
        setMessage('تم إرسال كود التحقق إلى بريدك الإلكتروني');
      } catch (err: any) {
        setError(err.message || 'فشل إرسال كود التحقق');
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    startTransition(async () => {
      try {
        // هنا يمكن تحديث كلمة المرور
        setStep('password');
        setMessage('تم تغيير كلمة المرور بنجاح');
      } catch (err: any) {
        setError(err.message || 'فشل تغيير كلمة المرور');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2d1f1a] mb-2">Saree Pro</h1>
          <p className="text-[#6b5c55]">استعادة كلمة المرور</p>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  البريد الإلكتروني
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

              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
                className="w-full"
              >
                {isPending ? 'جاري الإرسال...' : 'إرسال كود التحقق'}
              </Button>
            </form>
          )}

          {/* Step 2: Verification Code */}
          {step === 'code' && (
            <form onSubmit={() => setStep('password')} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  كود التحقق
                </label>
                <input
                  id="code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                  placeholder="أدخل كود التحقق"
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

              <Button
                type="submit"
                variant="primary"
                className="w-full"
              >
                التحقق
              </Button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && step !== 'code' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                  placeholder="••••••••"
                  dir="ltr"
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  تأكيد كلمة المرور
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                  placeholder="••••••••"
                  dir="ltr"
                  minLength={6}
                />
              </div>

              {message && step === 'password' && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                  {message}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
                className="w-full"
              >
                {isPending ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </Button>
            </form>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center text-sm">
            <a href="/login" className="text-[#d66b42] hover:text-[#b85a35] font-medium">
              العودة لتسجيل الدخول
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
