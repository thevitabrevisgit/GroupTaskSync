# TaskShare Application

## Overview

TaskShare is a full-stack collaborative task management application built for a 6-person team with Netflix-style profile selection and social media feed layout. The application features user profiles, task assignment, time tracking, note-taking, and admin controls. Built with React, Express, and PostgreSQL using modern technologies including shadcn/ui components and Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

✓ Implemented Netflix-style profile selection page with 6 team members (Sam, Sean, Gabe, Evelyn, Beth, Tim)
✓ Added admin PIN verification system (PIN: 0525) for Beth and Tim
✓ Created social media feed layout with task cards displaying images
✓ Built task filtering system (All Tasks, My Tasks, Indoor, Outdoor, Chores, Projects)
✓ Integrated PostgreSQL database with full schema setup
✓ Added file upload system for task images and user avatars
✓ Fixed SelectItem error in task creation form
✓ Enhanced mobile camera integration with native capture support
✓ Added PWA features for mobile app-like experience
✓ Implemented mobile-friendly UI with safe area support
✓ Fixed manage profiles button functionality with modal popup
✓ Improved profile persistence to prevent logout on refresh/swipe
✓ Standardized all date handling to Central Standard Time (CST)
✓ Restored dark theme backgrounds and color-coded task borders
✓ Removed admin-only restrictions - everyone can now create tasks
✓ Fixed date timezone issues - dates now save and display correctly in CST
✓ Added consistent color coding for user avatars throughout the app

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Build Tool**: Vite for development and bundling
- **UI Components**: Comprehensive set of shadcn/ui components including forms, dialogs, and data display

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon serverless PostgreSQL
- **File Handling**: Multer for image uploads with local storage
- **Session Management**: Express sessions with PostgreSQL store
- **API Structure**: RESTful API with centralized route registration

### Database Schema
The application uses a relational database with four main entities:
- **Users**: Profile information with admin privileges
- **Tasks**: Core task data with assignment, priority, and completion tracking
- **Time Entries**: Time tracking for tasks
- **Task Notes**: Collaborative notes on tasks

### Authentication & Authorization
- Simple user selection system (no passwords)
- Admin PIN verification for administrative users
- Session-based user tracking with localStorage persistence
- Role-based access control for admin functions

## Key Components

### Core Features
1. **Profile Selection**: Multi-user profile selection with admin PIN protection
2. **Task Management**: Create, assign, and complete tasks with priority levels
3. **Time Tracking**: Log hours worked on specific tasks
4. **Notes System**: Add collaborative notes to tasks
5. **File Uploads**: Image attachment support for tasks
6. **Filtering**: Task filtering by assignment, tags, and categories

### Frontend Components
- **Profile Selection Page**: User authentication interface
- **Task Feed**: Main dashboard with task cards and filtering
- **Task Detail Modal**: Comprehensive task view with time tracking and notes
- **Add Task Modal**: Task creation form with file upload
- **Admin PIN Modal**: Secure admin verification

### Backend Services
- **Storage Layer**: Database abstraction with TypeScript interfaces
- **Route Handlers**: Express routes for CRUD operations
- **File Management**: Image upload and serving capabilities
- **Database Initialization**: Automatic user seeding

## Data Flow

1. **User Authentication**: Users select profiles, admins verify with PIN
2. **Task Operations**: CRUD operations flow through Express API to PostgreSQL
3. **Real-time Updates**: React Query handles cache invalidation and refetching
4. **File Uploads**: Images stored locally and served via Express static middleware
5. **Session Management**: User state persisted in localStorage and server sessions

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **multer**: File upload handling
- **express**: Web server framework

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the application
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Fast JavaScript bundling for production

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles Express server to `dist/index.js`
- **Database**: Drizzle migrations handle schema changes

### Environment Requirements
- **NODE_ENV**: Environment specification
- **DATABASE_URL**: PostgreSQL connection string
- **File Storage**: Local uploads directory for images

### Development Workflow
- **Hot Reloading**: Vite dev server with HMR
- **Type Checking**: TypeScript compilation checks
- **Database**: Drizzle push for schema synchronization

The application is designed for easy deployment on platforms supporting Node.js with PostgreSQL, with particular optimization for Replit's environment including specialized error handling and development tools.