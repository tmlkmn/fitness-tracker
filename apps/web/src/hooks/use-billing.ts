import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyBilling,
  getMyInvoices,
  createCheckoutSession,
  cancelMySubscription,
  resumeMySubscription,
  openCustomerPortal,
} from "@/actions/billing";
import type { BillingTier, BillingInterval } from "@/lib/billing/tier-config";

export function useBilling() {
  return useQuery({
    queryKey: ["billing.me"],
    queryFn: () => getMyBilling(),
    staleTime: 30_000,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["billing.invoices"],
    queryFn: () => getMyInvoices(),
    staleTime: 60_000,
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (v: { tier: BillingTier; interval: BillingInterval }) =>
      createCheckoutSession(v.tier, v.interval),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelMySubscription(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing.me"] }),
  });
}

export function useResumeSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => resumeMySubscription(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing.me"] }),
  });
}

export function useCustomerPortal() {
  return useMutation({
    mutationFn: () => openCustomerPortal(),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
  });
}
