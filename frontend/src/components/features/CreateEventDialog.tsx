import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useCreateEvent, useRestaurants } from '@/lib/api/hooks';
import { Plus, X } from 'lucide-react';

type CreateEventDialogProps = {
  autoOpen?: boolean;
  onAutoOpenHandled?: () => void;
};

export function CreateEventDialog({ autoOpen = false, onAutoOpenHandled }: CreateEventDialogProps = {}) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const { mutateAsync: createEvent } = useCreateEvent();
  const { data: restaurants = [] } = useRestaurants();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    restaurantId: '',
    deliveryLocation: '',
    orderDeadline: '',
    paymentMethod: 'EVENT_CREATOR' as 'EVENT_CREATOR' | 'INDIVIDUAL' | 'COMPANY_EXPENSE',
  });

  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpen, onAutoOpenHandled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createEvent({
        ...formData,
        orderDeadline: new Date(formData.orderDeadline).toISOString(),
      });
      
      setFormData({
        title: '',
        description: '',
        restaurantId: '',
        deliveryLocation: '',
        orderDeadline: '',
        paymentMethod: 'EVENT_CREATOR',
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Event
      </Button>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 id="create-event-dialog-title" className="text-xl font-semibold">
                Create New Event
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="text-sm font-medium block mb-1">
                  Event Title
                </label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Team Lunch - Pizza Day"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="text-sm font-medium block mb-1">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Weekly team lunch gathering"
                  rows={3}
                />
              </div>

              <div>
                <label
                  htmlFor="restaurant"
                  id="create-event-restaurant-label"
                  className="text-sm font-medium block mb-1"
                >
                  Restaurant
                </label>
                <Select
                  id="restaurant"
                  aria-labelledby="create-event-restaurant-label"
                  value={formData.restaurantId}
                  onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value })}
                  required
                >
                  <option value="">Select a restaurant</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name} - {restaurant.cuisine}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="deliveryLocation" className="text-sm font-medium block mb-1">
                  Delivery Location
                </label>
                <Input
                  id="deliveryLocation"
                  value={formData.deliveryLocation}
                  onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                  placeholder="Office Conference Room A"
                  required
                />
              </div>

              <div>
                <label htmlFor="orderDeadline" className="text-sm font-medium block mb-1">
                  Order Deadline
                </label>
                <Input
                  id="orderDeadline"
                  type="datetime-local"
                  value={formData.orderDeadline}
                  onChange={(e) => setFormData({ ...formData, orderDeadline: e.target.value })}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="paymentMethod"
                  id="create-event-payment-label"
                  className="text-sm font-medium block mb-1"
                >
                  Payment Method
                </label>
                <Select
                  id="paymentMethod"
                  aria-labelledby="create-event-payment-label"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                >
                  <option value="EVENT_CREATOR">Event Creator Pays</option>
                  <option value="INDIVIDUAL">Individual Pays</option>
                  <option value="COMPANY_EXPENSE">Company Expense</option>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Event</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
