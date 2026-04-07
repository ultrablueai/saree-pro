export interface Rating {
  id: string;
  orderId?: string;
  userId?: string;
  targetUserId?: string;
  targetType: "driver" | "merchant" | "food_item";
  rating: number;
  title?: string;
  comment?: string | null;
  categories?: {
    professionalism?: number;
    quality?: number;
    speed?: number;
    communication?: number;
    accuracy?: number;
    value?: number;
  };
  isVerified?: boolean;
  helpfulCount?: number;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  categoryAverages?: Rating["categories"];
  recentRatings?: Rating[];
  trend?: "improving" | "stable" | "declining";
}

export interface RatingFilter {
  targetType?: Rating["targetType"];
  minRating?: number;
  maxRating?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  isVerified?: boolean;
  hasComment?: boolean;
}

export function getStarRating(rating: number): string {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return "text-green-600";
  if (rating >= 3.5) return "text-yellow-600";
  if (rating >= 2.5) return "text-orange-600";
  return "text-red-600";
}

export function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return "Excellent";
  if (rating >= 3.5) return "Good";
  if (rating >= 2.5) return "Average";
  if (rating >= 1.5) return "Poor";
  return "Very Poor";
}

export function formatRatingDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const diffTime = Date.now() - value.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return value.toLocaleDateString();
}
