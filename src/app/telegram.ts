export class TelegramService {
  private static get webApp() {
    return window.Telegram?.WebApp;
  }

  static init() {
    if (this.webApp) {
      this.webApp.ready();
      this.webApp.expand();
      console.log('Telegram WebApp Initialized', this.webApp.initDataUnsafe.user);
    } else {
      console.warn('Telegram WebApp not found, running in browser mode');
    }
  }

  static getUser() {
    return this.webApp?.initDataUnsafe.user || null;
  }

  static hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
    if (this.webApp?.HapticFeedback) {
      this.webApp.HapticFeedback.impactOccurred(style);
    }
  }

  static hapticNotification(type: 'success' | 'error' | 'warning') {
    if (this.webApp?.HapticFeedback) {
      this.webApp.HapticFeedback.notificationOccurred(type);
    }
  }
}