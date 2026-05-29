package com.example.dashboard;

import com.example.dashboard.controller.DocumentController;
import com.example.dashboard.controller.NotificationController;
import com.example.dashboard.model.Document;
import com.example.dashboard.model.Notification;
import com.example.dashboard.repository.DocumentRepository;
import com.example.dashboard.repository.NotificationRepository;
import com.example.dashboard.service.NotificationService;
import com.example.dashboard.service.StorageService;
import com.example.dashboard.websocket.NotificationWebSocketHandler;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({DocumentController.class, NotificationController.class})
class DashboardApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DocumentRepository documentRepository;

    @MockBean
    private NotificationRepository notificationRepository;

    @MockBean
    private StorageService storageService;

    @MockBean
    private NotificationService notificationService;

    @MockBean
    private NotificationWebSocketHandler webSocketHandler;

    @Test
    void contextLoads() {
        // Simple context loading verification test
    }

    @Test
    void testGetAllDocuments() throws Exception {
        // Arrange Mock Documents
        Document doc1 = new Document("policy1.pdf", 1024L, "application/pdf", "policy1-uuid.pdf");
        doc1.setId(1L);
        Document doc2 = new Document("manual.pdf", 2048L, "application/pdf", "manual-uuid.pdf");
        doc2.setId(2L);

        List<Document> docList = Arrays.asList(doc1, doc2);
        Mockito.when(documentRepository.findAll()).thenReturn(docList);

        // Act & Assert
        mockMvc.perform(get("/api/documents")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].name", is("policy1.pdf")))
                .andExpect(jsonPath("$[1].id", is(2)))
                .andExpect(jsonPath("$[1].name", is("manual.pdf")));
    }

    @Test
    void testGetAllNotifications() throws Exception {
        // Arrange Mock Notifications
        Notification notif1 = new Notification("4 files uploaded successfully", "success");
        notif1.setId(1L);
        notif1.setRead(false);
        Notification notif2 = new Notification("Upload failed for test.pdf", "error");
        notif2.setId(2L);
        notif2.setRead(true);

        List<Notification> list = Arrays.asList(notif1, notif2);
        Mockito.when(notificationService.getAllNotifications()).thenReturn(list);

        // Act & Assert
        mockMvc.perform(get("/api/notifications")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].message", is("4 files uploaded successfully")))
                .andExpect(jsonPath("$[0].read", is(false)))
                .andExpect(jsonPath("$[1].id", is(2)))
                .andExpect(jsonPath("$[1].message", is("Upload failed for test.pdf")))
                .andExpect(jsonPath("$[1].read", is(true)));
    }

    @Test
    void testMarkAsRead() throws Exception {
        // Arrange Mock response for marking as read
        Notification readNotif = new Notification("4 files uploaded successfully", "success");
        readNotif.setId(1L);
        readNotif.setRead(true);

        Mockito.when(notificationService.markAsRead(1L)).thenReturn(readNotif);

        // Act & Assert
        mockMvc.perform(put("/api/notifications/1/read")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.read", is(true)));
    }
}
