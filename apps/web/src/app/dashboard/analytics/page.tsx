"use client";

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
import { DashboardLayout, useDashboardHeader } from "@/components/layout/dashboard-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  useAnalyticsOverview,
  useAnalyticsRevenue,
  useAnalyticsTopProducts,
  useAnalyticsCustomers,
} from "@/hooks/use-api";
import { Calendar, Download, TrendingUp, TrendingDown } from "lucide-react";

export default function AnalyticsPage() {
  const { data: overviewData, isLoading: overviewLoading } = useAnalyticsOverview("30d");
  const { data: revenueData, isLoading: revenueLoading } = useAnalyticsRevenue(30);
  const { data: topProductsData, isLoading: topProductsLoading } = useAnalyticsTopProducts(5);
  const { data: customersData, isLoading: customersLoading } = useAnalyticsCustomers();

  const overview = overviewData?.data;
  const revenueChart = revenueData?.data || [];
  const topProducts = topProductsData?.data || [];
  const customerStats = customersData?.data;

  // Calculate max revenue for chart scaling
  const maxRevenue = Math.max(...revenueChart.map((d: any) => d.revenue), 1);

  return (
    <DashboardLayout
      title="Analytics"
      description="Business intelligence and insights"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 days
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      }
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="h-8 skeleton rounded w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(Number(overview?.revenue || 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.paidOrders || 0} paid orders
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="h-8 skeleton rounded w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.totalOrders || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.conversionRate?.toFixed(1) || 0}% conversion rate
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Order Value
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="h-8 skeleton rounded w-28" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(Number(overview?.averageOrderValue || 0))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Customers
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="h-8 skeleton rounded w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {formatNumber(overview?.uniqueCustomers || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="h-64 skeleton rounded" />
            ) : revenueChart.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No revenue data yet
              </div>
            ) : (
              <div className="h-64 flex items-end gap-1">
                {revenueChart.map((data: any) => (
                  <div key={data.date} className="flex-1 flex flex-col items-center min-w-0">
                    <div
                      className="w-full bg-primary rounded-t transition-all duration-300"
                      style={{
                        height: `${Math.max((data.revenue / maxRevenue) * 100, 2)}%`,
                        minHeight: "4px",
                      }}
                      title={`${data.date}: ${formatCurrency(data.revenue)}`}
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                      {new Date(data.date).toLocaleDateString("en-NG", { day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 skeleton rounded" />
                ))}
              </div>
            ) : !customerStats?.segments ? (
              <div className="text-center py-8 text-muted-foreground">
                No customer data yet
              </div>
            ) : (
              <div className="space-y-4">
                {customerStats.segments.map((segment: any) => (
                  <div key={segment.segment} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          segment.segment === "VIP"
                            ? "bg-purple-100 text-purple-800"
                            : segment.segment === "HIGH_VALUE"
                            ? "bg-blue-100 text-blue-800"
                            : segment.segment === "NEW"
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {segment.segment}
                      </Badge>
                    </div>
                    <span className="font-medium">{segment.count}</span>
                  </div>
                ))}

                {customerStats.newCustomersThisMonth > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {customerStats.newCustomersThisMonth} new customers this month
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 skeleton rounded" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No product data yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((item: any, index: number) => (
                    <TableRow key={item.product?.id || index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">#{index + 1}</span>
                          {item.product?.name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>{item.totalSold || 0}</TableCell>
                      <TableCell>{formatCurrency(Number(item.totalRevenue || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Repeat Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Repeat Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 skeleton rounded" />
                ))}
              </div>
            ) : !customerStats?.repeatCustomers?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No repeat customers yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Total Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerStats.repeatCustomers.map((customer: any) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {customer.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </span>
                          </div>
                          {customer.name}
                        </div>
                      </TableCell>
                      <TableCell>{customer.orderCount}</TableCell>
                      <TableCell>{formatCurrency(Number(customer.totalSpend))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
