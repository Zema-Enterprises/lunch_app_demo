import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Calendar, MapPin, Clock, DollarSign, Users, ShoppingCart, CheckCircle, Check, Truck } from 'lucide-react';
import { Event } from '@/types';
import { format } from 'date-fns';
import { useEvent, useConfirmPayment } from '@/lib/api/hooks';
import { useFocusTrap, useEscapeKey } from '@/hooks/useAccessibility';
import { useAuthStore } from '@/store/authStore';

interface EventDetailsModalProps {
  event: Event;
  onClose: () => void;
}

export function EventDetailsModal({ event: initialEvent, onClose }: EventDetailsModalProps) {
  // Fetch the full event data with orders
  const { data: fullEvent, isLoading } = useEvent(initialEvent.id);
  const { user } = useAuthStore();
  const confirmPayment = useConfirmPayment();

  // Use full event data if available, otherwise fall back to initial event
  const event = fullEvent || initialEvent;

  // Check permissions for payment confirmation
  const isCreator = event.createdById === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const isActiveEvent = event.status !== 'COMPLETED' && event.status !== 'CANCELLED';
  const canConfirmOrderPayment = (order: { userId: string }) => {
    if (!isActiveEvent) return false;
    if (event.paymentMethod === 'EVENT_CREATOR') return isCreator || isAdmin;
    return order.userId === user?.id; // INDIVIDUAL / COMPANY_EXPENSE: own order only
  };

  // Accessibility hooks
  const modalRef = useFocusTrap(true);
  useEscapeKey(onClose);

  const handleConfirmPayment = (orderId: string) => {
    confirmPayment.mutate({ eventId: event.id, orderId });
  };
  
  const getStatusVariant = (status: string): 'success' | 'secondary' | 'default' | 'destructive' => {
    switch (status) {
      case 'OPEN': return 'success';
      case 'CLOSED': return 'secondary';
      case 'COMPLETED': return 'default';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'EVENT_CREATOR':
        return 'Creator Pays';
      case 'INDIVIDUAL':
        return 'Individual';
      case 'COMPANY_EXPENSE':
        return 'Company Expense';
      default:
        return method;
    }
  };

  // Calculate order statistics
  const totalOrders = event.orders?.length || 0;
  const totalAmount = event.orders?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) || 0;
  const confirmedPayments = event.orders?.filter(order => order.paymentConfirmed).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        ref={modalRef}
        className="relative z-50 w-full max-w-4xl mx-4 bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 id="event-modal-title" className="text-2xl font-semibold">{event.title}</h2>
              <Badge variant={getStatusVariant(event.status)}>{event.status}</Badge>
              {event.deliveredAt && (
                <Badge className="bg-blue-500 text-white">
                  <Truck className="w-3 h-3 mr-1" />
                  Delivered
                </Badge>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-gray-600">{event.description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="p-6">
          {/* Event Details Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Restaurant</div>
                    <div className="text-sm text-gray-900">
                      {event.restaurant?.name || 'N/A'}
                      {event.restaurant?.cuisine && (
                        <span className="text-gray-500"> • {event.restaurant.cuisine}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Delivery Location</div>
                    <div className="text-sm text-gray-900">{event.deliveryLocation}</div>
                  </div>
                </div>

                <div className="flex items-start">
                  <Clock className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Order Deadline</div>
                    <div className="text-sm text-gray-900">
                      {format(new Date(event.orderDeadline), 'MMM d, yyyy • h:mm a')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start">
                  <DollarSign className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Payment Method</div>
                    <div className="text-sm text-gray-900">
                      {getPaymentMethodLabel(event.paymentMethod)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <Users className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Participants</div>
                    <div className="text-sm text-gray-900">
                      {event.participants?.length || 0} participant(s)
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <ShoppingCart className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Created By</div>
                    <div className="text-sm text-gray-900">
                      {event.createdBy?.name || 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Statistics */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading order data...
              </div>
            ) : totalOrders > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Total Amount</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {confirmedPayments}/{totalOrders}
                  </div>
                  <div className="text-sm text-gray-600">Confirmed Payments</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No orders yet for this event
              </div>
            )}
          </div>

          {/* Participants List */}
          {event.participants && event.participants.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Participants</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {event.participants.map((participant) => {
                  const participantOrder = event.orders?.find(
                    (order) => order.userId === participant.userId
                  );
                  
                  return (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                          {participant.user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {participant.user?.name || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Joined {format(new Date(participant.joinedAt), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      </div>
                      {participantOrder ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Ordered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          No order
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Orders List */}
          {event.orders && event.orders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Orders</h3>
              <div className="space-y-4">
                {event.orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {order.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Ordered {format(new Date(order.createdAt), 'MMM d, h:mm a')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.paymentConfirmed ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                              Pending
                            </Badge>
                            {canConfirmOrderPayment(order) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConfirmPayment(order.id)}
                                disabled={confirmPayment.isPending}
                                className="h-7 text-green-700 border-green-300 hover:bg-green-50"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                {confirmPayment.isPending ? 'Confirming...' : 'Confirm Paid'}
                              </Button>
                            )}
                          </>
                        )}
                        <div className="font-semibold text-gray-900">
                          ${order.totalAmount?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    {order.orderItems && order.orderItems.length > 0 ? (
                      <div className="space-y-2">
                        {order.orderItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm text-gray-700 bg-gray-50 p-2 rounded"
                          >
                            <div>
                              <span className="font-medium">{item.menuItem?.name || 'Unknown Item'}</span>
                              {item.menuItem?.description && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.menuItem.description}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div>× {item.quantity}</div>
                              <div className="text-xs text-gray-600">
                                ${item.price.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : order.customOrder ? (
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        <div className="font-medium mb-1">Custom Order:</div>
                        <div>{order.customOrder}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">No order details</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!event.orders || event.orders.length === 0) && (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No orders yet</h3>
              <p className="text-sm text-gray-600">
                {event.status === 'OPEN'
                  ? 'Orders will appear here once participants start ordering.'
                  : 'No orders were placed for this event.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
