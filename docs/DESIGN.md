# LINE Mini Apps - Game & Survey Service

## Overview
สร้าง **1 API Service** (รวม Game + Survey) integrate กับ **livechat-next** (Proxy):

- **Game Module** - เกมจับผิดภาพสำหรับ broadcast campaigns
- **Survey Module** - ถาม-ตอบ survey ใช้ได้หลาย case

ทั้งสอง module อยู่ใน service เดียวกัน share webhook handler และ proxy-client

---

# Multi-Agent Development Setup

## ใช้ multi-agent-workflow-kit พัฒนาโปรเจค

### Concept
ใช้ 2 AI agents ทำงานพร้อมกัน แต่ละ agent รับผิดชอบ package ของตัวเอง:

```
┌─────────────────────────────────────────────────┐
│              tmux session (maw)                 │
├───────────────────────┬─────────────────────────┤
│   Agent 1             │   Agent 2               │
│   api-service         │   admin-ui              │
│   branch: agent-1-api │   branch: agent-2-admin │
│   NestJS+Mongoose     │   React + Vite          │
│   (Game + Survey)     │   (Game Admin Only)     │
└───────────────────────┴─────────────────────────┘
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

ไฟล์ `.agents/agents.yaml`:

```yaml
agents:
  1:
    branch: agent-1-api
    worktree_path: agents/1
    model: default
    description: "API Service Agent - พัฒนา NestJS + Mongoose (Game + Survey modules)"
    focus:
      - packages/api-service/**

  2:
    branch: agent-2-admin
    worktree_path: agents/2
    model: default
    description: "Admin UI Agent - พัฒนา React + Vite + TailwindCSS (Game Admin Only)"
    focus:
      - packages/admin-ui/**
```

### Workflow Commands

```bash
# เข้า session
maw attach

# สั่งงาน agent
maw hey 1 "สร้าง NestJS project ใน packages/api-service พร้อม Game + Survey modules"
maw hey 2 "สร้าง Vite + React project ใน packages/admin-ui"

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
2. maw hey 1 "task for api"      # สั่งงาน agent 1 (API Service)
3. maw hey 2 "task for admin"    # สั่งงาน agent 2 (Admin UI)
4. (รอ agents ทำงาน)
5. maw sync                      # merge changes
6. ทดสอบ integration
7. commit & push
```

### Directory Structure หลัง Setup

```
line-prophunt/
├── .agents/
│   └── agents.yaml              # Agent configuration
├── .envrc                       # direnv config
├── agents/
│   ├── 1/                       # Agent 1 worktree (api-service)
│   └── 2/                       # Agent 2 worktree (admin-ui)
├── packages/
│   ├── api-service/             # Game + Survey รวมกัน
│   └── admin-ui/
├── docs/
│   └── DESIGN.md
└── README.md
```

---

## System Architecture

```
                         ┌─────────────────────────┐
                         │      API Service        │
                         │  ┌─────────┬─────────┐  │
                         │  │  Game   │ Survey  │  │
                         │  │ Module  │ Module  │  │
                         │  └─────────┴─────────┘  │
                         │      + MongoDB          │
                         └───────────▲─────────────┘
                                     │
LINE  ←→  livechat-next (Proxy) ─────┘  Route by keyword/trigger
```

**Use Cases:**
- **Game**: Admin broadcast เกม → ลูกค้าเล่น → รอรับรางวัล
- **Survey**: หลังแชทจบ / trigger จาก Proxy → ถาม survey → ตอบในแชท → บันทึก

**หมายเหตุ:** ทั้งสอง module อยู่ใน service เดียวกัน share webhook + proxy-client + database

## Tech Stack

### API Service (Game + Survey)
- **Runtime**: Node.js + TypeScript
- **Framework**: NestJS
- **Database**: MongoDB + Mongoose (เหมือน livechat-next)
- **Modules**: Game, Survey, Webhook, ProxyClient

### Admin UI (Game Only)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + shadcn/ui

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

# API SERVICE

## Game Module Flow

```
Admin broadcast เกม → User ได้รับข้อความเชิญเล่น
User พิมพ์ "เล่น" หรือ keyword → Proxy forward → API Service
API Service ส่งรูป 3 ช่อง + "ตอบ 1, 2, หรือ 3"
User พิมพ์ "2" → API Service ตรวจคำตอบ
ถูก → "ยินดีด้วย! รอ admin แจ้งรางวัล"
ผิด → "เสียใจด้วย ลองใหม่นะ!"
```

## Database Schema (Game Module)

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

## Survey Module Flow

```
Trigger (หลังแชทจบ/หลังเกม/manual) → Proxy เรียก Survey Service
Survey Service ส่งข้อความ "ให้คะแนน 1-5"
User พิมพ์ "5" → Survey Service บันทึกลง MongoDB + ตอบ "ขอบคุณ!" → จบ
```

## Database Schema (Survey Module)

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
MONGODB_URI=mongodb://localhost:27017/prophunt
SURVEY_QUESTION="กรุณาให้คะแนนบริการ 1-5"
SURVEY_THANK_YOU="ขอบคุณสำหรับความคิดเห็น!"
```

---

## Project Structure (Monorepo)

```
line-prophunt/
├── packages/
│   │
│   ├── api-service/              # API Service (Game + Survey รวมกัน)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   │
│   │   │   ├── webhook/          # Shared: รับ webhook จาก Proxy
│   │   │   │   ├── webhook.controller.ts
│   │   │   │   └── webhook.module.ts
│   │   │   │
│   │   │   ├── proxy-client/     # Shared: ส่ง response กลับ
│   │   │   │   ├── proxy-client.service.ts
│   │   │   │   └── proxy-client.module.ts
│   │   │   │
│   │   │   ├── game/             # Game Module
│   │   │   │   ├── schemas/
│   │   │   │   │   ├── player.schema.ts
│   │   │   │   │   ├── game.schema.ts
│   │   │   │   │   └── game-session.schema.ts
│   │   │   │   ├── game.service.ts
│   │   │   │   ├── game.controller.ts
│   │   │   │   └── game.module.ts
│   │   │   │
│   │   │   ├── survey/           # Survey Module
│   │   │   │   ├── schemas/
│   │   │   │   │   ├── survey-session.schema.ts
│   │   │   │   │   └── survey-response.schema.ts
│   │   │   │   ├── survey.service.ts
│   │   │   │   └── survey.module.ts
│   │   │   │
│   │   │   └── admin/            # Admin API (Game only)
│   │   │       ├── admin.controller.ts
│   │   │       └── admin.module.ts
│   │   │
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── admin-ui/                 # Admin UI (สำหรับ Game)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Games.tsx
│       │   │   └── Sessions.tsx
│       │   └── App.tsx
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml            # รัน services
├── package.json                  # Workspace root
└── README.md
```

---

## Implementation Steps

### Phase 1: Project Setup (Monorepo)
- [x] สร้าง monorepo structure (npm workspaces)
- [x] Setup multi-agent-workflow-kit
- [ ] Setup Docker และ docker-compose

---

### Phase 2: API Service (Game + Survey)

**2.1 Core Setup**
- [ ] สร้าง NestJS project (api-service)
- [ ] Setup MongoDB + Mongoose
- [ ] สร้าง Webhook module (shared) + signature verify
- [ ] สร้าง ProxyClient module (shared)

**2.2 Game Module**
- [ ] Player schema + service
- [ ] Game schema + service (CRUD)
- [ ] GameSession schema + service (state management)
- [ ] ส่งรูปเกม + ตรวจคำตอบ

**2.3 Survey Module**
- [ ] SurveySession schema + service
- [ ] SurveyResponse schema + service
- [ ] Survey logic (ถาม → รอตอบ → บันทึก → ขอบคุณ)

**2.4 Admin API (Game only)**
- [ ] CRUD Games
- [ ] ดูรายการผู้ชนะ
- [ ] Mark จ่ายรางวัลแล้ว
- [ ] Dashboard statistics

---

### Phase 3: Admin UI (Game Only)

- [ ] สร้าง React + Vite + TailwindCSS
- [ ] Dashboard page
- [ ] Games management page
- [ ] Winners page

---

### Phase 4: Deploy

- [ ] Docker build ทั้ง 2 packages (api-service, admin-ui)
- [ ] ลงทะเบียน webhook ที่ livechat-next (1 webhook สำหรับทั้ง Game + Survey)
- [ ] Deploy to VPS

---

## Scope
- เกมทำงานกับ **ทุก LINE OA** ที่ลงทะเบียนใน Proxy
- ใช้ `groupId` จาก webhook payload เพื่อแยก OA

---

## Message Response Types

Proxy รองรับส่งรูปภาพได้ เราสามารถส่ง:

| Step | Message จาก API Service |
|------|--------------------------|
| **Start** | รูปเกม (3 ช่อง) + "หาจุดผิด! ตอบ 1, 2, หรือ 3" |
| **Win** | "ยินดีด้วย! ตอบถูกแล้ว รอ admin แจ้งรางวัล" |
| **Lose** | "เสียใจด้วย ตอบผิด ลองใหม่นะ!" |
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

### API Service
| File | Description |
|------|-------------|
| `packages/api-service/src/webhook/webhook.controller.ts` | รับ webhook จาก Proxy (shared) |
| `packages/api-service/src/proxy-client/proxy-client.service.ts` | ส่ง response กลับ Proxy (shared) |
| `packages/api-service/src/game/game.service.ts` | Game logic |
| `packages/api-service/src/game/schemas/*.schema.ts` | Game mongoose schemas |
| `packages/api-service/src/survey/survey.service.ts` | Survey logic |
| `packages/api-service/src/survey/schemas/*.schema.ts` | Survey mongoose schemas |
| `packages/api-service/src/admin/admin.controller.ts` | Admin REST API (Game only) |

---

## Admin API Endpoints (Game Only)

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

### API Service
```env
MONGODB_URI=mongodb://localhost:27017/prophunt
WEBHOOK_SECRET=xxx              # สำหรับ verify signature จาก Proxy
PORT=3001
ADMIN_USERNAME=admin
ADMIN_PASSWORD=xxx

# Survey Config
SURVEY_QUESTION="กรุณาให้คะแนนบริการของเรา 1-5 คะแนน"
SURVEY_THANK_YOU="ขอบคุณสำหรับความคิดเห็นครับ!"
```

### Admin UI
```env
VITE_API_URL=http://localhost:3001
```

---

## Admin UI Design (Game Only)

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
│  Dashboard                                            [Logout]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│  │  Players    │ │  Sessions   │ │  Winners    │ │  Win       ││
│  │    1,234    │ │    5,678    │ │    890      │ │   Rate     ││
│  │   +12%      │ │   +8%       │ │   +15%      │ │   45%      ││
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
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- `StatsCard`: แสดงตัวเลขสถิติ + % เปลี่ยนแปลง (Players, Sessions, Winners, Win Rate)
- `SessionsChart`: Line chart แสดง sessions ต่อวัน
- `RecentWinners`: รายการผู้ชนะล่าสุด 5 คน

---

#### 2. Games Management (`/games`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Games                                       [+ Create Game]    │
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

#### Phase 3: Admin UI (Detailed)

**3.1 Setup**
- [ ] สร้าง Vite + React + TypeScript project
- [ ] Setup TailwindCSS + shadcn/ui
- [ ] Setup React Router
- [ ] Setup TanStack Query
- [ ] สร้าง API client (axios)

**3.2 Layout & Auth**
- [ ] สร้าง Layout component (Sidebar)
- [ ] สร้าง Login page
- [ ] Setup authentication (JWT)
- [ ] Protected routes

**3.3 Dashboard**
- [ ] StatsCard component (Players, Sessions, Winners)
- [ ] Sessions chart (Recharts) - last 7 days
- [ ] Recent winners list

**3.4 Games Page**
- [ ] Games grid view
- [ ] Game card component
- [ ] Create/Edit game modal
- [ ] Image uploader component
- [ ] Position selector (1/2/3)

**3.5 Sessions Page**
- [ ] Sessions table (TanStack Table)
- [ ] Filters (Winners only, date range)
- [ ] Mark reward paid button
- [ ] Pagination
