import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useCreateOrder, useMenuItems } from '@/lib/api/hooks';

interface OrderModalProps {
  event: any;
  onClose: () => void;
}

interface OrderItem {
  menuItemId?: string;
  customItem?: string;
  quantity: number;
  price: number;
}

export function OrderModal({ event, onClose }: OrderModalProps) {
  const { mutateAsync: createOrder } = useCreateOrder();
  const { data: menuItems = [] } = useMenuItems(event.restaurantId);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customOrder, setCustomOrder] = useState('');
  const [notes, setNotes] = useState('');

  const addMenuItem = (menuItem: any) => {
    const existing = orderItems.find((item) => item.menuItemId === menuItem.id);
    if (existing) {
      setOrderItems(
        orderItems.map((item) =>
          item.menuItemId === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          menuItemId: menuItem.id,
          quantity: 1,
          price: menuItem.price,
        },
      ]);
    }
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setOrderItems((items) =>
      items
        .map((item) =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (event.restaurant?.hasMenu) {
        // Menu-based order
        await createOrder({
          eventId: event.id,
          orderItems: orderItems.map((item) => ({
            menuItemId: item.menuItemId!,
            quantity: item.quantity,
            price: item.price,
          })),
          notes,
          totalAmount,
        });
      } else {
        // Custom order
        await createOrder({
          eventId: event.id,
          customOrder,
          notes,
          totalAmount: 0, // Will be updated later
        });
      }
      onClose();
    } catch {
      // Error handled by TanStack Query
    }
  };

  // Group menu items by category
  const groupedItems = menuItems.reduce((acc: any, item: any) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-4xl mx-4 my-8 bg-white rounded-lg shadow-lg">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold">{event.title}</h2>
            <p className="text-sm text-gray-600">{event.restaurant?.name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-sm opacity-70 hover:opacity-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {event.restaurant?.hasMenu ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Menu</h3>
                  {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
                    <div key={category}>
                      <h4 className="font-medium text-gray-700 mb-2">{category}</h4>
                      <div className="space-y-2">
                        {items.map((item: any) => (
                          <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h5 className="font-medium">{item.name}</h5>
                                {item.description && (
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                )}
                                <p className="text-sm font-semibold text-gray-900 mt-1">
                                  ${item.price.toFixed(2)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => addMenuItem(item)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="sticky top-20">
                    <h3 className="font-semibold text-lg mb-4">Your Order</h3>
                    {orderItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No items added yet</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 mb-4">
                          {orderItems.map((orderItem) => {
                            const menuItem = menuItems.find((m: any) => m.id === orderItem.menuItemId);
                            return (
                              <Card key={orderItem.menuItemId} className="p-3">
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <p className="font-medium">{menuItem?.name}</p>
                                    <p className="text-sm text-gray-600">
                                      ${orderItem.price.toFixed(2)} each
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateQuantity(orderItem.menuItemId!, -1)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center">{orderItem.quantity}</span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateQuantity(orderItem.menuItemId!, 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="text-right mt-2 font-semibold">
                                  ${(orderItem.price * orderItem.quantity).toFixed(2)}
                                </div>
                              </Card>
                            );
                          })}
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center text-lg font-bold">
                            <span>Total</span>
                            <span>${totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="mt-4">
                      <label htmlFor="notes" className="text-sm font-medium block mb-1">
                        Special Instructions (Optional)
                      </label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any special requests or dietary restrictions..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={orderItems.length === 0} className="flex-1">
                        Place Order
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="customOrder" className="text-sm font-medium block mb-1">
                    Your Order
                  </label>
                  <Textarea
                    id="customOrder"
                    value={customOrder}
                    onChange={(e) => setCustomOrder(e.target.value)}
                    placeholder="Describe what you'd like to order..."
                    rows={6}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="text-sm font-medium block mb-1">
                    Special Instructions (Optional)
                  </label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Place Order
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Participants section */}
        <div className="border-t px-6 py-4">
          <h3 className="font-semibold mb-3">Participants ({event.participants?.length || 0})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {event.participants?.map((participant: any) => (
              <div key={participant.id} className="text-sm text-gray-700">
                {participant.user?.name || participant.user?.email}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
