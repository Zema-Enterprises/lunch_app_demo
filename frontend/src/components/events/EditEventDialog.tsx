import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useUpdateEvent, useRestaurants } from '@/lib/api/hooks';
import { X, Edit } from 'lucide-react';
import { Event } from '@/types';
import { format } from 'date-fns';

interface EditEventDialogProps {
  event: Event;
  onClose?: () => void;
}

export function EditEventDialog({ event, onClose }: EditEventDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: updateEvent } = useUpdateEvent();
  const { data: restaurants = [] } = useRestaurants();
  
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || '',
    restaurantId: event.restaurantId,
    deliveryLocation: event.deliveryLocation,
    orderDeadline: event.orderDeadline,
    paymentMethod: event.paymentMethod,
  });

  useEffect(() => {
    if (isOpen && event) {
      // Convert ISO date to datetime-local format
      const deadline = new Date(event.orderDeadline);
      const formattedDeadline = format(deadline, "yyyy-MM-dd'T'HH:mm");
      
      setFormData({
        title: event.title,
        description: event.description || '',
        restaurantId: event.restaurantId,
        deliveryLocation: event.deliveryLocation,
        orderDeadline: formattedDeadline,
        paymentMethod: event.paymentMethod,
      });
    }
  }, [isOpen, event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateEvent({
        eventId: event.id,
        data: {
          ...formData,
          orderDeadline: new Date(formData.orderDeadline).toISOString(),
        }
      });
      
      setIsOpen(false);
      onClose?.();
    } catch {
      // Error handled by TanStack Query
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        title="Edit Event"
        aria-label="Edit event"
      >
        <Edit className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        title="Edit Event"
        aria-label="Edit event"
      >
        <Edit className="h-4 w-4" />
      </Button>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-event-dialog-title"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            handleClose();
          }
        }}
      >
        <div
          className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 id="edit-event-dialog-title" className="text-xl font-semibold">
              Edit Event
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-sm opacity-70 hover:opacity-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
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
                id={`edit-event-restaurant-label-${event.id}`}
                className="text-sm font-medium block mb-1"
              >
                Restaurant
              </label>
              <Select
                id="restaurant"
                aria-labelledby={`edit-event-restaurant-label-${event.id}`}
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
                id={`edit-event-payment-label-${event.id}`}
                className="text-sm font-medium block mb-1"
              >
                Payment Method
              </label>
              <Select
                id="paymentMethod"
                aria-labelledby={`edit-event-payment-label-${event.id}`}
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              >
                <option value="EVENT_CREATOR">Event Creator Pays</option>
                <option value="INDIVIDUAL">Individual Pays</option>
                <option value="COMPANY_EXPENSE">Company Expense</option>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">Update Event</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
