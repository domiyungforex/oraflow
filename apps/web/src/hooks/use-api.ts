"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import {
  setTokenProvider,
  ordersApi,
  productsApi,
  customersApi,
  inventoryApi,
  paymentsApi,
  conversationsApi,
  analyticsApi,
  businessApi,
  type OrderFilters,
  type ProductFilters,
  type CustomerFilters,
  type InventoryFilters,
  type PaymentFilters,
  type ConversationFilters,
} from "@/lib/api";

// ============================================================
// Token Provider Setup
// ============================================================

export function useTokenSetup() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenProvider(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);
}

// ============================================================
// Orders Hooks
// ============================================================

export function useOrders(params?: OrderFilters) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => ordersApi.list(params),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      ordersApi.updateStatus(id, status, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// ============================================================
// Products Hooks
// ============================================================

export function useProducts(params?: ProductFilters) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productsApi.list(params),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => productsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof productsApi.update>[1] }) =>
      productsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ============================================================
// Customers Hooks
// ============================================================

export function useCustomers(params?: CustomerFilters) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => customersApi.list(params),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof customersApi.update>[1] }) =>
      customersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", variables.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// ============================================================
// Inventory Hooks
// ============================================================

export function useInventory(params?: InventoryFilters) {
  return useQuery({
    queryKey: ["inventory", params],
    queryFn: () => inventoryApi.list(params),
  });
}

export function useInventoryItem(productId: string) {
  return useQuery({
    queryKey: ["inventory", productId],
    queryFn: () => inventoryApi.get(productId),
    enabled: !!productId,
  });
}

export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inventoryApi.adjust,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateInventoryThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, threshold }: { productId: string; threshold: number }) =>
      inventoryApi.updateThreshold(productId, threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useInventoryMovements(productId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["inventory", "movements", productId, params],
    queryFn: () => inventoryApi.getMovements(productId, params),
    enabled: !!productId,
  });
}

// ============================================================
// Payments Hooks
// ============================================================

export function usePayments(params?: PaymentFilters) {
  return useQuery({
    queryKey: ["payments", params],
    queryFn: () => paymentsApi.list(params),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ["payments", id],
    queryFn: () => paymentsApi.get(id),
    enabled: !!id,
  });
}

export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentsApi.initiate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentsApi.verify,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      paymentsApi.refund(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

// ============================================================
// Conversations Hooks
// ============================================================

export function useConversations(params?: ConversationFilters) {
  return useQuery({
    queryKey: ["conversations", params],
    queryFn: () => conversationsApi.list(params),
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ["conversations", id],
    queryFn: () => conversationsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: conversationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: conversationsApi.send,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.conversationId] });
    },
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      conversationsApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.id] });
    },
  });
}

// ============================================================
// Analytics Hooks
// ============================================================

export function useAnalyticsOverview(period?: string) {
  return useQuery({
    queryKey: ["analytics", "overview", period],
    queryFn: () => analyticsApi.overview(period),
  });
}

export function useAnalyticsRevenue(days?: number) {
  return useQuery({
    queryKey: ["analytics", "revenue", days],
    queryFn: () => analyticsApi.revenue(days),
  });
}

export function useAnalyticsOrders(days?: number) {
  return useQuery({
    queryKey: ["analytics", "orders", days],
    queryFn: () => analyticsApi.orders(days),
  });
}

export function useAnalyticsTopProducts(limit?: number) {
  return useQuery({
    queryKey: ["analytics", "top-products", limit],
    queryFn: () => analyticsApi.topProducts(limit),
  });
}

export function useAnalyticsCustomers() {
  return useQuery({
    queryKey: ["analytics", "customers"],
    queryFn: analyticsApi.customers,
  });
}

export function useAnalyticsFulfillment() {
  return useQuery({
    queryKey: ["analytics", "fulfillment"],
    queryFn: analyticsApi.fulfillment,
  });
}

// ============================================================
// Business Hooks
// ============================================================

export function useBusiness() {
  return useQuery({
    queryKey: ["business"],
    queryFn: businessApi.get,
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: businessApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: businessApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
}

export function useBusinessMembers() {
  return useQuery({
    queryKey: ["business", "members"],
    queryFn: businessApi.getMembers,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role?: string }) =>
      businessApi.inviteMember(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business", "members"] });
    },
  });
}
