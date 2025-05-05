class NotificationSystem {
    constructor() {
        console.log('Initializing notifications system...');
        this.container = this.createContainer();
        this.notifications = [];
        this.timeout = 5000; // Default timeout in milliseconds
        console.log('Notifications system initialized');
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    show(title, message, type = 'error', timeout = this.timeout) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <i class="bi bi-x notification-close"></i>
        `;

        // Add close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.remove(notification));

        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Auto remove after timeout
        if (timeout > 0) {
            setTimeout(() => this.remove(notification), timeout);
        }

        return notification;
    }

    getIcon(type) {
        switch (type) {
            case 'error':
                return 'bi-exclamation-circle';
            case 'success':
                return 'bi-check-circle';
            case 'warning':
                return 'bi-exclamation-triangle';
            default:
                return 'bi-info-circle';
        }
    }

    remove(notification) {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            notification.remove();
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }

    error(title, message, timeout) {
        return this.show(title, message, 'error', timeout);
    }

    success(title, message, timeout) {
        return this.show(title, message, 'success', timeout);
    }

    warning(title, message, timeout) {
        return this.show(title, message, 'warning', timeout);
    }

    info(title, message, timeout) {
        return this.show(title, message, 'info', timeout);
    }
}

// Create global notification instance
console.log('Creating global notification instance...');
const notifications = new NotificationSystem();
console.log('Global notification instance created'); 