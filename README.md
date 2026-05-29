# AJAY BALAJI DOCUMENT HUB

A full-stack, real-time **Document Management Dashboard** built with **Spring Boot**, **React + Vite**, and **MySQL**. Upload PDF documents, track individual file progress in real-time, receive live WebSocket notifications, and manage your entire document library — all in one premium light-blue themed interface.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📂 **Drag & Drop Upload** | Drop one or multiple PDFs onto the upload zone or click to browse |
| 📊 **Per-File Progress Bars** | Individual animated progress bars per file powered by Axios TCP tracking |
| ⚡ **Smart Bulk Upload** | Uploading 4+ files automatically switches to background mode with a live banner |
| 🔔 **Real-Time WebSocket Alerts** | Single consolidated toast: *"3 files uploaded"* or *"2 files deleted"* — never duplicated |
| 🗃️ **Document Library Table** | Sortable table listing all uploaded files with name, size, and date |
| ☑️ **Multi-Select Bulk Delete** | Checkbox selection per row + master select-all + single "Delete Selected (N)" button |
| 🗑️ **Physical Deletion** | Clicking delete removes the file from disk AND purges the MySQL metadata row |
| 📥 **Secure Downloads** | Stream any file from server disk directly to the browser |
| 📬 **Persistent Notification History** | Bell icon tray with unread badge, mark-as-read, and mark-all-read |
| 🎨 **Premium Light Theme** | Clean HSL Slate/Blue design system with micro-animations and glassmorphic cards |

---

## 🏗️ Tech Stack

### Backend
- **Java 21** + **Spring Boot 3.x** (Embedded Tomcat on port `8080`)
- **Spring Data JPA** + **Hibernate** (ORM → MySQL)
- **Spring WebSocket** (Native WebSocket, not STOMP)
- **MySQL 8.0** (Persistent storage for documents and notifications)
- **Maven** (Build tool)

### Frontend
- **React 18** + **Vite 8** (Development server on port `5173`)
- **Axios** (HTTP client with `onUploadProgress` TCP tracking)
- **Lucide React** (Icon library)
- **Vanilla CSS** (Premium HSL design system, no Tailwind)

---

## 📁 Project Structure

```
document-management-dashboard/
│
├── backend/                          Spring Boot Application
│   └── src/main/java/com/example/dashboard/
│       ├── DashboardApplication.java      → JVM entry point (boots Tomcat + MySQL)
│       ├── config/
│       │   └── WebSocketConfig.java       → Registers /ws WebSocket route
│       ├── controller/
│       │   ├── DocumentController.java    → REST API: upload, download, delete, bulk-delete
│       │   └── NotificationController.java → REST API: list, mark-read, mark-all-read
│       ├── model/
│       │   ├── Document.java              → JPA entity → `documents` MySQL table
│       │   └── Notification.java          → JPA entity → `notifications` MySQL table
│       ├── repository/
│       │   ├── DocumentRepository.java    → Auto-generates SQL for documents
│       │   └── NotificationRepository.java → Auto-generates SQL for notifications
│       ├── service/
│       │   ├── StorageService.java        → Reads/writes physical files on disk
│       │   └── NotificationService.java   → Saves alerts to DB + broadcasts via WebSocket
│       └── websocket/
│           └── NotificationWebSocketHandler.java → Manages live browser sessions registry
│
├── frontend/                         React + Vite Application
│   └── src/
│       ├── main.jsx                       → DOM bootstrap, mounts <App /> into index.html
│       ├── App.jsx                        → State hub: REST calls, WebSocket, shared state
│       ├── index.css                      → Complete design system (HSL vars, all styles)
│       └── components/
│           ├── Header.jsx                 → Brand bar with back button + NotificationBell
│           ├── NotificationBell.jsx       → Dropdown tray, badge, mark-read actions
│           ├── FileUploadCard.jsx         → Drag-drop zone + file browser + capsule pills
│           ├── UploadTracker.jsx          → Per-file horizontal progress cards
│           ├── DocumentTable.jsx          → Library table with checkboxes and bulk actions
│           └── ToastContainer.jsx         → Fixed bottom-right sliding alert overlay
│
└── README.md
```

---

## 🗄️ Database Schema

### `documents` table
| Column | Type | Description |
|---|---|---|
| `id` | BIGINT (PK, AUTO) | Unique identifier |
| `name` | VARCHAR(255) | Original file name |
| `size` | BIGINT | File size in bytes |
| `type` | VARCHAR(100) | MIME type (e.g. `application/pdf`) |
| `upload_date` | DATETIME | Timestamp of upload |
| `file_path` | VARCHAR(512) | UUID-suffixed filename in `uploads/` folder |

### `notifications` table
| Column | Type | Description |
|---|---|---|
| `id` | BIGINT (PK, AUTO) | Unique identifier |
| `message` | VARCHAR(512) | Alert text (e.g. "4 files uploaded") |
| `type` | VARCHAR(50) | `success`, `info`, or `error` |
| `timestamp` | DATETIME | When the event occurred |
| `is_read` | BOOLEAN | `false` by default |

---

## 🚀 Deployment — Step by Step

### Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Download |
|---|---|---|
| **Java JDK** | 21+ | https://adoptium.net |
| **Apache Maven** | 3.9+ | https://maven.apache.org/download.cgi |
| **Node.js** | 18+ | https://nodejs.org |
| **MySQL Server** | 8.0+ | https://dev.mysql.com/downloads/mysql |
| **Git** | Any | https://git-scm.com |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Ajaybalaji2115/Document-Management-Dashboard.git
cd Document-Management-Dashboard/document-management-dashboard
```

---

### Step 2 — Set Up MySQL Database

1. Open MySQL Workbench or any MySQL client and log in as `root`.
2. The application automatically creates the database on first startup — **no manual SQL needed**.
3. Confirm your MySQL server is running on port `3306`.

> **Note**: The default credentials in `application.properties` are:
> ```
> Username: root
> Password: Ajaybalaji2115$
> Database: document_db  (auto-created)
> ```
> If your MySQL password is different, edit `backend/src/main/resources/application.properties` before starting.

---

### Step 3 — Configure the Backend (Optional)

Open `backend/src/main/resources/application.properties` and update if needed:

```properties
# Server Port
server.port=8080

# MySQL connection (update password if different)
spring.datasource.url=jdbc:mysql://localhost:3306/document_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD

# File upload size limit
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB
```

---

### Step 4 — Start the Backend Server

Open a terminal and navigate to the backend folder:

```bash
cd backend
mvn spring-boot:run
```

You should see output like:
```
Tomcat started on port 8080
Started DashboardApplication in 4.2 seconds
```

> The `uploads/` directory is automatically created in the backend folder on first startup.

**Verify it is running:**
```bash
curl http://localhost:8080/api/documents
# Should return: []
```

---

### Step 5 — Install Frontend Dependencies

Open a **second terminal** and navigate to the frontend folder:

```bash
cd frontend
npm install
```

---

### Step 6 — Start the Frontend Development Server

```bash
npm run dev
```

You should see:
```
  VITE v8.x  ready in 300 ms
  ➜  Local:   http://localhost:5173/
```

---

### Step 7 — Open in Browser

Navigate to: **[http://localhost:5173](http://localhost:5173)**

The dashboard is now fully operational:
- ✅ Backend API responding at `http://localhost:8080/api`
- ✅ WebSocket connected at `ws://localhost:8080/ws`
- ✅ MySQL database active with auto-created tables
- ✅ Frontend served at `http://localhost:5173`

---

## 🧪 Testing the Application

### Upload a Single File
1. Click on the drag zone or click **"Single file"** capsule
2. Select any PDF from your computer
3. Watch the animated progress bar update in real-time
4. File appears in the Document Library table after completion

### Upload Bulk Files (4+)
1. Select 4 or more PDF files simultaneously
2. A blue banner appears: *"Bulk upload in progress — processing X files"*
3. All progress bars animate simultaneously
4. A single toast pops up: *"4 files uploaded"*

### Delete a File
1. Click the 🗑️ red trash icon next to any file row
2. Confirm the browser dialog
3. File is removed from table, disk, and database instantly

### Bulk Delete
1. Tick checkboxes next to multiple files
2. Click **"Delete Selected (N)"** button in the library header
3. One consolidated toast: *"3 files deleted"*

### Notification History
1. Click the 🔔 bell icon in the top-right
2. All system events are listed with timestamps
3. Click the ✓ icon to mark individual items as read
4. Click "Mark all read" to clear the badge

---

## 🔧 Production Build

To compile an optimized production bundle for the frontend:

```bash
cd frontend
npm run build
```

The compiled output will be in `frontend/dist/`. You can serve it using any static hosting (Nginx, Netlify, Vercel).

For the backend, package it as a runnable JAR:

```bash
cd backend
mvn package -DskipTests
java -jar target/dashboard-0.0.1-SNAPSHOT.jar
```

---

## 📡 API Reference

### Documents
```
GET    /api/documents                    → List all documents
POST   /api/documents/upload             → Upload a PDF (multipart/form-data)
GET    /api/documents/download/{id}      → Download a file by ID
DELETE /api/documents/{id}               → Delete a file by ID
POST   /api/documents/bulk-delete        → Delete multiple files (body: [id1, id2, ...])
```

### Notifications
```
GET  /api/notifications                  → List all notifications
PUT  /api/notifications/{id}/read        → Mark one as read
PUT  /api/notifications/read-all         → Mark all as read
```

### WebSocket
```
ws://localhost:8080/ws                   → Real-time notification stream (JSON frames)
```

---

## 👤 Author

**Ajay Balaji**  
GitHub: [@Ajaybalaji2115](https://github.com/Ajaybalaji2115)

---

## 📄 License

This project is for educational and portfolio demonstration purposes.
