'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Ban,
  Banknote,
  CheckCheck,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileCheck2,
  ListChecks,
  Minus,
  Percent,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  TimerReset,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminApi, adminKeys } from '@/lib/api';
import {
  dashboardDateRange,
  dateInputValue,
  type DashboardPeriod,
} from '@/lib/admin/dashboard-period';
import { useCopy } from '@/lib/i18n/use-copy';
import { statusIntent } from '@/lib/orders/presentation';
import { cn } from '@/lib/utils/cn';

import { AdminPageHeader, AdminTable, DataState } from './admin-ui';

type Comparison = {
  previous: number | null;
  change_percentage: number | null;
};

const toneClasses = {
  neutral: 'border-s-border',
  warning: 'border-s-warning',
  success: 'border-s-success',
  info: 'border-s-info',
  error: 'border-s-error',
} as const;

function DashboardCard({
  label,
  value,
  description,
  icon: Icon,
  href,
  tone = 'neutral',
  comparison,
  previousValue,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  href?: string;
  tone?: keyof typeof toneClasses;
  comparison?: Comparison;
  previousValue?: string | number | null;
}) {
  const _copy = useCopy();
  const content = (
    <article
      className={cn(
        'group h-full border border-border border-s-4 bg-surface p-5 shadow-xs transition-[border-color,transform,box-shadow] duration-200',
        href &&
          'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md',
        toneClasses[tone],
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-3 font-display text-3xl leading-none text-primary">
            {value}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-surface-muted text-secondary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 min-h-10 text-sm leading-5 text-muted-foreground">
        {description}
      </p>
      {comparison ? (
        <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          {comparison.change_percentage === null ? (
            <Minus className="size-3.5" aria-hidden="true" />
          ) : comparison.change_percentage >= 0 ? (
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="size-3.5" aria-hidden="true" />
          )}
          <span>
            {comparison.change_percentage === null
              ? _copy(
                  'Previous period: {value}',
                  'الفترة السابقة: {value}',
                ).replace(
                  '{value}',
                  String(previousValue ?? comparison.previous ?? 0),
                )
              : _copy(
                  '{change}% vs previous period',
                  '{change}% عن الفترة السابقة',
                ).replace(
                  '{change}',
                  `${comparison.change_percentage > 0 ? '+' : ''}${comparison.change_percentage}`,
                )}
          </span>
        </div>
      ) : href ? (
        <p className="mt-4 border-t border-border pt-3 text-xs font-semibold text-primary">
          {_copy('Open filtered orders', 'فتح الطلبات المفلترة')}
        </p>
      ) : null}
    </article>
  );

  return href ? (
    <Link
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      {content}
    </Link>
  ) : (
    content
  );
}

function PeriodButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      className="grow sm:grow-0"
      onClick={onClick}
      size="sm"
      variant={active ? 'primary' : 'outline'}
    >
      {children}
    </Button>
  );
}

export function DashboardView() {
  const _copy = useCopy();
  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(
    () => dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    [now],
  );
  const today = useMemo(() => dateInputValue(now), [now]);
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [customStart, setCustomStart] = useState(monthStart);
  const [customEnd, setCustomEnd] = useState(today);
  const [appliedCustom, setAppliedCustom] = useState({
    start: monthStart,
    end: today,
  });

  const selectedRange = useMemo(
    () =>
      dashboardDateRange(period, appliedCustom.start, appliedCustom.end, now),
    [appliedCustom, now, period],
  );
  const draftCustomRange = dashboardDateRange(
    'custom',
    customStart,
    customEnd,
    now,
  );
  const params = useMemo(
    () =>
      selectedRange
        ? {
            start_date: selectedRange.start.toISOString(),
            end_date: selectedRange.end.toISOString(),
          }
        : {},
    [selectedRange],
  );

  const query = useQuery({
    queryKey: [...adminKeys.dashboard, params],
    queryFn: ({ signal }) => adminApi.dashboard(params, { signal }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const data = query.data;
  const money = (value: number) =>
    _copy.money(value, data?.performance.currency ?? 'AED');
  const previousMoney = (comparison?: Comparison) =>
    comparison?.previous === null || comparison?.previous === undefined
      ? null
      : money(comparison.previous);

  const operationalCards = data
    ? [
        {
          label: _copy('All orders', 'كل الطلبات'),
          value: data.operational.total,
          description: _copy(
            'Every order currently stored, regardless of status or date.',
            'كل الطلبات المسجلة حاليًا مهما كانت حالتها أو تاريخها.',
          ),
          icon: ShoppingBag,
          href: '/admin/orders',
        },
        {
          label: _copy('Awaiting payment', 'بانتظار الدفع'),
          value: data.operational.awaiting_payment,
          description: _copy(
            'Orders still pending or waiting for a successful payment.',
            'طلبات معلقة أو ما زالت تنتظر إتمام الدفع بنجاح.',
          ),
          icon: Clock3,
          href: '/admin/orders?queue=awaiting_payment',
          tone: 'warning' as const,
        },
        {
          label: _copy('Paid, awaiting start', 'مدفوع وينتظر البدء'),
          value: data.operational.paid_awaiting_start,
          description: _copy(
            'Paid orders not yet moved into the production workflow.',
            'طلبات مدفوعة لم تنتقل بعد إلى مرحلة التنفيذ.',
          ),
          icon: CreditCard,
          href: '/admin/orders?status=paid',
          tone: 'success' as const,
        },
        {
          label: _copy('Waiting for customer', 'بانتظار العميل'),
          value: data.operational.awaiting_information,
          description: _copy(
            'Work is paused until required information or files arrive.',
            'العمل متوقف لحين وصول البيانات أو الملفات المطلوبة من العميل.',
          ),
          icon: TimerReset,
          href: '/admin/orders?status=awaiting_information',
          tone: 'warning' as const,
        },
        {
          label: _copy('In production', 'قيد التنفيذ'),
          value: data.operational.in_progress,
          description: _copy(
            'Received, in-progress, and under-review orders combined.',
            'إجمالي الطلبات المستلمة وقيد التنفيذ وتحت المراجعة.',
          ),
          icon: ListChecks,
          href: '/admin/orders?queue=in_progress',
          tone: 'info' as const,
        },
        {
          label: _copy('Ready for delivery', 'جاهز للتسليم'),
          value: data.operational.ready,
          description: _copy(
            'Finished work waiting to be delivered to the customer.',
            'أعمال انتهت وتنتظر التسليم للعميل.',
          ),
          icon: FileCheck2,
          href: '/admin/orders?status=ready',
          tone: 'success' as const,
        },
        {
          label: _copy('Completed', 'مكتمل'),
          value: data.operational.completed,
          description: _copy(
            'Orders whose service lifecycle has been fully completed.',
            'طلبات اكتملت دورة تقديم الخدمة الخاصة بها بالكامل.',
          ),
          icon: CheckCheck,
          href: '/admin/orders?status=completed',
          tone: 'success' as const,
        },
        {
          label: _copy('Cancelled', 'ملغي'),
          value: data.operational.cancelled,
          description: _copy(
            'Orders cancelled before their normal completion.',
            'طلبات أُلغيت قبل إتمامها بشكل طبيعي.',
          ),
          icon: Ban,
          href: '/admin/orders?status=cancelled',
          tone: 'error' as const,
        },
        {
          label: _copy('Refunded', 'مسترد'),
          value: data.operational.refunded,
          description: _copy(
            'Orders explicitly marked as refunded; this is an order count.',
            'طلبات محددة كمستردة؛ هذا عدد طلبات وليس قيمة مالية.',
          ),
          icon: RotateCcw,
          href: '/admin/orders?status=refunded',
          tone: 'neutral' as const,
        },
      ]
    : [];

  const performanceCards = data
    ? [
        {
          label: _copy('Orders created', 'الطلبات الجديدة'),
          value: data.performance.orders_created,
          description: _copy(
            'Orders created during the selected period, paid or unpaid.',
            'الطلبات التي أُنشئت خلال الفترة المحددة سواء دُفعت أم لا.',
          ),
          icon: ReceiptText,
          comparison: data.comparison.orders_created,
        },
        {
          label: _copy('Paid orders', 'الطلبات المدفوعة'),
          value: data.performance.paid_orders,
          description: _copy(
            'Distinct orders with a real positive paid transaction in this period.',
            'طلبات فريدة لها عملية دفع حقيقية موجبة خلال هذه الفترة.',
          ),
          icon: CreditCard,
          comparison: data.comparison.paid_orders,
        },
        {
          label: _copy('Successful payments', 'عمليات الدفع الناجحة'),
          value: data.performance.successful_payments,
          description: _copy(
            'Successful positive payment transactions; one order may have more than one.',
            'عمليات دفع موجبة ناجحة؛ قد يكون للطلب الواحد أكثر من عملية.',
          ),
          icon: WalletCards,
          comparison: data.comparison.successful_payments,
        },
        {
          label: _copy('Gross sales', 'إجمالي المبيعات'),
          value: money(data.performance.gross_sales),
          description: _copy(
            'Final value of paid orders before accounting for payment records.',
            'القيمة النهائية للطلبات المدفوعة قبل مطابقتها بسجلات التحصيل.',
          ),
          icon: BadgeDollarSign,
          comparison: data.comparison.gross_sales,
          previousValue: previousMoney(data.comparison.gross_sales),
        },
        {
          label: _copy('Collected revenue', 'الإيراد المحصّل'),
          value: money(data.performance.collected_revenue),
          description: _copy(
            'Money actually recorded as paid; zero-value bypass payments are excluded.',
            'الأموال المسجلة كمحصّلة فعليًا؛ الدفع التجريبي بقيمة صفر مستبعد.',
          ),
          icon: Banknote,
          comparison: data.comparison.collected_revenue,
          previousValue: previousMoney(data.comparison.collected_revenue),
        },
        {
          label: _copy('Discounts granted', 'الخصومات الممنوحة'),
          value: money(data.performance.discounts),
          description: _copy(
            'Total discounts attached to orders with verified positive payments.',
            'إجمالي الخصومات على الطلبات ذات الدفع الموجب المؤكد.',
          ),
          icon: Percent,
          comparison: data.comparison.discounts,
          previousValue: previousMoney(data.comparison.discounts),
        },
        {
          label: _copy('Average paid order', 'متوسط الطلب المدفوع'),
          value: money(data.performance.average_order_value),
          description: _copy(
            'Gross sales divided by the number of distinct paid orders.',
            'إجمالي المبيعات مقسومًا على عدد الطلبات المدفوعة الفريدة.',
          ),
          icon: CircleDollarSign,
          comparison: data.comparison.average_order_value,
          previousValue: previousMoney(data.comparison.average_order_value),
        },
        {
          label: _copy('New customers', 'عملاء جدد'),
          value: data.performance.new_customers,
          description: _copy(
            'Customer accounts created during the selected period.',
            'حسابات العملاء التي أُنشئت خلال الفترة المحددة.',
          ),
          icon: UsersRound,
          comparison: data.comparison.new_customers,
        },
        {
          label: _copy('Purchasing customers', 'عملاء قاموا بالشراء'),
          value: data.performance.purchasing_customers,
          description: _copy(
            'Unique customers with at least one real positive payment in this period.',
            'عملاء فريدون لديهم دفعة حقيقية موجبة واحدة على الأقل خلال الفترة.',
          ),
          icon: UserRoundCheck,
          comparison: data.comparison.purchasing_customers,
        },
      ]
    : [];

  return (
    <>
      <AdminPageHeader
        title={_copy('Overview', 'نظرة عامة')}
        description={_copy(
          'Live operational queues and clearly dated commercial performance.',
          'حالة التشغيل الحالية وأداء المبيعات ضمن فترة زمنية واضحة.',
        )}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {_copy('Auto-refresh: 30 sec', 'تحديث تلقائي: 30 ثانية')}
            </Badge>
            <Button
              leftIcon={
                <RefreshCw
                  className={cn('size-4', query.isFetching && 'animate-spin')}
                />
              }
              loading={query.isFetching && !data}
              onClick={() => query.refetch()}
              size="sm"
              variant="outline"
            >
              {_copy('Refresh now', 'تحديث الآن')}
            </Button>
          </div>
        }
      />

      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
      >
        {data ? (
          <>
            {data.payment_mode === 'bypass' ? (
              <Alert
                className="mb-6"
                icon={<CreditCard />}
                title={_copy(
                  'Test payment mode is active',
                  'وضع الدفع التجريبي مفعّل',
                )}
                description={_copy(
                  'Orders may be marked paid without collecting money. They appear in operational queues, but collected revenue, paid-order metrics, and customer spend exclude zero-value bypass records.',
                  'قد تُسجل الطلبات كمدفوعة دون تحصيل أموال. ستظهر في كروت التشغيل، لكن الإيراد المحصّل ومؤشرات الدفع وإنفاق العملاء تستبعد سجلات الدفع التجريبي ذات القيمة صفر.',
                )}
                variant="warning"
              />
            ) : data.payment_mode === 'manual' ? (
              <Alert
                className="mb-6"
                icon={<CreditCard />}
                title={_copy('Manual payment confirmation is active')}
                description={_copy(
                  'Customers submit requests and arrange payment on WhatsApp. Open an awaiting-payment order only after the funds appear in your payment account, then use “Confirm payment received”. Revenue and purchasing-customer cards update from that recorded amount.',
                )}
                variant="info"
              />
            ) : null}

            <section aria-labelledby="operations-heading">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="type-h3 text-primary" id="operations-heading">
                    {_copy('Operations right now', 'التشغيل الآن')}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {_copy(
                      'Current totals across all dates. Select a card to inspect its orders.',
                      'الأعداد الحالية لكل الفترات. اضغط على أي كارت لعرض طلباته.',
                    )}
                  </p>
                </div>
                <Badge variant="secondary">
                  {_copy('No date filter', 'بدون فلتر تاريخ')}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {operationalCards.map((card) => (
                  <DashboardCard key={card.label} {...card} />
                ))}
              </div>
            </section>

            <section className="mt-10" aria-labelledby="performance-heading">
              <div className="mb-4">
                <h3 className="type-h3 text-primary" id="performance-heading">
                  {_copy('Performance by period', 'الأداء حسب الفترة')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {_copy(
                    'Each card uses the selected period and compares it with the immediately preceding period of equal length.',
                    'كل كارت يحسب الفترة المحددة ويقارنها بالفترة السابقة لها بنفس المدة.',
                  )}
                </p>
              </div>

              <div className="mb-5 border border-border bg-surface p-4 shadow-xs">
                <div className="flex flex-wrap gap-2">
                  <PeriodButton
                    active={period === 'today'}
                    onClick={() => setPeriod('today')}
                  >
                    {_copy('Today', 'اليوم')}
                  </PeriodButton>
                  <PeriodButton
                    active={period === '7d'}
                    onClick={() => setPeriod('7d')}
                  >
                    {_copy('Last 7 days', 'آخر 7 أيام')}
                  </PeriodButton>
                  <PeriodButton
                    active={period === 'month'}
                    onClick={() => setPeriod('month')}
                  >
                    {_copy('This month', 'هذا الشهر')}
                  </PeriodButton>
                  <PeriodButton
                    active={period === 'all'}
                    onClick={() => setPeriod('all')}
                  >
                    {_copy('All time', 'كل الوقت')}
                  </PeriodButton>
                  <PeriodButton
                    active={period === 'custom'}
                    onClick={() => setPeriod('custom')}
                  >
                    {_copy('Custom', 'مخصص')}
                  </PeriodButton>
                </div>

                {period === 'custom' ? (
                  <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                      {_copy('From', 'من')}
                      <Input
                        max={customEnd}
                        onChange={(event) => setCustomStart(event.target.value)}
                        type="date"
                        value={customStart}
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                      {_copy('To', 'إلى')}
                      <Input
                        min={customStart}
                        onChange={(event) => setCustomEnd(event.target.value)}
                        type="date"
                        value={customEnd}
                      />
                    </label>
                    <Button
                      disabled={!draftCustomRange}
                      onClick={() =>
                        setAppliedCustom({ start: customStart, end: customEnd })
                      }
                    >
                      {_copy('Apply dates', 'تطبيق التواريخ')}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {performanceCards.map((card) => (
                  <DashboardCard key={card.label} {...card} />
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {_copy(
                  'Refunded order count is shown in operations. A refunded monetary value is intentionally not estimated until the payment provider supplies auditable refund transactions.',
                  'عدد الطلبات المستردة ظاهر في التشغيل. لا يتم تقدير قيمة مالية للاستردادات حتى يوفّر مزود الدفع معاملات استرداد قابلة للمراجعة.',
                )}
              </p>
            </section>

            <section className="mt-10" aria-labelledby="recent-orders-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h3
                    className="type-h3 text-primary"
                    id="recent-orders-heading"
                  >
                    {_copy('Recent Orders', 'أحدث الطلبات')}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {_copy(
                      'Latest purchases across all services.',
                      'أحدث الطلبات عبر جميع الخدمات.',
                    )}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/admin/orders">
                    {_copy('View all', 'عرض الكل')}
                  </Link>
                </Button>
              </div>
              <AdminTable>
                <table className="w-full min-w-[720px] text-start text-sm">
                  <thead className="bg-surface-muted text-xs uppercase text-secondary">
                    <tr>
                      <th className="px-5 py-4">{_copy('Order', 'الطلب')}</th>
                      <th className="px-5 py-4">
                        {_copy('Customer', 'العميل')}
                      </th>
                      <th className="px-5 py-4">
                        {_copy('Service', 'الخدمة')}
                      </th>
                      <th className="px-5 py-4">{_copy('Amount', 'المبلغ')}</th>
                      <th className="px-5 py-4">{_copy('Status', 'الحالة')}</th>
                      <th className="px-5 py-4">{_copy('Date', 'التاريخ')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.recent_orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-5 py-4">
                          <Link
                            className="font-semibold text-primary hover:underline"
                            href={`/admin/orders/${order.id}`}
                          >
                            #{order.order_number}
                          </Link>
                        </td>
                        <td className="px-5 py-4">{order.customer_name}</td>
                        <td className="px-5 py-4">
                          {_copy(
                            order.package?.name_en ?? '—',
                            order.package?.name_ar,
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {money(Number(order.final_amount))}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge intent={statusIntent(order.status)}>
                            {_copy.status(order.status)}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {_copy.date(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTable>
            </section>
          </>
        ) : null}
      </DataState>
    </>
  );
}
