import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRestaurant, useMenuItems, useDeleteMenuItem, useToggleMenuItemAvailability } from '../lib/api/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { ArrowLeft, Trash2, DollarSign, Search } from 'lucide-react';
import { AddMenuItemDialog } from '../components/menu/AddMenuItemDialog';
import { EditMenuItemDialog } from '../components/menu/EditMenuItemDialog';
import { MenuItem } from '../types';

const MenuManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(id || '');
  const { data: menuItems = [], isLoading: menuItemsLoading } = useMenuItems(id || '');
  const { mutate: deleteMenuItem } = useDeleteMenuItem();
  const { mutate: toggleAvailability } = useToggleMenuItemAvailability();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((item: MenuItem) => item.category));
    return ['all', ...Array.from(cats)] as string[];
  }, [menuItems]);

  // Filter menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item: MenuItem) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, categoryFilter]);

  if (restaurantLoading || menuItemsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
        <Button onClick={() => navigate('/restaurants')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Restaurants
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/restaurants/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Menu Management</h1>
            <p className="text-gray-600">{restaurant.name}</p>
          </div>
        </div>
        <AddMenuItemDialog restaurantId={id || ''} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  size="sm"
                  variant={categoryFilter === category ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category === 'all' ? 'All Categories' : category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-1">No menu items found</h3>
            <p className="text-sm text-gray-600 mb-4">
              {searchQuery || categoryFilter !== 'all' 
                ? 'Try adjusting your filters.'
                : 'Add your first menu item to get started.'}
            </p>
            {!searchQuery && categoryFilter === 'all' && (
              <AddMenuItemDialog restaurantId={id || ''} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((item: MenuItem) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold truncate" title={item.name}>
                        {item.name}
                      </h3>
                      <Badge variant={item.available ? 'success' : 'outline'} className="flex-shrink-0">
                        {item.available ? 'Available' : 'Unavailable'}
                      </Badge>
                      <Badge variant="outline" className="flex-shrink-0">{item.category}</Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2" title={item.description}>
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center text-lg font-semibold text-gray-900">
                      <DollarSign className="w-5 h-5" />
                      {item.price.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant={item.available ? 'outline' : 'default'}
                      onClick={() => toggleAvailability({
                        restaurantId: id || '',
                        itemId: item.id,
                        available: !item.available,
                      })}
                    >
                      {item.available ? 'Disable' : 'Enable'}
                    </Button>
                    <EditMenuItemDialog restaurantId={id || ''} menuItem={item} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirmId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{menuItems.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {menuItems.filter((item: MenuItem) => item.available).length}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                {categories.length - 1}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative z-50 w-full max-w-md mx-4 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Delete Menu Item</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this menu item? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteMenuItem({
                    restaurantId: id || '',
                    itemId: deleteConfirmId,
                  });
                  setDeleteConfirmId(null);
                }}
              >
                Delete Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
