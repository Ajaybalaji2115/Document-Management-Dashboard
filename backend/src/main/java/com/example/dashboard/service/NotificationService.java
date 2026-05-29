package com.example.dashboard.service;

import com.example.dashboard.model.Notification;
import com.example.dashboard.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Autowired
    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public Notification createNotification(String message, String type) {
        Notification notification = new Notification(message, type);
        Notification saved = notificationRepository.save(notification);
        
        // Broadcast through WebSocket (Placeholder for Phase 5)
        broadcast(saved);
        
        return saved;
    }

    public List<Notification> getAllNotifications() {
        return notificationRepository.findAllByOrderByTimestampDesc();
    }

    public Notification markAsRead(Long id) {
        Optional<Notification> optional = notificationRepository.findById(id);
        if (optional.isPresent()) {
            Notification notification = optional.get();
            notification.setRead(true);
            Notification saved = notificationRepository.save(notification);
            triggerUpdate();
            return saved;
        }
        throw new RuntimeException("Notification not found with id: " + id);
    }

    public void markAllAsRead() {
        List<Notification> notifications = notificationRepository.findAll();
        for (Notification notification : notifications) {
            if (!notification.isRead()) {
                notification.setRead(true);
                notificationRepository.save(notification);
            }
        }
        triggerUpdate();
    }

    // Real-time broadcast hooks
    private void broadcast(Notification notification) {
        // Will be fully implemented in Phase 5 using WebSocket SimpMessagingTemplate
        System.out.println("Broadcasting notification in real-time: " + notification.getMessage());
    }

    private void triggerUpdate() {
        // Will be implemented in Phase 5 to update total unread badges
        System.out.println("Broadcasting notification update...");
    }
}
