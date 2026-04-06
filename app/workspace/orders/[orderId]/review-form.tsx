'use client';

import { useState, useTransition } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { createReview } from './review-actions';
import { Button } from '@/components/Button';

interface Props {
  orderId: string;
  merchantId: string;
  onSuccess?: () => void;
}

export default function ReviewForm({ orderId, merchantId, onSuccess }: Props) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('الرجاء اختيار التقييم');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createReview(orderId, merchantId, rating, comment);
        
        if (result.error) {
          setError(result.error);
          return;
        }

        setSuccess(true);
        onSuccess?.();
      } catch (err: any) {
        setError(err.message || 'فشل إرسال التقييم');
      }
    });
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">⭐</div>
        <h3 className="text-xl font-bold text-[#2d1f1a] mb-2">شكراً لتقييمك!</h3>
        <p className="text-[#6b5c55]">تقييمك يساعدنا على تحسين الخدمة</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold text-[#2d1f1a] mb-6">تقييم الطلب</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Stars */}
        <div>
          <label className="block text-sm font-medium text-[#4a3f37] mb-3">
            التقييم
          </label>
          <div className="flex items-center gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                {(hoveredRating || rating) >= star ? (
                  <StarIconSolid className="w-12 h-12 text-yellow-400" />
                ) : (
                  <StarIcon className="w-12 h-12 text-gray-300" />
                )}
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-[#6b5c55] mt-2">
              {rating === 1 && 'سيء 😞'}
              {rating === 2 && 'مقبول 😐'}
              {rating === 3 && 'جيد 🙂'}
              {rating === 4 && 'جيد جداً 😊'}
              {rating === 5 && 'ممتاز! 🤩'}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-[#4a3f37] mb-1">
            تعليقك (اختياري)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d66b42] focus:border-transparent resize-none"
            placeholder="شاركنا تجربتك..."
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          disabled={isPending || rating === 0}
          className="w-full"
        >
          {isPending ? 'جاري الإرسال...' : 'إرسال التقييم'}
        </Button>
      </form>
    </div>
  );
}
