package com.example.dashboard.service;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.Objects;
import java.util.UUID;

@Service
public class StorageService {

    private final Path rootLocation = Paths.get("uploads");

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory: " + rootLocation, e);
        }
    }

    public String store(MultipartFile file) {
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (originalFilename.isEmpty()) {
            throw new RuntimeException("Failed to store empty file.");
        }
        
        // Prevent directory traversal attacks
        if (originalFilename.contains("..")) {
            throw new RuntimeException("Cannot store file with relative path outside current directory " + originalFilename);
        }

        // Generate a unique file name to prevent collision
        String fileExtension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            fileExtension = originalFilename.substring(dotIndex);
        }
        String cleanNameWithoutExt = dotIndex > 0 ? originalFilename.substring(0, dotIndex) : originalFilename;
        cleanNameWithoutExt = cleanNameWithoutExt.replaceAll("[^a-zA-Z0-9\\s-_]", "");
        String storedFilename = cleanNameWithoutExt + "-" + UUID.randomUUID() + fileExtension;
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Failed to store empty file " + originalFilename);
            }
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, this.rootLocation.resolve(storedFilename), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file " + originalFilename, e);
        }
        return storedFilename;
    }

    public Path load(String filename) {
        return rootLocation.resolve(filename);
    }

    public Resource loadAsResource(String filename) {
        try {
            Path file = load(filename);
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read file: " + filename);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Could not read file: " + filename, e);
        }
    }

    public void delete(String filename) {
        try {
            Path file = load(filename);
            Files.deleteIfExists(file);
        } catch (IOException e) {
            throw new RuntimeException("Could not delete file: " + filename, e);
        }
    }
}
