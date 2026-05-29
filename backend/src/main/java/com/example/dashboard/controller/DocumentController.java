package com.example.dashboard.controller;

import com.example.dashboard.model.Document;
import com.example.dashboard.repository.DocumentRepository;
import com.example.dashboard.service.NotificationService;
import com.example.dashboard.service.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "*") // Allow React frontend CORS
public class DocumentController {

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;

    // Track active bulk uploads in memory: Map<bulkGroupId, Set<fileName>>
    private final Map<String, Set<Long>> bulkUploadTracker = new ConcurrentHashMap<>();

    @Autowired
    public DocumentController(DocumentRepository documentRepository,
                              StorageService storageService,
                              NotificationService notificationService) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<Document> getAllDocuments() {
        return documentRepository.findAll();
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "bulkGroupId", required = false) String bulkGroupId,
            @RequestParam(value = "totalCount", required = false) Integer totalCount) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty.");
        }

        try {
            // Save file to disk
            String storedFilename = storageService.store(file);

            // Create metadata entry in database
            Document document = new Document();
            document.setName(file.getOriginalFilename());
            document.setSize(file.getSize());
            document.setType(file.getContentType());
            document.setFilePath(storedFilename);
            document.setUploadDate(LocalDateTime.now());

            Document savedDocument = documentRepository.save(document);

            // Check if this is part of a bulk upload (> 3 files)
            if (bulkGroupId != null && totalCount != null && totalCount > 3) {
                // Track this upload in the group
                Set<Long> uploadedIds = bulkUploadTracker.computeIfAbsent(bulkGroupId, k -> ConcurrentHashMap.newKeySet());
                uploadedIds.add(savedDocument.getId());

                // If all files in the bulk group have completed, create a notification!
                if (uploadedIds.size() >= totalCount) {
                    bulkUploadTracker.remove(bulkGroupId); // Clean up
                    
                    // Create and broadcast bulk upload success notification
                    String successMessage = totalCount + " files uploaded successfully";
                    notificationService.createNotification(successMessage, "success");
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(savedDocument);

        } catch (Exception e) {
            // Save failure notification to DB
            notificationService.createNotification("Upload failed for file: " + file.getOriginalFilename() + ". Error: " + e.getMessage(), "error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload: " + e.getMessage());
        }
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long id) {
        Optional<Document> documentOpt = documentRepository.findById(id);
        if (documentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Document document = documentOpt.get();
        Resource resource = storageService.loadAsResource(document.getFilePath());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getName() + "\"")
                .body(resource);
    }
}
