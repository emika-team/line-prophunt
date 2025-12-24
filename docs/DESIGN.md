# LINE Mini Apps - Game & Survey Services

## Overview
สร้าง 2 services แยกอิสระจากกัน integrate กับ **livechat-next** (Proxy):

1. **Game Service** - เกมจับผิดภาพสำหรับ broadcast campaigns (MongoDB)
2. **Survey Service** - ถาม-ตอบ survey ใช้ได้หลาย case (MongoDB)

---

# Multi-Agent Development Setup

## ใช้ multi-agent-workflow-kit พัฒนาโปรเจค

### Concept
ใช้ 3 AI agents ทำงานพร้อมกัน แต่ละ agent รับผิดชอบ package ของตัวเอง:

```
┌─────────────────────────────────────────────────────────────┐
│                    tmux session (maw)                       │
├───────────────────┬───────────────────┬─────────────────────┤
│   Agent 1         │   Agent 2         │   Agent 3           │
│   game-service    │   survey-service  │   admin-ui          │
│   branch: agent-1 │   branch: agent-2 │   branch: agent-3   │
│   NestJS+Mongoose │   NestJS+Mongoose │   React + Vite      │
└───────────────────┴───────────────────┴─────────────────────┘
```

### Prerequisites
- Git repository initialized
- Python 3.10+ (for uvx)
- tmux installed
- direnv installed

### Installation

```bash
# 1. ไปที่โปรเจค
cd /Users/tony/Jobs/line-prophunt

# 2. Init git (ถ้ายังไม่มี)
git init
git add .
git commit -m "Initial commit"

# 3. ติดตั้ง multi-agent-workflow-kit
uvx --no-cache --from git+https://github.com/Soul-Brews-Studio/multi-agent-workflow-kit.git@v0.5.1 multi-agent-kit init

# 4. Activate environment
source .envrc

# 5. เข้า session
maw attach
```

### Agent Configuration

สร้างไฟล์ `.agents/agents.yaml`:

```yaml
agents:
  - id: 1
    name: "Game Service Agent"
    branch: "agent-1-game"
    description: "พัฒนา Game Service (NestJS + Mongoose + MongoDB)"
    focus:
      - packages/game-service/**

  - id: 2
    name: "Survey Service Agent"
    branch: "agent-2-survey"
    description: "พัฒนา Survey Service (NestJS + Mongoose + MongoDB)"
    focus:
      - packages/survey-service/**

  - id: 3
    name: "Admin UI Agent"
    branch: "agent-3-admin"
    description: "พัฒนา Admin UI (React + Vite + TailwindCSS)"
    focus:
      - packages/admin-ui/**
```

### Workflow Commands

```bash
# เข้า session
maw attach

# สั่งงาน agent
maw hey 1 "สร้าง NestJS project ใน packages/game-service"
maw hey 2 "สร้าง NestJS project ใน packages/survey-service"
maw hey 3 "สร้าง Vite + React project ใน packages/admin-ui"

# สั่งทุก agent พร้อมกัน
maw send "ติดตั้ง dependencies และทดสอบ"

# Sync changes กลับ main
maw sync

# Focus ดู agent เดียว
maw zoom 1

# สลับไปทำงานใน worktree ของ agent
maw warp 1
```

### Development Workflow

```
1. maw attach                    # เข้า session
2. maw hey 1 "task for game"     # สั่งงาน agent 1
3. maw hey 2 "task for survey"   # สั่งงาน agent 2
4. maw hey 3 "task for admin"    # สั่งงาน agent 3
5. (รอ agents ทำงาน)
6. maw sync                      # merge changes
7. ทดสอบ integration
8. commit & push
```

### Directory Structure หลัง Setup

```
line-prophunt/
├── .agents/
│   └── agents.yaml              # Agent configuration
├── .envrc                       # direnv config
├── agents/
│   ├── 1/                       # Agent 1 worktree (game-service)
│   ├── 2/                       # Agent 2 worktree (survey-service)
│   └── 3/                       # Agent 3 worktree (admin-ui)
├── packages/
│   ├── game-service/
│   ├── survey-service/
│   └── admin-ui/
├── docs/
│   └── DESIGN.md
└── README.md
```

---

## System Architecture

```
                         ┌─────────────────────┐
                         │   Game Service      │
                         │   (เกมจับผิดภาพ)     │
                         │   + MongoDB         │
                         └──────────▲──────────┘
                                    │
LINE  ←→  livechat-next (Proxy) ────┼────→  Route by keyword/trigger
                                    │
                         ┌──────────▼──────────┐
                         │   Survey Service    │
                         │   (ถาม-ตอบ Survey)   │
                         │   + MongoDB         │
                         └─────────────────────┘
```

**Use Cases:**
- **Game**: Admin broadcast เกม → ลูกค้าเล่น → รอรับรางวัล
- **Survey**: หลังแชทจบ / หลังเล่นเกม / trigger อื่นๆ → ถาม survey → ตอบในแชท → บันทึกลง DB

## Tech Stack

### Game Service
- **Runtime**: Node.js + TypeScript
- **Framework**: NestJS
- **Database**: MongoDB + Mongoose (เหมือน livechat-next)
- **Admin UI**: React (Vite) + TailwindCSS

### Survey Service
- **Runtime**: Node.js + TypeScript
- **Framework**: NestJS
- **Database**: MongoDB + Mongoose (เก็บ survey responses)
- **Admin UI**: ไม่ต้อง (config ผ่าน Proxy หรือ env)

---

## Integration with livechat-next

### รับ Webhook จาก Proxy

```typescript
// POST /webhook
// Headers: X-Webhook-Signature, X-Webhook-Event
{
  "event": "message.forwarding",
  "data": {
    "groupId": "xxx",
    "traceId": "message-id",
    "chat": {
      "chatId": "xxx",
      "message": "เล่นเกม",
      "attachments": []
    },
    "customer": {
      "id": "line-user-id",
      "displayName": "ชื่อลูกค้า"
    },
    "callback": {
      "url": "https://proxy.example.com/api",
      "secret": "api-token"
    }
  }
}
```

### ส่ง Response กลับ Proxy

```typescript
// POST {callback.url}/chats
// Headers: Authorization: Bearer {callback.secret}
{
  "traceId": "message-id",
  "response": "ข้อความตอบกลับ หรือ Flex Message JSON",
  "humanInLoop": false
}
```

---

---

# SERVICE 1: Game Service (MongoDB)

## Game Flow

```
Admin broadcast เกม → User ได้รับข้อความเชิญเล่น
User พิมพ์ "เล่น" หรือ keyword → Proxy forward → Game Service
Game Service ส่งรูป 3 ช่อง + "ตอบ 1, 2, หรือ 3"
User พิมพ์ "2" → Game Service ตรวจคำตอบ
ถูก → "ยินดีด้วย! รอ admin แจ้งรางวัล"
ผิด → "เสียใจด้วย ลองใหม่นะ!"
```

## Database Schema (Game Service)

| Collection | Purpose |
|------------|---------|
| `players` | ข้อมูลผู้เล่น (customer_id, display_name, group_id) |
| `games` | ข้อมูลเกม (name, image_url, correct_position, is_active) |
| `game_sessions` | ประวัติการเล่น (player, game, answer, is_correct, reward_status) |

### Player State Machine
```
IDLE → PLAYING → ANSWERED
```

---

# SERVICE 2: Survey Service (MongoDB)

## Survey Flow

```
Trigger (หลังแชทจบ/หลังเกม/manual) → Proxy เรียก Survey Service
Survey Service ส่งข้อความ "ให้คะแนน 1-5"
User พิมพ์ "5" → Survey Service บันทึกลง MongoDB + ตอบ "ขอบคุณ!" → จบ
```

## Database Schema (Survey Service)

| Collection | Purpose |
|------------|---------|
| `survey_sessions` | เก็บ state ว่า user กำลังตอบ survey (customer_id, group_id, status) |
| `survey_responses` | เก็บคำตอบ survey (customer_id, group_id, score, created_at) |

### Survey Session State Machine
```
IDLE → WAITING_RESPONSE → COMPLETED
```

## Survey Config (Environment)

```env
MONGODB_URI=mongodb://localhost:27017/prophunt-survey
SURVEY_QUESTION="กรุณาให้คะแนนบริการ 1-5"
SURVEY_THANK_YOU="ขอบคุณสำหรับความคิดเห็น!"
```

---

## Project Structure (Monorepo)

```
line-prophunt/
├── packages/
│   │
│   ├── game-service/             # SERVICE 1: เกมจับผิดภาพ (MongoDB)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── webhook/          # รับ webhook จาก Proxy
│   │   │   ├── game/             # Game CRUD + logic
│   │   │   │   ├── schemas/game.schema.ts
│   │   │   │   └── game.service.ts
│   │   │   ├── player/           # Player management
│   │   │   │   ├── schemas/player.schema.ts
│   │   │   │   └── player.service.ts
│   │   │   ├── session/          # Game sessions
│   │   │   │   ├── schemas/session.schema.ts
│   │   │   │   └── session.service.ts
│   │   │   ├── proxy-client/     # ส่ง response กลับ
│   │   │   └── admin/            # Admin API
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── survey-service/           # SERVICE 2: Survey (MongoDB)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── webhook/          # รับ webhook จาก Proxy
│   │   │   ├── survey/           # Survey logic
│   │   │   │   ├── schemas/
│   │   │   │   │   ├── survey-session.schema.ts
│   │   │   │   │   └── survey-response.schema.ts
│   │   │   │   └── survey.service.ts
│   │   │   └── proxy-client/     # ส่ง response กลับ
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── admin-ui/                 # Admin UI (สำหรับ Game Service)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Games.tsx
│       │   │   └── Winners.tsx
│       │   └── App.tsx
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml            # รัน all services
├── package.json                  # Workspace root
└── README.md
```

---

## Implementation Steps

### Phase 1: Project Setup (Monorepo)
- [ ] สร้าง monorepo structure (npm workspaces / pnpm)
- [ ] Setup shared configs (tsconfig, eslint)
- [ ] Setup Docker และ docker-compose

---

### Phase 2: Game Service

**2.1 Core Setup**
- [ ] สร้าง NestJS project (game-service)
- [ ] Setup MongoDB + Mongoose
- [ ] สร้าง webhook controller + signature verify
- [ ] สร้าง proxy-client service

**2.2 Game Logic**
- [ ] Player schema + service
- [ ] Game schema + service (CRUD)
- [ ] Session schema + service (state management)
- [ ] ส่งรูปเกม + ตรวจคำตอบ

**2.3 Admin API**
- [ ] CRUD Games
- [ ] ดูรายการผู้ชนะ
- [ ] Mark จ่ายรางวัลแล้ว
- [ ] Dashboard statistics

---

### Phase 3: Survey Service (MongoDB)

- [ ] สร้าง NestJS project (survey-service)
- [ ] Setup MongoDB + Mongoose
- [ ] สร้าง Survey schemas (survey-session, survey-response)
- [ ] Webhook controller + proxy-client
- [ ] Survey logic (ถาม → รอตอบ → บันทึก → ขอบคุณ)
- [ ] Config ผ่าน environment variables

---

### Phase 4: Admin UI (Game Service เท่านั้น)

- [ ] สร้าง React + Vite + TailwindCSS
- [ ] Dashboard page
- [ ] Games management page
- [ ] Winners page

---

### Phase 5: Deploy

- [ ] Docker build ทั้ง 3 services
- [ ] ลงทะเบียน webhooks ที่ livechat-next:
  - Game Service webhook
  - Survey Service webhook
- [ ] Deploy to VPS

---

## Scope
- เกมทำงานกับ **ทุก LINE OA** ที่ลงทะเบียนใน Proxy
- ใช้ `groupId` จาก webhook payload เพื่อแยก OA

---

## Message Response Types

Proxy รองรับส่งรูปภาพได้ เราสามารถส่ง:

| Step | Message จาก Game Service |
|------|--------------------------|
| **Start** | รูปเกม (3 ช่อง) + "หาจุดผิด! ตอบ 1, 2, หรือ 3" |
| **Win** | "ยินดีด้วย! ตอบถูกแล้ว รอ admin แจ้งรางวัล" |
| **Lose** | "เสียใจด้วย ตอบผิด ลองใหม่นะ!" |
| **Survey** | "ให้คะแนนความพึงพอใจ 1-5" |
| **Done** | "ขอบคุณที่ร่วมสนุก!" |

### Response Format to Proxy
```typescript
// ส่ง text
{ traceId, response: "ข้อความ", humanInLoop: false }

// ส่ง image (ต้องตรวจสอบ format กับ Proxy)
{ traceId, response: { type: "image", url: "..." }, humanInLoop: false }
```

---

## Key Files

### Game Service
| File | Description |
|------|-------------|
| `packages/game-service/src/webhook/webhook.controller.ts` | รับ webhook จาก Proxy |
| `packages/game-service/src/proxy-client/proxy-client.service.ts` | ส่ง response กลับ Proxy |
| `packages/game-service/src/session/session.service.ts` | จัดการ player state |
| `packages/game-service/src/game/game.service.ts` | Game logic |
| `packages/game-service/src/admin/admin.controller.ts` | Admin REST API |
| `packages/game-service/src/*/schemas/*.schema.ts` | Mongoose schemas |

### Survey Service
| File | Description |
|------|-------------|
| `packages/survey-service/src/webhook/webhook.controller.ts` | รับ webhook จาก Proxy |
| `packages/survey-service/src/survey/survey.service.ts` | Survey logic + MongoDB |
| `packages/survey-service/src/survey/schemas/survey-session.schema.ts` | Session state schema |
| `packages/survey-service/src/survey/schemas/survey-response.schema.ts` | Response data schema |
| `packages/survey-service/src/proxy-client/proxy-client.service.ts` | ส่ง response กลับ Proxy |

---

## Admin API Endpoints (Game Service)

```
GET    /api/admin/dashboard        # สถิติรวม
GET    /api/admin/games            # รายการเกม
POST   /api/admin/games            # สร้างเกมใหม่
PUT    /api/admin/games/:id        # แก้ไขเกม
DELETE /api/admin/games/:id        # ลบเกม
GET    /api/admin/sessions         # รายการ game sessions (ผู้ชนะ)
PUT    /api/admin/sessions/:id     # อัพเดทสถานะ (จ่ายรางวัลแล้ว)
GET    /api/admin/players          # รายการผู้เล่น
```

---

## livechat-next Reference Files

ไฟล์สำคัญใน Proxy ที่ต้องอ้างอิง:

| File | Purpose |
|------|---------|
| `/backend/src/webhooks/services/webhook-dispatcher.service.ts` | ดูว่า Proxy ส่ง webhook มาอย่างไร |
| `/backend/src/chats/managers/message-forwarding.manager.ts` | ดู payload format |
| `/backend/src/chats/chats.service.ts` | ดูว่าต้องส่ง response กลับอย่างไร |

---

## Environment Variables

### Game Service
```env
MONGODB_URI=mongodb://localhost:27017/prophunt
WEBHOOK_SECRET=xxx              # สำหรับ verify signature จาก Proxy
PORT=3001
ADMIN_USERNAME=admin
ADMIN_PASSWORD=xxx
```

### Survey Service
```env
MONGODB_URI=mongodb://localhost:27017/prophunt-survey
WEBHOOK_SECRET=xxx
PORT=3002
SURVEY_QUESTION="กรุณาให้คะแนนบริการของเรา 1-5 คะแนน"
SURVEY_THANK_YOU="ขอบคุณสำหรับความคิดเห็นครับ!"
```

---

## Admin UI Design (Game Service Only)

### Tech Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Components**: shadcn/ui (Radix UI)
- **State**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Forms**: React Hook Form + Zod

### Project Structure

```
packages/admin-ui/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/                      # API client
│   │   ├── client.ts             # Axios instance
│   │   ├── games.ts
│   │   ├── sessions.ts
│   │   └── players.ts
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Layout.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   └── RecentWinners.tsx
│   │   ├── games/
│   │   │   ├── GameCard.tsx
│   │   │   ├── GameForm.tsx
│   │   │   └── ImageUploader.tsx
│   │   └── sessions/
│   │       ├── SessionsTable.tsx
│   │       └── RewardStatusBadge.tsx
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Games.tsx
│   │   ├── Sessions.tsx          # Winners list
│   │   └── Login.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGames.ts
│   │   └── useSessions.ts
│   │
│   └── lib/
│       ├── utils.ts
│       └── constants.ts
│
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

### Page Designs

#### 1. Dashboard (`/`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                              [Logout] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│  │  Players    │ │  Sessions   │ │  Winners    │ │  Avg       ││
│  │    1,234    │ │    5,678    │ │    890      │ │    4.2     ││
│  │   +12%      │ │   +8%       │ │   +15%      │ │  Survey    ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘│
│                                                                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ Sessions (Last 7 days)      │ │ Recent Winners              ││
│  │                             │ │                             ││
│  │   [Line Chart]              │ │  - somchai - Game A - 10:30 ││
│  │                             │ │  - somying - Game B - 10:25 ││
│  │                             │ │  - somsak - Game A - 10:20  ││
│  │                             │ │  [View All]                 ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Survey Scores Distribution                                  ││
│  │                                                             ││
│  │   [Bar Chart: 1 2 3 4 5]                                    ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- `StatsCard`: แสดงตัวเลขสถิติ + % เปลี่ยนแปลง
- `SessionsChart`: Line chart แสดง sessions ต่อวัน
- `RecentWinners`: รายการผู้ชนะล่าสุด 5 คน
- `SurveyChart`: Bar chart แสดงการกระจายคะแนน

---

#### 2. Games Management (`/games`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Games                                         [+ Create Game]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ [Game Image]    │ │ [Game Image]    │ │ [Game Image]    │   │
│  │                 │ │                 │ │                 │   │
│  │ Game #1         │ │ Game #2         │ │ Game #3         │   │
│  │ Active          │ │ Active          │ │ Inactive        │   │
│  │ Sessions: 500   │ │ Sessions: 300   │ │ Sessions: 0     │   │
│  │ Win rate: 45%   │ │ Win rate: 38%   │ │ Win rate: -     │   │
│  │                 │ │                 │ │                 │   │
│  │ [Edit] [Delete] │ │ [Edit] [Delete] │ │ [Edit] [Delete] │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Game Form Modal:**
```
┌─────────────────────────────────────────┐
│  Create Game                       [X]  │
├─────────────────────────────────────────┤
│                                         │
│  Game Name:                             │
│  ┌─────────────────────────────────────┐│
│  │ Game #4                             ││
│  └─────────────────────────────────────┘│
│                                         │
│  Game Image:                            │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │    [Click to upload image]          ││
│  │    or drag and drop                 ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
│  Correct Position:                      │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │  1  │ │ [2] │ │  3  │               │
│  └─────┘ └─────┘ └─────┘               │
│                                         │
│  Status:                                │
│  [x] Active  [ ] Inactive               │
│                                         │
│           [Cancel]  [Save]              │
└─────────────────────────────────────────┘
```

---

#### 3. Sessions/Winners (`/sessions`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Game Sessions                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filters: [All] [Winners Only] [Date Range]  [Search]           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Player        │ Game      │ Result │ Reward  │ Date        ││
│  ├───────────────┼───────────┼────────┼─────────┼─────────────┤│
│  │ somchai       │ Game #1   │ Win    │ Pending │ 24 Dec 10:30││
│  │               │           │        │ [Mark Paid]           ││
│  ├───────────────┼───────────┼────────┼─────────┼─────────────┤│
│  │ somying       │ Game #2   │ Win    │ Paid    │ 24 Dec 10:25││
│  ├───────────────┼───────────┼────────┼─────────┼─────────────┤│
│  │ somsak        │ Game #1   │ Lose   │   -     │ 24 Dec 10:20││
│  ├───────────────┼───────────┼────────┼─────────┼─────────────┤│
│  │ sompong       │ Game #3   │ Win    │ Pending │ 24 Dec 10:15││
│  │               │           │        │ [Mark Paid]           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Showing 1-10 of 500                    [< 1 2 3 ... 50 >]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Filter by: All / Winners / Losers
- Filter by date range
- Search by player name
- Mark reward as paid (button)
- Pagination

---

#### 4. Layout (Sidebar)

```
┌────────────────┬────────────────────────────────────────────────┐
│                │                                                │
│  PropHunt      │                                                │
│                │                                                │
│  ────────────  │                    [Content Area]              │
│                │                                                │
│  Dashboard     │                                                │
│  Games         │                                                │
│  Sessions      │                                                │
│                │                                                │
│  ────────────  │                                                │
│                │                                                │
│  Logout        │                                                │
│                │                                                │
└────────────────┴────────────────────────────────────────────────┘
```

---

### UI Implementation Steps

#### Phase 4: Admin UI (Detailed)

**4.1 Setup**
- [ ] สร้าง Vite + React + TypeScript project
- [ ] Setup TailwindCSS + shadcn/ui
- [ ] Setup React Router
- [ ] Setup TanStack Query
- [ ] สร้าง API client (axios)

**4.2 Layout & Auth**
- [ ] สร้าง Layout component (Sidebar)
- [ ] สร้าง Login page
- [ ] Setup authentication (JWT)
- [ ] Protected routes

**4.3 Dashboard**
- [ ] StatsCard component (Players, Sessions, Winners)
- [ ] Sessions chart (Recharts) - last 7 days
- [ ] Recent winners list

**4.4 Games Page**
- [ ] Games grid view
- [ ] Game card component
- [ ] Create/Edit game modal
- [ ] Image uploader component
- [ ] Position selector (1/2/3)

**4.5 Sessions Page**
- [ ] Sessions table (TanStack Table)
- [ ] Filters (Winners only, date range)
- [ ] Mark reward paid button
- [ ] Pagination
