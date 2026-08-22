"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { useOrders, useBusiness } from "@/hooks/use-api";
import Link from "next/link";

export default function DashboardOverview() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [hasBusiness, setHasBusiness] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real data
  const { data: businessData } = useBusiness();
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ limit: 5 });
  const { data: lowStockData } = useOrders({ limit: 10 });

  const orders = ordersData?.data || [];
  const business = businessData?.data;

  useEffect(() => {
    if (!isLoaded) return;

    const checkBusiness = async () => {
      try {
        const response = await fetch("/api/v1/auth/business", {
          headers: {
            Authorization: `Bearer ${await user?.getToken()}`,
          },
        });

        if (response.ok) {
          setHasBusiness(true);
        } else if (response.status === 403) {
          router.push("/onboarding");
          return;
        }
      } catch (error) {
        console.error("Failed to check business:", error);
        setHasBusiness(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkBusiness();
  }, [user, isLoaded, router]);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate stats from real orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((o: any) => new Date(o.createdAt) >= today);
  const todayRevenue = todayOrders
    .filter((o: any) => o.paymentStatus === "PAID")
    .reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);
  const pendingOrders = orders.filter((o: any) =>
    ["DRAFT", "PENDING_CONFIRMATION", "PENDING_PAYMENT"].includes(o.status)
  );
  const paidOrders = orders.filter((o: any) => o.paymentStatus === "PAID");

  const stats = [
    {
      title: "Today's Revenue",
      value: formatCurrency(todayRevenue),
      change: `${todayOrders.length} orders today`,
      trend: "up",
    },
    {
      title: "Orders Today",
      value: todayOrders.length.toString(),
      change: `of ${orders.length} total`,
      trend: "up",
    },
    {
      title: "Pending Orders",
      value: pendingOrders.length.toString(),
      change: "need attention",
      trend: pendingOrders.length > 0 ? "down" : "up",
    },
    {
      title: "Paid Orders",
      value: paidOrders.length.toString(),
      change: `₦${paidOrders.reduce((s: number, o: any) => s + Number(o.totalAmount), 0).toLocaleString()}`,
      trend: "up",
    },
  ];

  return (
    <DashboardLayout
      title="Overview"
      description={`Welcome back, ${user?.firstName || "there"}`}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <span
                className={`text-xs font-medium ${
                  stat.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.change}
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link href="/dashboard/orders">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 skeleton rounded" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders yet. Create your first order to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>{order.customer?.name || "—"}</TableCell>
                        <TableCell>{formatCurrency(Number(order.totalAmount))}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.source}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Info</CardTitle>
            </CardHeader>
            <CardContent>
              {business ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Business Name</p>
                    <p className="font-medium">{business.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{business.industry || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Currency</p>
                    <p className="font-medium">{business.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Products</p>
                    <p className="font-medium">{business._count?.products || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customers</p>
                    <p className="font-medium">{business._count?.customers || 0}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 skeleton rounded" />
                  ))}
                </div>
              )}
              <Link href="/dashboard/settings">
                <Button variant="outline" className="w-full mt-4">
                  View settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/dashboard/orders">
                <Button variant="outline" className="w-full justify-start">
                  📦 View Orders
                </Button>
              </Link>
              <Link href="/dashboard/products">
                <Button variant="outline" className="w-full justify-start">
                  🏷️ Products
                </Button>
              </Link>
              <Link href="/dashboard/customers">
                <Button variant="outline" className="w-full justify-start">
                  👥 Customers
                </Button>
              </Link>
              <Link href="/dashboard/conversations">
                <Button variant="outline" className="w-full justify-start">
                  💬 Messages
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
