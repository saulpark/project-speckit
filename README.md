# Project SpecKit

## Overview
Authentication system implementation using Node.js, TypeScript, and MongoDB, following the **official GitHub Spec-Kit methodology** for Spec-Driven Development.

## Spec-Kit Workflow for New Joiners

This project follows the official **Spec-Kit methodology** for structured development. Here's the proper workflow order:

### 🎯 Step 1: Constitution
**Purpose**: Establish project governing principles and development guidelines
```bash
claude SpecKit constitution
```
**Output**: `.specify/constitution.md` - Project principles and non-negotiable standards

### 📋 Step 2: Specify (Requirements)
**Purpose**: Define what you want to build (the "what" and "why")
```bash
claude SpecKit specify "Feature description here"
```
**Output**: `.specify/specs/XXX-feature-name.md` - Feature specification with user stories, requirements, and acceptance criteria

### 🏗️ Step 3: Plan (Technical Design)
**Purpose**: Create technical implementation strategies (the "how")
```bash
claude SpecKit plan XXX-feature-name.md
```
**Output**: `.specify/plans/XXX-feature-name-plan.md` - Technical architecture, components, and implementation approach

### ✅ Step 4: Tasks (Action Items)
**Purpose**: Break implementation into actionable items
```bash
claude SpecKit tasks XXX-feature-name-plan.md
```
**Output**: `.specify/tasks/XXX-feature-name-tasks.md` - Detailed task breakdown with dependencies and timelines

### 🔨 Step 5: Implement (Development)
**Purpose**: Execute tasks systematically
```bash
claude SpecKit implement XXX-feature-name-tasks.md
```
**Output**: Working code following the specifications and plan

## 🗂️ Spec-Kit File Structure
```
.specify/
├── constitution.md          # Project principles
├── specs/                  # Feature specifications
│   ├── 001-authentication.md
│   ├── 002-logout-enhancement.md
│   └── ...
├── plans/                  # Implementation plans
│   └── ...
├── tasks/                  # Task breakdowns
│   └── ...
└── artifacts/              # Generated artifacts
```

## 📖 Additional Commands
- `claude SpecKit analyze` - Check consistency across artifacts
- `claude SpecKit checklist` - Quality validation checklist

## ⚡ Quick Start for New Features
1. **Always start with Constitution** (if not already created)
2. **Specify the feature** - What do you want to build?
3. **Plan the implementation** - How will you build it?
4. **Break into tasks** - What are the actionable steps?
5. **Implement systematically** - Follow the task list

## 🚨 Important Notes
- **Never skip steps** - Each phase builds on the previous one
- **Follow the order** - Constitution → Specify → Plan → Tasks → Implement
- **Document everything** - All artifacts are versioned and tracked
- **Quality gates** - Each step has acceptance criteria

## Current Features
- User registration and login
- JWT token-based authentication
- Password security with bcrypt
- MongoDB integration with Mongoose
- TypeScript compilation
- Comprehensive security middleware

## Setup
1. Install dependencies: `npm install`
2. Start MongoDB: `docker-compose up -d`
3. Build project: `npm run build`
4. Start development server: `npm run dev`

## API Endpoints
- POST `/auth/register` - User registration
- POST `/auth/login` - User authentication
- POST `/auth/logout` - User logout
- GET `/auth/me` - Get current user
- GET `/auth/profile` - Get user profile
- GET `/auth/stats` - Authentication statistics

## Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode

## Development
- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm run start` - Start production server

## Architecture
Built with modern Node.js stack focusing on security and scalability, following Spec-Driven Development practices.
