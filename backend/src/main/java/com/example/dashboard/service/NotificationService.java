package com.example.dashboard.service;

import com.example.dashboard.model.Notification;
import com.example.dashboard.repository.NotificationRepository;
import com.example.dashboard.websocket.NotificationWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationWebSocketHandler webSocketHandler;
    private final ObjectMapper objectMapper;

    @Autowired
    public NotificationService(NotificationRepository notificationRepository,
                              NotificationWebSocketHandler webSocketHandler,
                              ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.webSocketHandler = webSocketHandler;
        this.objectMapper = objectMapper;
    }

    public Notification createNotification(String message, String type) {
        Notification notification = new Notification(message, type);
        Notification saved = notificationRepository.save(notification);
        
        // Broadcast the new notification to all active sockets
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

    /**
     * Broadcasts a full notification JSON object to the frontend.
     */
    private void broadcast(Notification notification) {
        try {
            String json = objectMapper.writeValueAsString(notification);
            webSocketHandler.broadcast(json);
        } catch (Exception e) {
            System.err.println("Error serializing notification for WebSocket: " + e.getMessage());
        }
    }

    /**
     * Sends a refresh command to force the client to reload notification states.
     */
    private void triggerUpdate() {
        webSocketHandler.broadcast("{\"action\":\"REFRESH\"}");
    }
}
