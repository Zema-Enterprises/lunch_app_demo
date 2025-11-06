import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ShoppingBag, Pencil } from 'lucide-react';
import { useEventOrders } from '../../lib/api/hooks';
import { useNavigate } from 'react-router-dom';
import type { User, Event, Order as OrderType } from '../../types';

interface OrdersSectionProps {
  eventId: string;
  event: Event;
  user: User | null;
}

interface OrderCardProps {
  order: OrderType;
  canEdit: boolean;
  onEdit: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, canEdit, onEdit }) => {
  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-gray-900">{order.user?.name || 'Unknown User'}</p>
          <p className="text-xs text-gray-500">{order.user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {order.paymentConfirmed ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Paid
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
              Pending
            </Badge>
          )}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit Order
            </Button>
          )}
        </div>
      </div>

      {order.orderItems && order.orderItems.length > 0 ? (
        <div className="space-y-1 mb-3">
          {order.orderItems.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.quantity}x {item.menuItem?.name || 'Item'}
              </span>
              <span className="text-gray-600">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      ) : order.customOrder ? (
        <div className="mb-3">
          <p className="text-sm text-gray-600 italic">{order.customOrder}</p>
        </div>
      ) : null}

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-sm font-medium text-gray-700">Total</span>
        <span className="text-lg font-bold text-gray-900">
          ${(order.totalAmount || 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
};

const EmptyOrdersState: React.FC<{ isParticipant: boolean; eventId: string }> = ({ 
  isParticipant, 
  eventId 
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="text-center py-8">
      <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-500 mb-4">No orders yet</p>
      {isParticipant && (
        <Button 
          onClick={() => navigate(`/events/${eventId}/order`)}
          variant="outline"
        >
          Place Your Order
        </Button>
      )}
    </div>
  );
};

const OrdersSection: React.FC<OrdersSectionProps> = ({ eventId, event, user }) => {
  const navigate = useNavigate();
  const { data: orders, isLoading, isError } = useEventOrders(eventId);

  if (!user) return null;

  const isCreator = event.createdById === user.id;
  const isAdmin = user.role === 'ADMIN';
  const isParticipant = event.participants?.some((p) => p.userId === user.id) || false;
  const canSeeAllOrders = isCreator || isAdmin;
  const canEditOrder = event.status === 'OPEN';

  // Filter orders based on user role
  const displayedOrders = canSeeAllOrders 
    ? orders 
    : orders?.filter((order) => order.userId === user.id);

  const handleEditOrder = (orderId: string) => {
    navigate(`/events/${eventId}/orders/${orderId}/edit`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {canSeeAllOrders ? 'Orders' : 'Your Order'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            Loading orders...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {canSeeAllOrders ? 'Orders' : 'Your Order'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-600">
            Failed to load orders
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {canSeeAllOrders ? 'Orders' : 'Your Order'}
          </CardTitle>
          {displayedOrders && displayedOrders.length > 0 && (
            <Badge variant="outline">
              {displayedOrders.length} Order{displayedOrders.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!displayedOrders || displayedOrders.length === 0 ? (
          <EmptyOrdersState isParticipant={isParticipant} eventId={eventId} />
        ) : (
          <div className="space-y-3">
            {displayedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                canEdit={canEditOrder && order.userId === user.id}
                onEdit={() => handleEditOrder(order.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrdersSection;
