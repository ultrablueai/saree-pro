'use client';

import { useState, useEffect } from 'react';
import { getSessionUser } from '@/lib/auth';
import { updateUserProfile, updateUserPassword, type UserProfile } from './profile-actions';
import { Button } from '@/components/Button';
import NotificationBell from '@/components/NotificationBell';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    avatarUrl: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const session = await getSessionUser();
      if (session) {
        setUser(session);
        setFormData({
          fullName: session.name || '',
          phone: '',
          avatarUrl: session.avatarUrl || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const result = await updateUserProfile(user.id, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage('تم تحديث الملف الشخصي بنجاح');
      setEditing(false);
      fetchUser();
    } catch (err: any) {
      setError(err.message || 'فشل تحديث الملف الشخصي');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      const result = await updateUserPassword(user.id, passwordData.currentPassword, passwordData.newPassword);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage('تم تغيير كلمة المرور بنجاح');
      setChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'فشل تغيير كلمة المرور');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d66b42] mx-auto mb-4"></div>
          <p className="text-[#6b5c55]">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">يجب تسجيل الدخول أولاً</p>
          <a href="/login" className="text-[#d66b42] hover:text-[#b85a35] font-medium">
            تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#2d1f1a] mb-2">الملف الشخصي</h1>
              <p className="text-[#6b5c55]">إدارة معلوماتك الشخصية</p>
            </div>
            <NotificationBell userId={user.id} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Messages */}
        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#2d1f1a]">المعلومات الشخصية</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-[#d66b42] hover:text-[#b85a35] font-medium"
                >
                  تعديل
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4a3f37] mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  الاسم الكامل
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={!editing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] disabled:bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-[#4a3f37] mb-1">
                  رقم الهاتف
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] disabled:bg-gray-50"
                  dir="ltr"
                />
              </div>

              {editing && (
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" className="flex-1">
                    حفظ التغييرات
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        fullName: user.name || '',
                        phone: '',
                        avatarUrl: '',
                      });
                    }}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#2d1f1a]">كلمة المرور</h2>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="text-sm text-[#d66b42] hover:text-[#b85a35] font-medium"
                >
                  تغيير
                </button>
              )}
            </div>

            {changingPassword ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-[#4a3f37] mb-1">
                    كلمة المرور الحالية
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42]"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-[#4a3f37] mb-1">
                    كلمة المرور الجديدة
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42]"
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
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42]"
                    placeholder="••••••••"
                    dir="ltr"
                    minLength={6}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" variant="primary" className="flex-1">
                    تغيير كلمة المرور
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setChangingPassword(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 text-[#6b5c55]">
                <p>قم بتغيير كلمة المرور للحفاظ على أمان حسابك</p>
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-[#2d1f1a] mb-4">معلومات الحساب</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[#f4efe8] rounded-lg">
              <p className="text-sm text-[#6b5c55]">نوع الحساب</p>
              <p className="font-bold text-[#2d1f1a] capitalize">{user.role}</p>
            </div>
            <div className="text-center p-4 bg-[#f4efe8] rounded-lg">
              <p className="text-sm text-[#6b5c55]">الحالة</p>
              <p className="font-bold text-green-600">نشط</p>
            </div>
            <div className="text-center p-4 bg-[#f4efe8] rounded-lg">
              <p className="text-sm text-[#6b5c55]">البريد موثق</p>
              <p className={`font-bold ${user.emailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                {user.emailVerified ? 'نعم' : 'لا'}
              </p>
            </div>
            <div className="text-center p-4 bg-[#f4efe8] rounded-lg">
              <p className="text-sm text-[#6b5c55]">تاريخ الانضمام</p>
              <p className="font-bold text-[#2d1f1a]">
                {new Date(user.createdAt).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
