---
description: Implementation of Secretary Minutes and Acts Registration
---

# Secretary Module: Minutes and Acts

This workflow outlines the steps to implement the registration of Minutes (Atas) and Acts (Atos) for the Secretary module.

## 1. Database Schema Update
- [ ] Add `Minute` model to `prisma/schema.prisma`.
- [ ] Add `MinuteType` enum (optional, or use String).
- [ ] Add relations to `User` model (`authoredMinutes`).
- [ ] Run migration/db push.

## 2. Backend Service & Controller
- [ ] Create `src/secretary/minutes.service.ts`.
  - Methods: `create`, `findAll` (with filters), `findOne`, `update`, `remove`.
  - Logic to auto-generate minute number (optional but good).
- [ ] Create `src/secretary/minutes.controller.ts`.
  - Endpoints: `POST /secretary/minutes`, `GET /secretary/minutes`, `GET /secretary/minutes/:id`, `PATCH /secretary/minutes/:id`, `DELETE /secretary/minutes/:id`.
- [ ] Register in `AppModule` or `SecretaryModule`.

## 3. Frontend Components
- [ ] Create `src/components/SecretaryMinutesList.tsx`.
  - Table of minutes.
  - Actions: View, Edit, Delete (Print/PDF later).
- [ ] Create `src/components/SecretaryMinuteEditor.tsx`.
  - Form: Title, Date, Type, Content (Textarea).
  - Validation.
- [ ] Update `src/pages/Secretary.tsx`.
  - Add Tabs: "Membros" and "Atas & Atos".
  - Integrate the new components.

## 4. Verification
- [ ] Test creating a minute.
- [ ] Test listing minutes.
- [ ] Test editing/deleting.
- [ ] Verify permissions (Secretary/Admin only).
