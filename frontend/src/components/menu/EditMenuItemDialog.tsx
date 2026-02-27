import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateMenuItem } from '@/lib/api/hooks';
import { MenuItem } from '@/types';
import { Edit } from 'lucide-react';

interface EditMenuItemDialogProps {
  restaurantId: string;
  menuItem: MenuItem;
}

export function EditMenuItemDialog({ restaurantId, menuItem }: EditMenuItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: updateMenuItem, isPending } = useUpdateMenuItem();
  
  const [formData, setFormData] = useState({
    name: menuItem.name,
    description: menuItem.description || '',
    price: menuItem.price.toString(),
    category: menuItem.category,
    available: menuItem.available,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: menuItem.name,
        description: menuItem.description || '',
        price: menuItem.price.toString(),
        category: menuItem.category,
        available: menuItem.available,
      });
    }
  }, [isOpen, menuItem]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateMenuItem({
        restaurantId,
        itemId: menuItem.id,
        data: {
          ...formData,
          price: parseFloat(formData.price),
        },
      });
      setIsOpen(false);
    } catch {
      // Error handled by TanStack Query
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
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Margherita Pizza"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Fresh mozzarella, tomato sauce, basil"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price ($)</label>
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="12.99"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Pizza, Pasta, Salad..."
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="available"
                name="available"
                checked={formData.available}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="available" className="text-sm font-medium">
                Available for ordering
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Updating...' : 'Update Menu Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
