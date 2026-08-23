import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-NG").format(num);
}

export function generateOrderNumber(businessId: string, sequence: number): string {
  return `ORD-${String(sequence).padStart(4, "0")}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    PENDING_CONFIRMATION: "bg-yellow-100 text-yellow-800",
    PENDING_PAYMENT: "bg-orange-100 text-orange-800",
    PAID: "bg-green-100 text-green-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    READY_FOR_FULFILLMENT: "bg-indigo-100 text-indigo-800",
    OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-gray-100 text-gray-800",
    FAILED: "bg-red-100 text-red-800",
    UNPAID: "bg-orange-100 text-orange-800",
    PARTIALLY_PAID: "bg-yellow-100 text-yellow-800",
    PENDING: "bg-gray-100 text-gray-800",
    ASSIGNED: "bg-blue-100 text-blue-800",
    PICKED_UP: "bg-indigo-100 text-indigo-800",
    IN_TRANSIT: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
