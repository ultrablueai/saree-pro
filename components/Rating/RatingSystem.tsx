"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon, FunnelIcon, StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { GlassPanel } from "../PremiumUI/GlassPanel";
import { PremiumButton } from "../PremiumUI/PremiumButton";
import { cn } from "../../lib/utils";

export interface RatingCategoryBreakdown {
  professionalism?: number;
  quality?: number;
  speed?: number;
  communication?: number;
  accuracy?: number;
  value?: number;
}

export interface RatingEntry {
  id: string;
  authorName: string;
  rating: number;
  title?: string;
  comment?: string | null;
  createdAt: string | Date;
  isVerified?: boolean;
  helpfulCount?: number;
  categories?: RatingCategoryBreakdown;
}

export interface RatingSummary {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  categoryAverages?: RatingCategoryBreakdown;
  trend?: "improving" | "stable" | "declining";
}

export interface RatingSubmission {
  rating: number;
  title: string;
  comment: string;
}

interface RatingSystemProps {
  ratings?: RatingEntry[];
  summary?: RatingSummary | null;
  targetLabel?: string;
  className?: string;
  allowSubmission?: boolean;
  onSubmitRating?: (submission: RatingSubmission) => void | Promise<void>;
}

function renderStaticStars(rating: number, size = "h-5 w-5") {
  return Array.from({ length: 5 }, (_, index) => {
    const starNumber = index + 1;
    const filled = starNumber <= Math.round(rating);

    return filled ? (
      <StarIconSolid key={starNumber} className={`${size} text-amber-400`} />
    ) : (
      <StarIcon key={starNumber} className={`${size} text-stone-300`} />
    );
  });
}

function formatRelativeDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export function RatingSystem({
  ratings = [],
  summary = null,
  targetLabel = "merchant",
  className = "",
  allowSubmission = false,
  onSubmitRating,
}: RatingSystemProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [minimumRating, setMinimumRating] = useState(0);
  const [draft, setDraft] = useState<RatingSubmission>({
    rating: 0,
    title: "",
    comment: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const filteredRatings = useMemo(() => {
    return minimumRating > 0
      ? ratings.filter((rating) => rating.rating >= minimumRating)
      : ratings;
  }, [minimumRating, ratings]);

  async function handleSubmit() {
    if (!onSubmitRating || draft.rating === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitRating(draft);
      setDraft({ rating: 0, title: "", comment: "" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-ink)]">Ratings</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Reviews and score breakdown for this {targetLabel}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white"
        >
          <FunnelIcon className="h-4 w-4" />
          Filters
        </button>
      </div>

      {showFilters ? (
        <GlassPanel className="p-4">
          <label className="block text-sm font-medium text-[var(--color-ink)]">
            Minimum rating
          </label>
          <select
            value={minimumRating}
            onChange={(event) => setMinimumRating(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
          >
            <option value={0}>All ratings</option>
            <option value={5}>5 stars</option>
            <option value={4}>4 stars and above</option>
            <option value={3}>3 stars and above</option>
            <option value={2}>2 stars and above</option>
            <option value={1}>1 star and above</option>
          </select>
        </GlassPanel>
      ) : null}

      {summary ? (
        <GlassPanel className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="text-center">
              <p className="text-4xl font-bold text-[var(--color-ink)]">
                {summary.averageRating.toFixed(1)}
              </p>
              <div className="mt-3 flex justify-center gap-1">
                {renderStaticStars(summary.averageRating, "h-6 w-6")}
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {summary.totalRatings} total ratings
              </p>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.ratingDistribution[star] ?? 0;
                const width =
                  summary.totalRatings > 0 ? (count / summary.totalRatings) * 100 : 0;

                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-medium text-[var(--color-ink)]">
                      {star}★
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm text-[var(--color-muted)]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {allowSubmission ? (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-[var(--color-ink)]">Leave a rating</h3>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink)]">
                Your score
              </label>
              <div className="mt-3 flex gap-2">
                {Array.from({ length: 5 }, (_, index) => {
                  const starNumber = index + 1;
                  const active = starNumber <= draft.rating;

                  return (
                    <button
                      key={starNumber}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, rating: starNumber }))}
                      className="transition hover:scale-105"
                    >
                      {active ? (
                        <StarIconSolid className="h-9 w-9 text-amber-400" />
                      ) : (
                        <StarIcon className="h-9 w-9 text-stone-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-ink)]">Title</label>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Short headline for your feedback"
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-ink)]">Comment</label>
              <textarea
                value={draft.comment}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, comment: event.target.value }))
                }
                rows={4}
                placeholder="Share what worked well and what could improve"
                className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              />
            </div>

            <PremiumButton
              className="w-full"
              onClick={handleSubmit}
              disabled={draft.rating === 0 || submitting}
              loading={submitting}
            >
              Submit rating
            </PremiumButton>
          </div>
        </GlassPanel>
      ) : null}

      {filteredRatings.length ? (
        <div className="space-y-4">
          {filteredRatings.map((rating) => (
            <GlassPanel key={rating.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--color-ink)]">{rating.authorName}</p>
                    {rating.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex gap-1">{renderStaticStars(rating.rating)}</div>
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  {formatRelativeDate(rating.createdAt)}
                </p>
              </div>

              {rating.title ? (
                <p className="mt-4 font-semibold text-[var(--color-ink)]">{rating.title}</p>
              ) : null}
              {rating.comment ? (
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  {rating.comment}
                </p>
              ) : null}

              {rating.categories && Object.keys(rating.categories).length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(rating.categories).map(([category, value]) => (
                    <div key={category} className="rounded-xl bg-white/70 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        {category}
                      </p>
                      <div className="mt-2 flex gap-1">{renderStaticStars(value ?? 0, "h-4 w-4")}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </GlassPanel>
          ))}
        </div>
      ) : (
        <GlassPanel className="p-8 text-center">
          <StarIcon className="mx-auto h-10 w-10 text-[var(--color-muted)]" />
          <p className="mt-4 text-lg font-medium text-[var(--color-ink)]">No ratings yet</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Ratings will appear here once customers start leaving feedback.
          </p>
        </GlassPanel>
      )}
    </div>
  );
}
