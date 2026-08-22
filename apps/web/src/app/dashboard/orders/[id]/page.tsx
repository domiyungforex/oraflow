"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { formatCurrency, getStatusColor, formatDateTime } from "@/lib/utils";
import {
  useOrder,
  useUpdateOrderStatus,
  useInitiatePayment,
  useVerifyPayment,
  useRefundPayment,
  useDeleteOrder,
} from "@/hooks/use-api";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  User,
  FileText,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Send,
} from "lucide-react";
import Link from "next/link";

// Status flow configuration
const statusFlow: Record<string, { next: string[]; label: string; color: string }> = {
  DRAFT: { next: ["PENDING_CONFIRMATION", "CANCELLED"], label: "Draft", color: "bg-gray-100 text-gray-800" },
  PENDING_CONFIRMATION: { next: ["PENDING_PAYMENT", "CANCELLED"], label: "Pending Confirmation", color: "bg-yellow-100 text-yellow-800" },
  PENDING_PAYMENT: { next: ["PAID", "CANCELLED"], label: "Pending Payment", color: "bg-orange-100 text-orange-800" },
  PAID: { next: ["PROCESSING", "CANCELLED", "REFUNDED"], label: "Paid", color: "bg-green-100 text-green-800" },
  PROCESSING: { next: ["READY_FOR_FULFILLMENT", "CANCELLED"], label: "Processing", color: "bg-blue-100 text-blue-800" },
  READY_FOR_FULFILLMENT: { next: ["OUT_FOR_DELIVERY", "CANCELLED"], label: "Ready for Fulfillment", color: "bg-indigo-100 text-indigo-800" },
  OUT_FOR_DELIVERY: { next: ["COMPLETED", "FAILED"], label: "Out for Delivery", color: "bg-purple-100 text-purple-800" },
  COMPLETED: { next: ["REFUNDED"], label: "Completed", color: "bg-green-100 text-green-800" },
  CANCELLED: { next: [], label: "Cancelled", color: "bg-red-100 text-red-800" },
  REFUNDED: { next: [], label: "Refunded", color: "bg-gray-100 text-gray-800" },
  FAILED: { next: ["PENDING_PAYMENT", "CANCELLED"], label: "Failed", color: "bg-red-100 text-red-800" },
};

const paymentStatusColors: Record<string, string> = {
  UNPAID: "bg-orange-100 text-orange-800",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  REFUNDED: "bg-gray-100 text-gray-800",
  FAILED: "bg-red-100 text-red-800",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: orderData, isLoading, refetch } = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const initiatePayment = useInitiatePayment();
  const verifyPayment = useVerifyPayment();
  const refundPayment = useRefundPayment();
  const deleteOrder = useDeleteOrder();

  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState("");
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const order = orderData?.data;

  if (isLoading) {
    return (
      <DashboardLayout title="Order Details" description="Loading...">
        <div className="space-y-4">
          <div className="h-32 skeleton rounded-lg" />
          <div className="h-64 skeleton rounded-lg" />
          <div className="h-48 skeleton rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Order Details" description="Order not found">
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg mb-2">Order not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            The order you're looking for doesn't exist or you don't have access.
          </p>
          <Link href="/dashboard/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const currentStatus = statusFlow[order.status] || statusFlow.DRAFT;
  const validNextStatuses = currentStatus.next;

  const handleStatusUpdate = async () => {
    if (!selectedStatus) return;

    setActionLoading(true);
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        status: selectedStatus,
        reason: statusReason || undefined,
      });
      setShowStatusDialog(false);
      setSelectedStatus("");
      setStatusReason("");
      refetch();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!paymentEmail) return;

    setActionLoading(true);
    try {
      await initiatePayment.mutateAsync({
        orderId,
        email: paymentEmail,
        amount: Number(order.totalAmount),
      });
      setShowPaymentDialog(false);
      setPaymentEmail("");
      refetch();
    } catch (error) {
      console.error("Failed to initiate payment:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    setActionLoading(true);
    try {
      const payment = order.payments?.[0];
      if (payment) {
        await refundPayment.mutateAsync({
          id: payment.id,
          reason: refundReason || undefined,
        });
        setShowRefundDialog(false);
        setRefundReason("");
        refetch();
      }
    } catch (error) {
      console.error("Failed to refund:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }

    setActionLoading(true);
    try {
      await deleteOrder.mutateAsync(orderId);
      router.push("/dashboard/orders");
    } catch (error) {
      console.error("Failed to delete order:", error);
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout
      title={`Order ${order.orderNumber}`}
      description={`Created ${formatDateTime(order.createdAt)}`}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/dashboard/orders">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Banner */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-lg ${currentStatus.color}`}>
                    <span className="font-semibold">{currentStatus.label}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <Badge className={paymentStatusColors[order.paymentStatus]}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <Badge variant="secondary">{order.source}</Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {validNextStatuses.length > 0 && (
                    <Button onClick={() => setShowStatusDialog(true)}>
                      Update Status
                    </Button>
                  )}
                  {order.status === "DRAFT" && (
                    <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product?.name || "Unknown Product"}</p>
                          <p className="text-sm text-muted-foreground">{item.product?.unit}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.product?.sku || "—"}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(Number(item.unitPrice))}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(item.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Order Totals */}
              <div className="border-t p-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(Number(order.subtotal))}</span>
                    </div>
                    {Number(order.taxAmount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(Number(order.taxAmount))}</span>
                      </div>
                    )}
                    {Number(order.deliveryFee) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery Fee</span>
                        <span>{formatCurrency(Number(order.deliveryFee))}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(Number(order.totalAmount))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment History
                </CardTitle>
                {order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED" && (
                  <Button size="sm" onClick={() => setShowPaymentDialog(true)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Initiate Payment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {order.payments?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No payments yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.payments?.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">{payment.reference}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(Number(payment.amount))}</TableCell>
                        <TableCell><Badge variant="secondary">{payment.provider}</Badge></TableCell>
                        <TableCell>
                          <Badge className={paymentStatusColors[payment.status]}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.paidAt
                            ? formatDateTime(payment.paidAt)
                            : formatDateTime(payment.createdAt)}
                        </TableCell>
                        <TableCell>
                          {payment.status === "SUCCESS" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowRefundDialog(true)}
                            >
                              Refund
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.customer ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{order.customer.name}</p>
                  </div>
                  {order.customer.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{order.customer.phone}</p>
                    </div>
                  )}
                  {order.customer.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{order.customer.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="font-medium">{order.customer.orderCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spend</p>
                    <p className="font-medium">{formatCurrency(Number(order.customer.totalSpend || 0))}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No customer assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-medium font-mono">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDateTime(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{formatDateTime(order.updatedAt)}</p>
              </div>
              {order.confirmedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="font-medium">{formatDateTime(order.confirmedAt)}</p>
                </div>
              )}
              {order.paidAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="font-medium">{formatDateTime(order.paidAt)}</p>
                </div>
              )}
              {order.fulfilledAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Fulfilled</p>
                  <p className="font-medium">{formatDateTime(order.fulfilledAt)}</p>
                </div>
              )}
              {order.cancelledAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="font-medium">{formatDateTime(order.cancelledAt)}</p>
                </div>
              )}
              {order.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
              {order.cancelReason && (
                <div>
                  <p className="text-sm text-muted-foreground">Cancel Reason</p>
                  <p className="text-sm text-red-600">{order.cancelReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Info */}
          {order.delivery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{order.delivery.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-sm">{order.delivery.address}</p>
                </div>
                {order.delivery.recipientName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Recipient</p>
                    <p className="font-medium">{order.delivery.recipientName}</p>
                  </div>
                )}
                {order.delivery.driverName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Driver</p>
                    <p className="font-medium">{order.delivery.driverName}</p>
                  </div>
                )}
                {order.delivery.estimatedDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                    <p className="font-medium">
                      {new Date(order.delivery.estimatedDate).toLocaleDateString("en-NG", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.auditLogs?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {order.auditLogs?.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{log.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Update Dialog */}
      {showStatusDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Update Order Status</CardTitle>
              <CardDescription>
                Current status: <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {validNextStatuses.map((status) => (
                    <Button
                      key={status}
                      variant={selectedStatus === status ? "default" : "outline"}
                      onClick={() => setSelectedStatus(status)}
                      className="justify-start"
                    >
                      {statusFlow[status]?.label || status}
                    </Button>
                  ))}
                </div>
              </div>

              {(selectedStatus === "CANCELLED" || selectedStatus === "REFUNDED") && (
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (optional)</Label>
                  <Input
                    id="reason"
                    placeholder="Enter reason..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || actionLoading}
                >
                  {actionLoading ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Initiate Payment</CardTitle>
              <CardDescription>
                Send a payment request for {formatCurrency(Number(order.totalAmount))}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Customer Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@email.com"
                  value={paymentEmail}
                  onChange={(e) => setPaymentEmail(e.target.value)}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span>Amount:</span>
                  <span className="font-semibold">{formatCurrency(Number(order.totalAmount))}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Provider:</span>
                  <span>Paystack</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiatePayment}
                  disabled={!paymentEmail || actionLoading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {actionLoading ? "Sending..." : "Send Payment Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refund Dialog */}
      {showRefundDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Process Refund</CardTitle>
              <CardDescription>
                This will refund the payment and update the order status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Warning</span>
                </div>
                <p className="text-sm text-red-600">
                  This action cannot be undone. The customer will be refunded the full amount.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refundReason">Reason (optional)</Label>
                <Input
                  id="refundReason"
                  placeholder="Enter reason for refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRefund}
                  disabled={actionLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {actionLoading ? "Processing..." : "Process Refund"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
