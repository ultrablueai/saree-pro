'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInAction } from './actions';
import { Button } from '@/components/Button';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/workspace';
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'customer',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await signInAction(formData, mode);
        
        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.success) {
          router.push(redirect);
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'حدث خطأ غير متوقع');
      }
    });
  };

  const demoRoles = [
    { role: 'customer', label: 'عميل' },
    { role: 'merchant', label: 'تاجر' },
    { role: 'driver', label: 'سائق' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2d1f1a] mb-2">Saree Pro</h1>
          <p className="text-[#6b5c55]">
            {mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name - Sign Up Only */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  الاسم الكامل
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                  placeholder="أحمد محمد"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#4a3f37] mb-1">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#4a3f37] mb-1">
                كلمة المرور
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                placeholder="••••••••"
                dir="ltr"
                minLength={6}
              />
            </div>

            {/* Role Selection - Sign Up Only */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  نوع الحساب
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent"
                >
                  <option value="customer">عميل</option>
                  <option value="merchant">تاجر</option>
                  <option value="driver">سائق</option>
                </select>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              className="w-full"
            >
              {isPending
                ? 'جاري التحميل...'
                : mode === 'signin'
                ? 'تسجيل الدخول'
                : 'إنشاء الحساب'}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center text-sm">
            <span className="text-[#6b5c55]">
              {mode === 'signin'
                ? 'ليس لديك حساب؟'
                : 'لديك حساب بالفعل؟'}
            </span>
            {' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-[#d66b42] hover:text-[#b85a35] font-medium"
            >
              {mode === 'signin' ? 'إنشاء حساب' : 'تسجيل الدخول'}
            </button>
          </div>
        </div>

        {/* Demo Accounts */}
        <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <h3 className="text-sm font-medium text-[#4a3f37] mb-3">حسابات تجريبية</h3>
          <div className="space-y-2">
            {demoRoles.map(({ role, label }) => (
              <button
                key={role}
                onClick={() => {
                  startTransition(async () => {
                    const result = await signInAction(
                      { email: `${role}@sareepro.local`, password: 'demo123', fullName: '', role },
                      'signin'
                    );
                    if (result.success) {
                      router.push(redirect);
                      router.refresh();
                    }
                  });
                }}
                disabled={isPending}
                className="w-full px-3 py-2 text-sm bg-[#f4efe8] hover:bg-[#e8ddd0] text-[#4a3f37] rounded-lg transition-colors disabled:opacity-50"
              >
                {label} - {role}@sareepro.local
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
