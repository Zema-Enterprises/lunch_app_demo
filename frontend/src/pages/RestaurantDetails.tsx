import { useParams, useNavigate } from 'react-router-dom';
import { useRestaurant, useMenuItems } from '@/lib/api/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, MapPin, Utensils, DollarSign, Package } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { EditRestaurantDialog } from '@/components/restaurants/EditRestaurantDialog';
import { MenuItem } from '@/types';
import { buildTenantPath } from '@/lib/api/tenant';

const RestaurantDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: restaurant, isLoading } = useRestaurant(id || '');
  const { data: menuItems = [] } = useMenuItems(id || '');

  if (isLoading) {
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
        <Button onClick={() => navigate(buildTenantPath('/restaurants'))}>
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
          <Button variant="outline" onClick={() => navigate(buildTenantPath('/restaurants'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
            <p className="text-gray-600">{restaurant.cuisine} Cuisine</p>
          </div>
        </div>
        {user?.role === 'ADMIN' && (
          <EditRestaurantDialog restaurant={restaurant} />
        )}
      </div>

      {/* Restaurant Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start">
              <Clock className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-700">Operating Hours</div>
                <div className="text-sm text-gray-900">
                  {restaurant.openTime} - {restaurant.closeTime}
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <MapPin className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-700">Delivery Time</div>
                <div className="text-sm text-gray-900">{restaurant.deliveryTime}</div>
              </div>
            </div>

            <div className="flex items-start">
              <Utensils className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-700">Cuisine Type</div>
                <div className="text-sm text-gray-900">{restaurant.cuisine}</div>
              </div>
            </div>

            <div className="flex items-start">
              <Package className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-700">Menu Status</div>
                <div className="text-sm text-gray-900">
                  {restaurant.hasMenu ? (
                    <Badge variant="success">Has Menu</Badge>
                  ) : (
                    <Badge variant="outline">No Menu</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {menuItems.length}
                </div>
                <div className="text-sm text-gray-600">Menu Items</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {restaurant.hasMenu ? 'Active' : 'Inactive'}
                </div>
                <div className="text-sm text-gray-600">Menu Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items */}
      {restaurant.hasMenu && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Menu Items</CardTitle>
              {user?.role === 'ADMIN' && (
                <Button onClick={() => navigate(`/restaurants/${id}/menu`)}>
                  Manage Menu
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {menuItems.length === 0 ? (
              <div className="text-center py-12">
                <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No menu items yet</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add menu items to allow users to order from this restaurant.
                </p>
                {user?.role === 'ADMIN' && (
                  <Button onClick={() => navigate(`/restaurants/${id}/menu`)}>
                    Add Menu Items
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map((item: MenuItem) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.available ? (
                        <Badge className="bg-green-500">Available</Badge>
                      ) : (
                        <Badge variant="outline">Unavailable</Badge>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">{item.category}</span>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-gray-600" />
                        <span className="font-semibold text-gray-900">
                          {item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Section (if available) */}
      {restaurant.imageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Image</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full h-64 object-cover rounded-lg"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RestaurantDetails;
