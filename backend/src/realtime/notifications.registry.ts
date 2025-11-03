export interface EmitOptions {
  userId?: string;
  event?: string;
}

export interface NotificationsGateway {
  emitNotification: (companyId: string, payload: unknown, options?: EmitOptions) => void;
  close?: () => Promise<void>;
}

let gateway: NotificationsGateway | null = null;

export const registerNotificationsGateway = (instance: NotificationsGateway | null) => {
  gateway = instance;
};

export const clearNotificationsGateway = () => {
  gateway = null;
};

export const getNotificationsGateway = () => gateway;

export const emitRealtimeNotification = (
  companyId: string,
  payload: unknown,
  options?: EmitOptions
) => {
  gateway?.emitNotification(companyId, payload, options);
};
