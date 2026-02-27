import { useState } from 'react';
import { useUserOrders, useCancelOrder } from '@/lib/api/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Calendar, MapPin, DollarSign, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { Order } from '@/types';

interface OrderWithEvent extends Order {
  event?: {
    id: string;
    title: string;
    status: string;
    orderDeadline: string;
    deliveryLocation: string;
    restaurant?: {
      name: string;
    };
  };
}

const Orders = () => {
  const { data: orders = [], isLoading } = useUserOrders();
  const { mutate: cancelOrder } = useCancelOrder();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithEvent | null>(null);

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-500';
      case 'CLOSED':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-blue-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const canCancelOrder = (order: OrderWithEvent) => {
    return order.event?.status === 'OPEN';
  };

  const handleCancelOrder = (order: OrderWithEvent) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrder({
        eventId: order.eventId,
        orderId: order.id,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <div className="text-sm text-slate-600">
          Total Orders: <span className="font-semibold">{orders.length}</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">No orders yet</p>
            <p className="text-sm text-gray-400">
              Join an event and place your first order!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((order: OrderWithEvent) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {order.event?.title || 'Event'}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Badge className={getEventStatusColor(order.event?.status || '')}>
                        {order.event?.status}
                      </Badge>
                      <span>•</span>
                      <Clock className="w-4 h-4" />
                      <span>{format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  {order.paymentConfirmed && (
                    <Badge variant="success" className="ml-2">
                      Paid
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 text-slate-600" />
                    <div>
                      <div className="font-medium">Delivery Location</div>
                      <div className="text-slate-600">
                        {order.event?.deliveryLocation || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 mt-0.5 text-slate-600" />
                    <div>
                      <div className="font-medium">Order Deadline</div>
                      <div className="text-slate-600">
                        {order.event?.orderDeadline
                          ? format(new Date(order.event.orderDeadline), 'MMM d, h:mm a')
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {order.event?.restaurant && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="w-4 h-4 text-slate-600" />
                    <span className="font-medium">Restaurant:</span>
                    <span className="text-slate-600">{order.event.restaurant.name}</span>
                  </div>
                )}

                {/* Order Details */}
                <div className="border-t pt-4">
                  <div className="font-medium mb-2">Order Details:</div>
                  {order.orderItems && order.orderItems.length > 0 ? (
                    <div className="space-y-2">
                      {order.orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded"
                        >
                          <div>
                            <span className="font-medium">{item.menuItem?.name || 'Item'}</span>
                            <span className="text-slate-600"> × {item.quantity}</span>
                          </div>
                          <span className="font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : order.customOrder ? (
                    <div className="text-sm bg-slate-50 p-3 rounded">
                      <div className="font-medium mb-1">Custom Order:</div>
                      <p className="text-slate-600 whitespace-pre-wrap">{order.customOrder}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No order details available</p>
                  )}

                  {order.totalAmount !== null && order.totalAmount !== undefined && (
                    <div className="flex justify-between items-center mt-4 pt-3 border-t font-semibold">
                      <span className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Total Amount:
                      </span>
                      <span className="text-lg">${order.totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  {canCancelOrder(order) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelOrder(order)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Modal - Simple version for now */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedOrder(null)} />
          <div className="relative z-50 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Order Details</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedOrder(null)}
                className="rounded-sm opacity-70 hover:opacity-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">{selectedOrder.event?.title}</h3>
                <p className="text-sm text-slate-600">
                  {selectedOrder.event?.restaurant?.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className={`ml-2 ${getEventStatusColor(selectedOrder.event?.status || '')}`}>
                    {selectedOrder.event?.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Payment:</span>
                  <Badge className="ml-2" variant={selectedOrder.paymentConfirmed ? 'success' : 'outline'}>
                    {selectedOrder.paymentConfirmed ? 'Confirmed' : 'Pending'}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Items:</h4>
                {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between bg-slate-50 p-3 rounded">
                        <div>
                          <div className="font-medium">{item.menuItem?.name}</div>
                          {item.menuItem?.description && (
                            <div className="text-sm text-slate-600">{item.menuItem.description}</div>
                          )}
                          <div className="text-sm text-slate-600">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </div>
                        </div>
                        <div className="font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedOrder.customOrder ? (
                  <div className="bg-slate-50 p-3 rounded">
                    <p className="whitespace-pre-wrap">{selectedOrder.customOrder}</p>
                  </div>
                ) : null}

                {selectedOrder.totalAmount !== null && selectedOrder.totalAmount !== undefined && (
                  <div className="flex justify-between items-center mt-4 pt-3 border-t text-lg font-bold">
                    <span>Total:</span>
                    <span>${selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Button onClick={() => setSelectedOrder(null)} className="w-full mt-4">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
