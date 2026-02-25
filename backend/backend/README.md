# EVSProcure Chatbot Backend - Code Structure Documentation

## Overview

This backend has been restructured from a monolithic 1600-line `main.py` into a clean, production-grade modular architecture following industry best practices for FastAPI applications.

## Directory Structure

```
backend/
├── main.py                    # Application entry point (52 lines)
├── jwt_utils.py               # JWT token utilities (existing)
├── patterns.json              # Pattern configurations (existing)
│
├── config/                    # Configuration module
│   ├── __init__.py
│   ├── settings.py           # Environment variables and app settings
│   └── constants.py          # API URLs and constant values
│
├── models/                    # Data models
│   ├── __init__.py
│   └── schemas.py            # All Pydantic request/response models
│
├── services/                  # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py       # Authentication API integration
│   ├── cart_service.py       # Cart management API integration
│   ├── pattern_service.py    # Pattern matching and NLP logic
│   └── email_service.py      # Email notification service
│
├── utils/                     # Utility functions
│   ├── __init__.py
│   ├── session_manager.py    # User session management
│   └── string_utils.py       # String matching utilities
│
└── routes/                    # API endpoint handlers
    ├── __init__.py
    ├── chat.py               # Chat endpoint
    ├── auth.py               # Authentication endpoint
    ├── cart.py               # Cart approval endpoint
    └── ticket.py             # Support ticket endpoint
```

## Module Descriptions

### Main Application (`main.py`)
- **Purpose**: Clean entry point for the FastAPI application
- **Responsibilities**:
  - Initialize FastAPI app
  - Configure CORS middleware
  - Register all route handlers
  - Provide health check endpoint
- **Lines of Code**: ~52 (down from 1600)

### Configuration (`config/`)

#### `settings.py`
- **Purpose**: Centralized configuration management
- **Contents**:
  - SMTP email settings
  - CORS allowed origins
  - Pattern file path
  - Server host and port configuration
- **Environment Variables**: Loads from `.env` file using dotenv

#### `constants.py`
- **Purpose**: Application-wide constants
- **Contents**:
  - External API base URL
  - Status keywords for pattern matching
  - Cart creation pattern list

### Models (`models/`)

#### `schemas.py`
- **Purpose**: Pydantic models for request/response validation
- **Models**:
  - `Message`: Chat message requests
  - `Issue`: Support ticket submission
  - `IDRequest`: ID-based queries
  - `AuthRequest`: User authentication
  - `ApproveCartRequest`: Cart approval/rejection

### Services (`services/`)

#### `auth_service.py`
- **Purpose**: User authentication and profile management
- **Functions**:
  - `authenticate_user()`: Login via external API
  - `get_user_details()`: Fetch user profile from token

#### `cart_service.py`
- **Purpose**: Cart management operations
- **Functions**:
  - `get_cart_details()`: Retrieve cart information
  - `create_cart()`: Create new shopping cart
  - `get_pending_approval_carts()`: List pending approvals
  - `approve_cart()`: Approve or reject cart

#### `pattern_service.py`
- **Purpose**: Intelligent pattern matching for chatbot
- **Functions**:
  - `load_pattern()`: Load patterns from JSON
  - `search_patterns()`: Main pattern search logic
  - `fuzzy_search_patterns()`: Fuzzy pattern matching
- **Matching Strategies**:
  1. Exact match
  2. Substring containment
  3. Word subset matching
  4. Fuzzy word similarity
  5. Overall string similarity

#### `email_service.py`
- **Purpose**: Email notification system
- **Functions**:
  - `send_ticket_email()`: Send ticket notifications to user and admin

### Utilities (`utils/`)

#### `session_manager.py`
- **Purpose**: User session state management
- **Storage**: In-memory dictionary
- **Session Data**:
  - Auth token
  - Entity/company ID
  - Query state (waiting for ID input)

#### `string_utils.py`
- **Purpose**: String manipulation and fuzzy matching
- **Functions**:
  - `calculate_similarity()`: String similarity ratio
  - `fuzzy_match_pattern()`: Advanced fuzzy matching with multiple strategies

### Routes (`routes/`)

#### `chat.py`
- **Purpose**: Main chat endpoint
- **Features**:
  - Pattern-based query matching
  - Cart creation automation
  - Pending cart approval listing
  - Cart status/details retrieval
- **Endpoint**: `POST /chat`

#### `auth.py`
- **Purpose**: User authentication
- **Features**:
  - User login
  - JWT token generation
  - User profile extraction
- **Endpoint**: `POST /auth/authenticate`

#### `cart.py`
- **Purpose**: Cart approval operations
- **Features**:
  - Cart approval
  - Cart rejection with notes
  - Token validation
- **Endpoint**: `POST /approve-cart`

#### `ticket.py`
- **Purpose**: Support ticket submission
- **Features**:
  - Ticket ID generation
  - Email notifications
- **Endpoint**: `POST /ticket`

## Key Improvements

### 1. Separation of Concerns
- **Before**: All logic in one 1600-line file
- **After**: Organized into 15 focused modules

### 2. Code Reusability
- Services can be imported and used across multiple routes
- Utilities are shared across the application

### 3. Maintainability
- Each file has a single, clear responsibility
- Easy to locate and modify specific functionality

### 4. Testability
- Each module can be tested independently
- Mock dependencies easily for unit testing

### 5. Documentation
- Every module, class, and function has comprehensive docstrings
- Clear explanations of parameters, returns, and raises

### 6. Code Quality
- Removed duplicate imports
- Eliminated unused code
- Consistent error handling patterns
- Proper type hints

## API Endpoints

### Health Check
```
GET /
```

### Chat
```
POST /chat
Body: {text, session_id?, token?}
```

### Authentication
```
POST /auth/authenticate
Body: {email, password, entityType}
```

### Cart Approval
```
POST /approve-cart
Body: {cartId, token, decision?, notes?}
```

### Support Ticket
```
POST /ticket
Body: {name, email, text, session_id?}
```

## Running the Application

### Install Dependencies
```bash
pip install fastapi uvicorn httpx pydantic python-dotenv
```

### Start Server
```bash
# From the backend directory
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Environment Variables
Create a `.env` file with:
```
SMTP_USERNAME=your_email@example.com
SMTP_PASSWORD=your_password
ADMIN_EMAIL=admin@example.com
```

## Design Patterns Used

1. **Layered Architecture**: Clear separation between routes, services, and data models
2. **Dependency Injection**: Services are injected into routes
3. **Repository Pattern**: Services handle all external API interactions
4. **Factory Pattern**: Session creation and management
5. **Strategy Pattern**: Multiple pattern matching strategies

## Future Enhancements

- Add database layer for persistent sessions
- Implement caching for API responses
- Add comprehensive unit tests
- Implement logging framework
- Add API rate limiting
- Create Docker containerization

## Migration Notes

### No Breaking Changes
- All endpoints maintain the same request/response structure
- All functionality preserved exactly as before
- No changes to API contracts

### What Changed
- File organization only
- Import statements
- Code structure and modularity

### Testing Checklist
✅ All endpoints respond correctly
✅ Pattern matching works as before
✅ Cart creation functionality intact
✅ Cart approval flow functioning
✅ Ticket submission working
✅ Session management preserved
