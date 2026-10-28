# Student Result Management System

Full-stack Web Technologies project based on the submitted proposal:
- Frontend: React + Vite + React Router + Axios
- Backend: Node.js + Express
- Database: MySQL
- Authentication: Express sessions, bcryptjs password hashing, role-based authorization

## Features
- Student registration, login and logout
- Separate Admin Login page
- Role-protected Admin and Student dashboards
- Admin: create/search/update/delete student records, manage subjects, enter/update marks
- Student: view own profile and subject-wise results, grades and GPA
- Backend-side input validation and access control

## Requirements
- Node.js 18+
- MySQL 8+
- npm

## 1. Set up MySQL
Open MySQL Workbench or the MySQL command line and run `database/schema.sql`.
This creates the database and tables.

Create the demo admin account from the backend folder after configuring `.env`:
```bash
npm run seed-admin
```
Demo admin login:
- Email: `admin@srms.local`
- Password: `Admin@12345`

Change the default password and `SESSION_SECRET` before using this outside a class/demo environment.

## 2. Configure backend
Open a terminal in `backend/`:
```bash
npm install
```
Copy `.env.example` to `.env`, then set your MySQL credentials:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=student_result_management
SESSION_SECRET=replace_this_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```
Start the backend:
```bash
npm run seed-admin
npm run dev
```
The API runs at `http://localhost:5000`.

## 3. Configure frontend
Open another terminal in `frontend/`:
```bash
npm install
npm run dev
```
Open the URL shown by Vite (usually `http://localhost:5173`).

## 4. Demo flow
1. Sign in at `/admin-login` using the admin credentials above.
2. Add subjects in the Subjects tab.
3. Add students in the Students tab. Creating a student also creates their login account.
4. Use the student's email and the initial password you set when adding them to sign in at `/login`.
5. Enter marks in the Results tab.
6. Sign in as the student to see the calculated grades and GPA.

## Grading scale
- 80–100: A+ (4.00)
- 75–79: A (3.75)
- 70–74: A- (3.50)
- 65–69: B+ (3.25)
- 60–64: B (3.00)
- 55–59: B- (2.75)
- 50–54: C+ (2.50)
- 45–49: C (2.25)
- 40–44: D (2.00)
- 0–39: F (0.00)

GPA is credit-weighted: sum(grade point × subject credit) / sum(subject credits).
This is a course-project demo, not a production-ready student information system.
