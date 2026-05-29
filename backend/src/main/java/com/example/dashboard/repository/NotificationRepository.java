package com.example.dashboard.repository;

import com.example.dashboard.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    // Fetch all notifications ordered by timestamp descending
    List<Notification> findAllByOrderByTimestampDesc();
    
    // Count the number of unread notifications
    long countByIsReadFalse();
}
