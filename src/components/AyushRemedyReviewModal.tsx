import React, { useState, useMemo } from 'react';
import {
  Star,
  X,
  ThumbsUp,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  Send,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { AyushRemedy, RemedyReview } from '../types';
import { useHealthStore } from '../store/useHealthStore';

interface AyushRemedyReviewModalProps {
  remedy: AyushRemedy;
  isOpen: boolean;
  onClose: () => void;
}

const CONTEXT_TAGS = [
  'Iron Recovery & Hb',
  'Gut & Digestion',
  'Energy & Vitality',
  'Morning Ritual',
  'Post-Meal Routine',
  'Physician Recommended',
  'Traditional Recipe',
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: '1 Star - Not effective for me',
  2: '2 Stars - Mild effect / Hard to consume',
  3: '3 Stars - Good & Average',
  4: '4 Stars - Very good & noticeable improvement',
  5: '5 Stars - Excellent & highly effective!',
};

export const AyushRemedyReviewModal: React.FC<AyushRemedyReviewModalProps> = ({
  remedy,
  isOpen,
  onClose,
}) => {
  const currentUser = useHealthStore((state) => state.currentUser);
  const demographics = useHealthStore((state) => state.demographics);
  const remedyReviews = useHealthStore((state) => state.remedyReviews);
  const addRemedyReview = useHealthStore((state) => state.addRemedyReview);
  const voteReviewHelpful = useHealthStore((state) => state.voteReviewHelpful);
  const deleteRemedyReview = useHealthStore((state) => state.deleteRemedyReview);

  // Filter reviews for this specific remedy
  const reviews = useMemo(() => {
    return remedyReviews.filter(
      (r) =>
        r.remedyId === remedy.id ||
        (remedy.id === 'mahua-flower-laddoo' && r.remedyId === 'mahuwa-flower-laddoo') ||
        (remedy.id === 'mahuwa-flower-laddoo' && r.remedyId === 'mahua-flower-laddoo')
    );
  }, [remedyReviews, remedy.id]);

  // Calculated rating metrics
  const { avgRating, totalCount, breakdown } = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        avgRating: remedy.rating || 5.0,
        totalCount: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Math.round((sum / total) * 10) / 10;
    const b: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      b[r.rating] = (b[r.rating] || 0) + 1;
    });
    return { avgRating: avg, totalCount: total, breakdown: b };
  }, [reviews, remedy.rating]);

  // Form State
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewerName, setReviewerName] = useState<string>(
    currentUser?.name || demographics.name || ''
  );
  const [reviewComment, setReviewComment] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('Iron Recovery & Hb');
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [filterStar, setFilterStar] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'helpful'>('helpful');
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [votedIds, setVotedIds] = useState<Record<string, boolean>>({});

  // Filtered & Sorted Reviews
  const displayedReviews = useMemo(() => {
    let list = [...reviews];
    if (filterStar !== 'all') {
      list = list.filter((r) => r.rating === filterStar);
    }
    list.sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'helpful') return (b.helpfulCount || 0) - (a.helpfulCount || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [reviews, filterStar, sortBy]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    addRemedyReview({
      remedyId: remedy.id,
      userName: reviewerName.trim() || 'Community Member',
      userEmail: currentUser?.email,
      rating: selectedRating,
      comment: reviewComment.trim(),
      userTag: selectedTag,
      verifiedBadge: true,
    });

    setReviewComment('');
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setShowReviewForm(false);
    }, 1800);
  };

  const handleVote = (id: string) => {
    if (votedIds[id]) return;
    voteReviewHelpful(id);
    setVotedIds((prev) => ({ ...prev, [id]: true }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#FCE7F3] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF1F2] via-[#FFF5F7] to-white border-b border-[#FCE7F3] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#F43F5E] text-white">
                {remedy.category}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 italic">
                {remedy.sanskritName}
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 leading-snug">
              {remedy.name}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Community ratings, tolerance experiences, and clinical user reviews.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Total Calculated Rating Summary Banner */}
          <div className="rounded-2xl bg-[#FFF5F7] p-5 border border-[#FCE7F3] grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Left: Big Score & Stars */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center text-center p-3 rounded-2xl bg-white border border-[#FCE7F3]">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {avgRating.toFixed(1)}
              </span>
              <div className="flex items-center gap-1 my-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(avgRating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-600">
                Based on <strong>{totalCount}</strong> verified {totalCount === 1 ? 'review' : 'reviews'}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                100% Calculated Average
              </span>
            </div>

            {/* Right: Star Breakdown Progress Bars */}
            <div className="sm:col-span-7 space-y-1.5">
              {[5, 4, 3, 2, 1].map((starVal) => {
                const count = breakdown[starVal] || 0;
                const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                return (
                  <div key={starVal} className="flex items-center gap-2 text-xs">
                    <span className="w-7 font-bold text-slate-700 text-right">{starVal}★</span>
                    <div className="flex-1 h-2 rounded-full bg-white border border-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-[11px] text-slate-400 text-right font-medium">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row: Write Review Toggle */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#F43F5E]" />
              <span>Community Reviews & Experiences ({reviews.length})</span>
            </h4>

            <button
              type="button"
              id="btn-toggle-write-review"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F43F5E] hover:bg-[#E11D48] text-white shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showReviewForm ? 'Cancel Review' : 'Write a Review'}</span>
            </button>
          </div>

          {/* Write Review Form Collapsible */}
          {showReviewForm && (
            <form
              onSubmit={handleSubmitReview}
              className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#FFF5F7] border-2 border-[#FCE7F3] space-y-4 animate-in slide-in-from-top duration-200"
            >
              <div className="flex items-center justify-between border-b border-[#FCE7F3] pb-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Rate & Share Your Experience
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {RATING_DESCRIPTIONS[hoverRating || selectedRating]}
                </span>
              </div>

              {/* Star Rating Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Your Overall Rating <span className="text-[#F43F5E]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setSelectedRating(star)}
                      className="p-1 text-slate-300 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= (hoverRating || selectedRating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-extrabold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    {selectedRating} / 5
                  </span>
                </div>
              </div>

              {/* Name & Context Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Your Name / Role
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Pooja Sharma / Verified User"
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#F43F5E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Health Context / Purpose
                  </label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#F43F5E] cursor-pointer"
                  >
                    {CONTEXT_TAGS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Review Text */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Your Detailed Review & Tolerability <span className="text-[#F43F5E]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share how this food suggestion worked for your energy, iron levels, digestion, or daily routine..."
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 bg-white focus:outline-none focus:border-[#F43F5E]"
                />
              </div>

              {/* Submit Button & Confirmation */}
              <div className="flex items-center justify-between pt-1">
                {submittedSuccess ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Review submitted successfully! Total rating updated.
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Your rating directly updates the calculated community score.
                  </span>
                )}

                <button
                  type="submit"
                  disabled={submittedSuccess || !reviewComment.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F43F5E] hover:bg-[#E11D48] text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Review</span>
                </button>
              </div>
            </form>
          )}

          {/* Review Filter & Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            {/* Filter by Star */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 shrink-0">Filter:</span>
              <button
                type="button"
                onClick={() => setFilterStar('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterStar === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All ({reviews.length})
              </button>
              {[5, 4, 3, 2, 1].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStar(s)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filterStar === s
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {s}★ ({breakdown[s] || 0})
                </button>
              ))}
            </div>

            {/* Sort by */}
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-[11px] font-bold bg-white text-slate-700 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="helpful">Most Helpful</option>
                <option value="highest">Highest Rating</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-3.5">
            {displayedReviews.length > 0 ? (
              displayedReviews.map((rev) => {
                const isUserAuthor =
                  currentUser?.email && rev.userEmail === currentUser.email;

                return (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-white border border-[#FCE7F3] shadow-xs space-y-2.5 hover:border-[#F43F5E]/30 transition-all"
                  >
                    {/* Review Header: User avatar, name, verified badge & star rating */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F43F5E] to-rose-400 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {rev.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">
                              {rev.userName}
                            </span>
                            {rev.verifiedBadge && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                Verified User
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{rev.createdAt}</span>
                            {rev.userTag && (
                              <>
                                <span>·</span>
                                <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {rev.userTag}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5 bg-[#FFF5F7] px-2 py-1 rounded-lg border border-[#FCE7F3]">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Star
                            key={st}
                            className={`w-3 h-3 ${
                              st <= rev.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review Comment Body */}
                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      {rev.comment}
                    </p>

                    {/* Review Footer: Helpful counter & Delete option */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => handleVote(rev.id)}
                        disabled={votedIds[rev.id]}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          votedIds[rev.id]
                            ? 'bg-rose-50 text-[#F43F5E] border border-[#FCE7F3]'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Helpful ({rev.helpfulCount || 0})</span>
                      </button>

                      {isUserAuthor && (
                        <button
                          type="button"
                          onClick={() => deleteRemedyReview(rev.id)}
                          className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete my review</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-2xl">💬</span>
                <p className="text-xs font-bold text-slate-700">No reviews found for this rating filter.</p>
                <button
                  type="button"
                  onClick={() => setFilterStar('all')}
                  className="text-xs font-bold text-[#F43F5E] hover:underline cursor-pointer"
                >
                  View all reviews
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-[#FCE7F3] flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Ratings reflect real user and community experience.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
