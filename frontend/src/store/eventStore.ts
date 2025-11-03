import { create } from 'zustand';
import { Event } from '../types';

interface EventFilters {
  status?: 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  search?: string;
}

interface EventState {
  events: Event[];
  selectedEvent: Event | null;
  filters: EventFilters;
  setEvents: (events: Event[]) => void;
  setSelectedEvent: (event: Event | null) => void;
  setFilters: (filters: EventFilters) => void;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  selectedEvent: null,
  filters: {},
  
  setEvents: (events) => set({ events }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setFilters: (filters) => set({ filters }),
}));
