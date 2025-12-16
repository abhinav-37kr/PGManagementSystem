# PG Management System

A simple PG (Paying Guest) Management System built with plain HTML, Tailwind CSS, and JavaScript, using Supabase for authentication and database management.

## Features

- **Owner Dashboard**: Manage users, generate rent, and handle maintenance requests
- **User/Tenant Dashboard**: View pending rents and submit maintenance requests
- **Authentication**: Owner uses Supabase Auth, users authenticate via database table
- **Responsive Design**: Modern UI built with Tailwind CSS

## Setup Instructions

### 1. Supabase Configuration

1. Create a new project at [Supabase](https://supabase.com)
2. Get your project URL and anon key from Settings → API
3. Open `assets/js/supabaseClient.js` and replace the placeholders:
   ```javascript
   const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";
   ```

### 2. Database Schema

Create the following tables in your Supabase project:

#### `users` Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  room TEXT NOT NULL,
  contact_no TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  deposit NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `rents` Table
```sql
CREATE TABLE rents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  month TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `maintenance` Table
```sql
CREATE TABLE maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  request TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Owner Account Setup

1. In Supabase Dashboard, go to Authentication → Users
2. Create a new user with email and password (this will be your owner account)
3. Use these credentials to log in as "Owner" on the login page

### 4. Running the Application

1. Simply open `index.html` in a web browser
2. Or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```
3. Navigate to `http://localhost:8000` in your browser

## Application Flow

### Login (`index.html`)
- Users select their role (Owner or User/Tenant)
- Owner: Authenticates via Supabase Auth
- User: Authenticates by checking email/password in `users` table
- On success, redirects to respective dashboard

### Owner Dashboard (`owner.html`)
- **Add User**: Create new tenant accounts
- **Current Users List**: View all registered users
- **Rent Management**: 
  - Generate rent for all users at once
  - View all rent records
  - Mark rents as paid
- **Maintenance Requests**: View and update status of all maintenance requests

### User Dashboard (`user.html`)
- **Pending Rent**: View all unpaid rent records
- **Maintenance Requests**: 
  - Submit new maintenance requests
  - View status of submitted requests

## File Structure

```
keyvalue/
├── index.html              # Login page
├── owner.html              # Owner dashboard
├── user.html               # User dashboard
├── assets/
│   ├── css/
│   │   └── styles.css      # Custom styles
│   └── js/
│       ├── supabaseClient.js  # Supabase client configuration
│       ├── auth.js            # Authentication logic
│       ├── owner.js           # Owner dashboard functionality
│       ├── user.js            # User dashboard functionality
│       └── utils.js           # Utility functions
└── README.md              # This file
```

## Security Notes

⚠️ **Important**: This is a demo application. For production use:
- Never store passwords in plain text (use hashing)
- Implement proper authentication and authorization
- Add input validation and sanitization
- Use environment variables for sensitive configuration
- Implement proper error handling and logging

## Technologies Used

- **HTML5**: Structure
- **Tailwind CSS**: Styling (via CDN)
- **JavaScript (ES6+)**: Application logic
- **Supabase**: Backend (Authentication & Database)

## Browser Support

Works on modern browsers that support ES6 modules and async/await.

## License

This project is for educational/demo purposes.

