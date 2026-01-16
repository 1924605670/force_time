# Focus Homework Architecture Documentation

## 1. System Overview
Focus Homework is a WeChat Mini Program designed to help students manage homework assignments with AI assistance. It features a multi-role system (Student, Parent, Admin), task management, focus timer, and data analysis.

## 2. Technical Stack
- **Frontend**: WeChat Mini Program (WXML, WXSS, JS)
- **AI Integration**: SiliconFlow API (Qwen/DeepSeek models) for OCR and Text Analysis.
- **Backend (Planned)**:
  - **Runtime**: Node.js + Express / Flask
  - **Database**: SQLite (Local Dev) / MySQL (Production)
  - **Auth**: JWT (JSON Web Tokens)
- **Local Storage**: WeChat `wx.setStorageSync` for offline capability.

## 3. Database Schema (ER Diagram)

### Users Table
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| openid | String | WeChat OpenID (Unique) |
| nickname | String | User display name |
| role | Enum | 'student', 'parent', 'admin' |
| created_at | DateTime | |

### Tasks Table
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| user_id | UUID | Foreign Key -> Users.id |
| name | String | Task content |
| expected_minutes | Integer | Estimated time |
| actual_minutes | Integer | Actual time spent |
| status | Enum | 'pending', 'completed' |
| created_at | DateTime | |

### FocusSessions Table
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| task_id | UUID | Foreign Key -> Tasks.id |
| start_time | DateTime | |
| end_time | DateTime | |
| duration | Integer | Seconds |
| interruptions | Integer | Count of interruptions |

## 4. API Endpoints (Planned)

### Auth
- `POST /api/auth/login`: Exchange WeChat Code for Token.
- `GET /api/auth/me`: Get current user info.

### Tasks
- `GET /api/tasks`: List tasks (filter by date, status).
- `POST /api/tasks`: Create new task.
- `PUT /api/tasks/:id`: Update task (complete/edit).
- `POST /api/tasks/analyze`: AI Text/Image Analysis (Proxy to LLM).

### Reports
- `GET /api/reports/weekly`: Get weekly statistics.
- `GET /api/reports/daily`: Get daily summary.

## 5. Security & Privacy
- **Encryption**: Sensitive data (like user notes) should be encrypted before storing in SQLite using `sqlcipher` or application-level AES encryption.
- **Data Isolation**: Parent role can only access linked Student data (requires Family Link logic).
- **Clipboard**: Clipboard data is processed locally or sent ephemerally to AI; not stored permanently unless saved as a task.

## 6. Future Roadmap
- **Sync**: Cloud sync for multi-device support.
- **Gamification**: Badges and rewards system.
- **Teacher Role**: Class management and assignment broadcasting.
