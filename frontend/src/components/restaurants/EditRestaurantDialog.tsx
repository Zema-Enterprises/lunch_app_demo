import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useUpdateRestaurant } from '@/lib/api/hooks';
import { Restaurant } from '@/types';
import { Edit } from 'lucide-react';

interface EditRestaurantDialogProps {
  restaurant: Restaurant;
}

export function EditRestaurantDialog({ restaurant }: EditRestaurantDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: updateRestaurant, isPending } = useUpdateRestaurant();
  
  const [formData, setFormData] = useState({
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    openTime: restaurant.openTime,
    closeTime: restaurant.closeTime,
    deliveryTime: restaurant.deliveryTime,
    hasMenu: restaurant.hasMenu,
    imageUrl: restaurant.imageUrl || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        openTime: restaurant.openTime,
        closeTime: restaurant.closeTime,
        deliveryTime: restaurant.deliveryTime,
        hasMenu: restaurant.hasMenu,
        imageUrl: restaurant.imageUrl || '',
      });
    }
  }, [isOpen, restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateRestaurant({
        id: restaurant.id,
        data: formData,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update restaurant:', error);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        <Edit className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent onClose={() => setIsOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Pizza Palace"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cuisine</label>
              <Input
                name="cuisine"
                value={formData.cuisine}
                onChange={handleChange}
                placeholder="Italian"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Open Time</label>
                <Input
                  name="openTime"
                  type="time"
                  value={formData.openTime}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Close Time</label>
                <Input
                  name="closeTime"
                  type="time"
                  value={formData.closeTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Time</label>
              <Input
                name="deliveryTime"
                value={formData.deliveryTime}
                onChange={handleChange}
                placeholder="30-45 minutes"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL (optional)</label>
              <Input
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasMenu"
                name="hasMenu"
                checked={formData.hasMenu}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="hasMenu" className="text-sm font-medium">
                Restaurant has a menu
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Updating...' : 'Update Restaurant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
