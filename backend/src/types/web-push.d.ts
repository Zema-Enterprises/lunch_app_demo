declare module 'web-push' {
  type SendResult = any;

  interface WebPushAPI {
    setVapidDetails(contact: string, publicKey: string, privateKey: string): void;
    sendNotification(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string): Promise<SendResult>;
  }

  const webPush: WebPushAPI;
  export default webPush;
}
