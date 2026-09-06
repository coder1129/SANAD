'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { reviewKeys, reviewsApi } from '@/lib/api';
import { formatStatus, statusIntent } from '@/lib/orders/presentation';

const schema = z.object({
  rating: z.number().int().min(1, 'Choose a rating.').max(5),
  comment: z
    .string()
    .trim()
    .min(2, 'Tell us a little about your experience.')
    .max(3000),
});
type Values = z.infer<typeof schema>;

export function ReviewForm({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const reviewQuery = useQuery({
    queryKey: reviewKeys.order(orderId),
    queryFn: ({ signal }) => reviewsApi.getForOrder(orderId, { signal }),
  });
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 0, comment: '' },
  });
  useEffect(() => {
    if (reviewQuery.data)
      reset({
        rating: reviewQuery.data.rating,
        comment: reviewQuery.data.comment,
      });
  }, [reset, reviewQuery.data]);
  const rating = useWatch({ control, name: 'rating' });
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      reviewQuery.data
        ? reviewsApi.update(reviewQuery.data.id, values)
        : reviewsApi.create({ orderId, ...values }),
    onSuccess: (review) => {
      queryClient.setQueryData(reviewKeys.order(orderId), review);
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'public'] });
    },
  });

  if (reviewQuery.isPending)
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Checking review eligibility...
      </p>
    );
  if (reviewQuery.error)
    return (
      <Alert
        title="Review unavailable"
        description={reviewQuery.error.userMessage}
        variant="error"
      />
    );
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="type-h3 text-primary">Rate Your Experience</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your review is checked by SANAD before it appears publicly.
          </p>
        </div>
        {reviewQuery.data ? (
          <StatusBadge intent={statusIntent(reviewQuery.data.status)}>
            {formatStatus(reviewQuery.data.status)}
          </StatusBadge>
        ) : null}
      </div>
      {mutation.error ? (
        <Alert
          className="mt-5"
          title="Could not save review"
          description={mutation.error.userMessage}
          variant="error"
        />
      ) : null}
      {mutation.isSuccess ? (
        <Alert
          className="mt-5"
          title="Review saved"
          description="Thank you. Your review is now pending moderation."
          variant="success"
        />
      ) : null}
      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">Rating</legend>
        <div
          className="mt-2 flex gap-1"
          role="radiogroup"
          aria-label="Rating from 1 to 5"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-label={`${value} star${value === 1 ? '' : 's'}`}
              aria-checked={rating === value}
              className="rounded p-1 text-accent hover:bg-surface-muted"
              key={value}
              onClick={() =>
                setValue('rating', value, { shouldValidate: true })
              }
              role="radio"
              type="button"
            >
              <Star
                className="size-7"
                fill={value <= rating ? 'currentColor' : 'none'}
              />
            </button>
          ))}
        </div>
        {errors.rating ? (
          <p className="mt-1 text-sm text-error">{errors.rating.message}</p>
        ) : null}
      </fieldset>
      <label className="mt-5 grid gap-2 text-sm font-semibold">
        Comment
        <Textarea
          {...register('comment')}
          invalid={Boolean(errors.comment)}
          placeholder="Share what SANAD helped you accomplish."
        />
        {errors.comment ? (
          <span className="text-sm text-error">{errors.comment.message}</span>
        ) : null}
      </label>
      <Button
        className="mt-5"
        loading={mutation.isPending}
        loadingLabel="Saving review"
        type="submit"
      >
        {mutation.isPending
          ? 'Saving...'
          : reviewQuery.data
            ? 'Update Review'
            : 'Submit Review'}
      </Button>
    </form>
  );
}
