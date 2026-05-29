package com.example.dashboard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 512)
    private String message;

    @Column(nullable = false)
    private String type; // success, error, info

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    // Constructors
    public Notification() {
        this.timestamp = LocalDateTime.now();
        this.isRead = false;
    }

    public Notification(String message, String type) {
        this.message = message;
        this.type = type;
        this.timestamp = LocalDateTime.now();
        this.isRead = false;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
    }
}
