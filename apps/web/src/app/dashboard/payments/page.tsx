"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout, useDashboardHeader } from "@/components/layout/dashboard-layout";
import { formatCurrency } from "@/lib/utils";
import { usePayments } from "@/hooks/use-api";
import { Search, Filter, Download, CreditCard, TrendingUp, Clock, AlertCircle } from "lucide-react";

export default function PaymentsPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);

  const setHeader = useDashboardHeader();
  useEffect(() => {
    setHeader({
      title: "Payments",
      description: "Track and manage payment transactions",
    });
    return () => setHeader({ title: undefined, description: undefined });
  }, [setHeader]);
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePayments({ page, limit: 20, status });
  const payments = data?.data || [];
  const pagination = data?.pagination;

  // Calculate stats from payments
  const totalRevenue = payments
    .filter((p: any) => p.status === "SUCCESS")
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const pendingAmount = payments
    .filter((p: any) => p.status === "PENDING")
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const failedAmount = payments
    .filter((p: any) => p.status === "FAILED")
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const refundedAmount = payments
    .filter((p: any) => p.status === "REFUNDED")
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      change: `${payments.filter((p: any) => p.status === "SUCCESS").length} transactions`,
      trend: "up",
    },
    {
      title: "Pending",
      value: formatCurrency(pendingAmount),
      icon: Clock,
      change: `${payments.filter((p: any) => p.status === "PENDING").length} transactions`,
      trend: "neutral",
    },
    {
      title: "Failed",
      value: formatCurrency(failedAmount),
      icon: AlertCircle,
      change: `${payments.filter((p: any) => p.status === "FAILED").length} transactions`,
      trend: "neutral",
    },
    {
      title: "Refunded",
      value: formatCurrency(refundedAmount),
      icon: CreditCard,
      change: `${payments.filter((p: any) => p.status === "REFUNDED").length} transactions`,
      trend: "neutral",
    },
  ];

  return (
    <DashboardLayout
      title="Payments"
      description="Track and manage payment transactions"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.trend === "up" ? "text-green-600" : "text-muted-foreground"}`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { label: "All", value: undefined },
          { label: "Pending", value: "PENDING" },
          { label: "Success", value: "SUCCESS" },
          { label: "Failed", value: "FAILED" },
          { label: "Refunded", value: "REFUNDED" },
        ].map((filter) => (
          <Button
            key={filter.label}
            variant={status === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 skeleton rounded" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-lg mb-2">No payments found</p>
              <p className="text-sm">
                Payments will appear here after customers complete orders
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.reference}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/dashboard/orders/${payment.orderId}`}
                        className="hover:underline"
                      >
                        {payment.order?.orderNumber || payment.orderId?.slice(0, 8)}
                      </a>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(payment.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{payment.provider}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "SUCCESS"
                            ? "success"
                            : payment.status === "PENDING"
                            ? "warning"
                            : payment.status === "REFUNDED"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        •••
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, pagination.total)} of{" "}
            {pagination.total} payments
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
