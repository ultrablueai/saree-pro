'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MerchantMenu } from './merchant-menu';
import { getMerchantById, type Merchant } from '@/lib/merchant-search';
import { getDbExecutor } from '@/lib/db';
import { Button } from '@/components/Button';

export default function MerchantDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMerchant();
  }, [slug]);

  const fetchMerchant = async () => {
    setLoading(true);
    setError(null);
    try {
      // البحث عن التاجر بالـ slug
      const db = await getDbExecutor();
      const result = await db.get<any>(
        `SELECT 
          m.id, m.name, m.slug, m.description, m.phone,
          m."coverImageUrl" as coverImageUrl, m."logoUrl" as logoUrl,
          m."cuisineTags" as cuisineTags, m."deliveryFeeAmount" as deliveryFeeAmount,
          m."minimumOrderAmount" as minimumOrderAmount, m.currency, m.status, m.rating,
          m."createdAt" as createdAt, m."updatedAt" as updatedAt
        FROM "Merchant" m
        WHERE m.slug = ?`,
        [slug]
      );

      if (!result) {
        setError('التاجر غير موجود');
        return;
      }

      setMerchant({
        ...result,
        cuisineTags: result.cuisineTags.split(',').filter(Boolean),
        isOpen: true,
      });
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات التاجر');
    } finally {
      setLoading(false);
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

  if (error || !merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'التاجر غير موجود'}</p>
          <Button variant="primary" onClick={() => window.history.back()}>
            العودة للخلف
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4efe8] to-[#e8ddd0]">
      {/* Cover Image */}
      <div className="relative h-64 md:h-80">
        {merchant.coverImageUrl ? (
          <img
            src={merchant.coverImageUrl}
            alt={merchant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#d66b42] to-[#b85a35] flex items-center justify-center">
            <span className="text-white text-8xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      </div>

      {/* Merchant Info */}
      <div className="max-w-7xl mx-auto px-4 -mt-32 relative z-10">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#2d1f1a] mb-2">{merchant.name}</h1>
              <p className="text-[#6b5c55] mb-3">{merchant.description}</p>
              
              {/* Tags & Rating */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-semibold text-[#2d1f1a]">{merchant.rating.toFixed(1)}</span>
                </div>
                {merchant.cuisineTags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-[#f4efe8] text-[#6b5c55] rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-[#6b5c55]">رسوم التوصيل</p>
                <p className="font-bold text-[#2d1f1a]">
                  {(merchant.deliveryFeeAmount / 100).toFixed(2)} ريال
                </p>
              </div>
              <div className="text-center">
                <p className="text-[#6b5c55]">الحد الأدنى</p>
                <p className="font-bold text-[#2d1f1a]">
                  {(merchant.minimumOrderAmount / 100).toFixed(2)} ريال
                </p>
              </div>
              <div className="text-center">
                <p className="text-[#6b5c55]">الحالة</p>
                <p className={`font-bold ${merchant.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {merchant.isOpen ? 'مفتوح' : 'مغلق'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <MerchantMenu merchantId={merchant.id} merchant={merchant} />
      </div>
    </div>
  );
}
