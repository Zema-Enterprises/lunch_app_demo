import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEvents, useJoinEvent, useCloseEvent, useDeleteEvent, useLeaveEvent } from '@/lib/api/hooks';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, DollarSign, Users, Clock, Trash2, LogOut, Info, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { CreateEventDialog } from '@/components/features/CreateEventDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OrderModal } from '@/components/features/OrderModal';
import { EditEventDialog } from '@/components/events/EditEventDialog';
import { EventDetailsModal } from '@/components/events/EventDetailsModal';
import { buildTenantPath } from '@/lib/api/tenant';

const Events = () => {
  const { user } = useAuthStore();
  const location = useLocation() as { state?: { openCreateEvent?: boolean } };
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'CLOSED' | 'all'>('OPEN');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [detailsEvent, setDetailsEvent] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [leaveConfirmId, setLeaveConfirmId] = useState<string | null>(null);
  const { data: events = [], isLoading } = useEvents(statusFilter === 'all' ? undefined : statusFilter);
  const { mutate: joinEvent } = useJoinEvent();
  const { mutate: closeEvent } = useCloseEvent();
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent();
  const { mutate: leaveEvent, isPending: isLeaving } = useLeaveEvent();

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

  const shouldAutoOpenCreateDialog = useMemo(() => {
    if (!user || user.role !== 'ADMIN') {
      return false;
    }

    return Boolean(location.state?.openCreateEvent);
  }, [location.state?.openCreateEvent, user]);

  const handleAutoOpenHandled = useCallback(() => {
    if (!location.state?.openCreateEvent) {
      return;
    }

    navigate(buildTenantPath('/events'), {
      replace: true,
      state: { ...location.state, openCreateEvent: false },
    });
  }, [location.state, navigate]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Events</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        {user?.role === 'ADMIN' && (
          <CreateEventDialog
            autoOpen={shouldAutoOpenCreateDialog}
            onAutoOpenHandled={handleAutoOpenHandled}
          />
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={statusFilter === 'OPEN' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('OPEN')}
          size="sm"
        >
          Open
        </Button>
        <Button
          variant={statusFilter === 'CLOSED' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('CLOSED')}
          size="sm"
        >
          Closed
        </Button>
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('all')}
          size="sm"
        >
          All
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter === 'OPEN'
              ? 'There are no open events at the moment.'
              : 'No events match the selected filter.'}
          </p>
          {user?.role === 'ADMIN' && statusFilter === 'OPEN' && <CreateEventDialog />}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const isParticipant = event.participants?.some((p) => p.userId === user?.id);
            const isCreator = event.createdById === user?.id;
            const isAdmin = user?.role === 'ADMIN';
            const deadlinePassed = new Date() >= new Date(event.orderDeadline);
            const canEdit = (isCreator || isAdmin) && event.status === 'OPEN';
            const canDelete = isCreator || isAdmin;
            const canJoin = event.status === 'OPEN' && !isParticipant && !deadlinePassed;
            const canClose = event.status === 'OPEN' && (isCreator || isAdmin);
            const canLeave = isParticipant && !isCreator && event.status === 'OPEN' && !deadlinePassed;

            return (
              <Card key={event.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4 gap-3">
                  <h3 className="text-lg font-semibold flex-1 min-w-0 truncate" title={event.title}>
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getStatusVariant(event.status)}>{event.status}</Badge>
                    {event.deliveredAt && (
                      <Badge className="bg-blue-500 text-white">
                        <Truck className="w-3 h-3 mr-1" />
                        Delivered
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetailsEvent(event)}
                      title="View Details"
                      aria-label="View event details"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    {canEdit && <EditEventDialog event={event} />}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteConfirmId(event.id)}
                        title="Delete Event"
                        aria-label="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2" title={event.description}>
                    {event.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-700">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Restaurant: {event.restaurant?.name || 'N/A'}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-700">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{event.deliveryLocation}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-700">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Deadline: {format(new Date(event.orderDeadline), 'MMM d, h:mm a')}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-700">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span>{getPaymentMethodLabel(event.paymentMethod)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-700">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{event.participants?.length || 0} participants</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {canJoin && (
                    <Button
                      className="flex-1"
                      onClick={() => joinEvent(event.id)}
                    >
                      Join Event
                    </Button>
                  )}
                  
                  {isParticipant && event.status === 'OPEN' && !deadlinePassed && (
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => setSelectedEvent(event)}
                    >
                      Place Order
                    </Button>
                  )}

                  {canClose && (
                    <Button
                      variant="outline"
                      onClick={() => closeEvent(event.id)}
                    >
                      Close Event
                    </Button>
                  )}

                  {canLeave && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      onClick={() => setLeaveConfirmId(event.id)}
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Leave
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedEvent && (
        <OrderModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Event Details Modal */}
      {detailsEvent && (
        <EventDetailsModal
          event={detailsEvent}
          onClose={() => setDetailsEvent(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => { deleteEvent(deleteConfirmId!); setDeleteConfirmId(null); }}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone and will remove all associated orders."
        confirmText="Delete Event"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Leave Event Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!leaveConfirmId}
        onClose={() => setLeaveConfirmId(null)}
        onConfirm={() => { leaveEvent(leaveConfirmId!); setLeaveConfirmId(null); }}
        title="Leave Event"
        message="Are you sure you want to leave this event? Your order will be cancelled if you have placed one."
        confirmText="Leave Event"
        variant="warning"
        isLoading={isLeaving}
      />
    </div>
  );
};

export default Events;
