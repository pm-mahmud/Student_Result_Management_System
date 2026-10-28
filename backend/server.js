require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { gradeFromMarks } = require('./grading');
const { requireAuth, requireRole } = require('./middleware');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const sessionOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_result_management',
  createDatabaseTable: true
};
const sessionStore = new MySQLStore(sessionOptions);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({
  name: 'srms.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 8 }
}));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const clean = value => typeof value === 'string' ? value.trim() : value;

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Student Result Management System' }));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const name = clean(req.body.name);
  const email = clean(req.body.email)?.toLowerCase();
  const password = req.body.password;
  const studentId = clean(req.body.studentId);
  const department = clean(req.body.department);
  const semester = clean(req.body.semester);
  if (!name || !email || !password || !studentId || !department || !semester)
    return res.status(400).json({ message: 'All fields are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ message: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

  const [existing] = await pool.execute('SELECT id FROM users WHERE email=?', [email]);
  if (existing.length) return res.status(409).json({ message: 'This email is already registered.' });
  const [existingStudent] = await pool.execute('SELECT id FROM students WHERE student_id=?', [studentId]);
  if (existingStudent.length) return res.status(409).json({ message: 'This student ID is already registered.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const hash = await bcrypt.hash(password, 12);
    const [userResult] = await connection.execute(
      'INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
      [name,email,hash,'student']
    );
    await connection.execute(
      'INSERT INTO students (user_id,student_id,department,semester) VALUES (?,?,?,?)',
      [userResult.insertId,studentId,department,semester]
    );
    await connection.commit();
    res.status(201).json({ message: 'Registration successful. You can now sign in.' });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = clean(req.body.email)?.toLowerCase();
  const password = req.body.password;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  const [rows] = await pool.execute('SELECT id,name,email,password_hash,role FROM users WHERE email=?', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
    return res.status(401).json({ message: 'Incorrect email or password.' });
  req.session.user = { id: rows[0].id, name: rows[0].name, email: rows[0].email, role: rows[0].role };
  res.json({ user: req.session.user });
}));

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.session.user }));
app.post('/api/auth/logout', requireAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Could not sign out.' });
    res.clearCookie('srms.sid');
    res.json({ message: 'Signed out successfully.' });
  });
});

// Student self-registration is public; admin account cannot be created through this endpoint.
app.get('/api/student/me', requireRole('student'), asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT s.id, s.student_id AS studentId, s.department, s.semester, u.name, u.email
     FROM students s JOIN users u ON u.id=s.user_id WHERE s.user_id=?`,
    [req.session.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Student profile not found.' });
  res.json({ student: rows[0] });
}));

app.get('/api/student/results', requireRole('student'), asyncRoute(async (req, res) => {
  const [studentRows] = await pool.execute('SELECT id FROM students WHERE user_id=?', [req.session.user.id]);
  if (!studentRows.length) return res.status(404).json({ message: 'Student profile not found.' });
  const [rows] = await pool.execute(
    `SELECT sub.subject_code AS subjectCode, sub.subject_name AS subjectName, sub.credit,
            r.marks
     FROM results r JOIN subjects sub ON sub.id=r.subject_id
     WHERE r.student_id=? ORDER BY sub.subject_code`,
    [studentRows[0].id]
  );
  const results = rows.map(r => ({ ...r, ...gradeFromMarks(r.marks) }));
  const totalCredits = results.reduce((sum, r) => sum + Number(r.credit), 0);
  const gpa = totalCredits ? results.reduce((sum, r) => sum + r.gradePoint * Number(r.credit), 0) / totalCredits : 0;
  res.json({ results, gpa: Number(gpa.toFixed(2)), totalCredits });
}));

// Admin overview
app.get('/api/admin/overview', requireRole('admin'), asyncRoute(async (req, res) => {
  const [[students]] = await pool.query('SELECT COUNT(*) AS count FROM students');
  const [[subjects]] = await pool.query('SELECT COUNT(*) AS count FROM subjects');
  const [[results]] = await pool.query('SELECT COUNT(*) AS count FROM results');
  res.json({ students: students.count, subjects: subjects.count, results: results.count });
}));

app.get('/api/admin/students', requireRole('admin'), asyncRoute(async (req, res) => {
  const search = `%${clean(req.query.search || '')}%`;
  const [rows] = await pool.execute(
    `SELECT s.id, s.student_id AS studentId, s.department, s.semester, u.name, u.email
     FROM students s JOIN users u ON u.id=s.user_id
     WHERE u.name LIKE ? OR u.email LIKE ? OR s.student_id LIKE ? ORDER BY s.id DESC`,
    [search, search, search]
  );
  res.json({ students: rows });
}));

app.post('/api/admin/students', requireRole('admin'), asyncRoute(async (req, res) => {
  const { name, email, password, studentId, department, semester } = req.body;
  const vals = [name,email,studentId,department,semester];
  if (vals.some(v => typeof v !== 'string' || !v.trim()) || typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ message: 'Fill all fields. Password must be at least 8 characters.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT id FROM users WHERE email=?', [email.trim().toLowerCase()]);
    if (existing.length) { await connection.rollback(); return res.status(409).json({ message: 'Email already exists.' }); }
    const [sid] = await connection.execute('SELECT id FROM students WHERE student_id=?', [studentId.trim()]);
    if (sid.length) { await connection.rollback(); return res.status(409).json({ message: 'Student ID already exists.' }); }
    const hash = await bcrypt.hash(password, 12);
    const [u] = await connection.execute(
      'INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)',
      [name.trim(),email.trim().toLowerCase(),hash,'student']
    );
    await connection.execute(
      'INSERT INTO students(user_id,student_id,department,semester) VALUES(?,?,?,?)',
      [u.insertId,studentId.trim(),department.trim(),semester.trim()]
    );
    await connection.commit();
    res.status(201).json({ message: 'Student created.' });
  } catch (e) { await connection.rollback(); throw e; }
  finally { connection.release(); }
}));

app.put('/api/admin/students/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const { name, email, studentId, department, semester } = req.body;
  if (![name,email,studentId,department,semester].every(v => typeof v === 'string' && v.trim()))
    return res.status(400).json({ message: 'All fields are required.' });
  const [rows] = await pool.execute('SELECT user_id FROM students WHERE id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Student not found.' });
  const [dup] = await pool.execute('SELECT id FROM users WHERE email=? AND id<>?', [email.trim().toLowerCase(), rows[0].user_id]);
  if (dup.length) return res.status(409).json({ message: 'Email already belongs to another account.' });
  const [dupSid] = await pool.execute('SELECT id FROM students WHERE student_id=? AND id<>?', [studentId.trim(), req.params.id]);
  if (dupSid.length) return res.status(409).json({ message: 'Student ID already exists.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('UPDATE users SET name=?, email=? WHERE id=?', [name.trim(),email.trim().toLowerCase(),rows[0].user_id]);
    await conn.execute('UPDATE students SET student_id=?,department=?,semester=? WHERE id=?',
      [studentId.trim(),department.trim(),semester.trim(),req.params.id]);
    await conn.commit();
    res.json({ message: 'Student updated.' });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.delete('/api/admin/students/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM students WHERE id=?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Student not found.' });
  res.json({ message: 'Student deleted.' });
}));

app.get('/api/admin/subjects', requireRole('admin'), asyncRoute(async (req, res) => {
  const [subjects] = await pool.query('SELECT * FROM subjects ORDER BY subject_code');
  res.json({ subjects });
}));
app.post('/api/admin/subjects', requireRole('admin'), asyncRoute(async (req, res) => {
  const { subjectCode, subjectName, credit } = req.body;
  if (![subjectCode,subjectName].every(v => typeof v === 'string' && v.trim()) ||
      !Number.isFinite(Number(credit)) || Number(credit) <= 0 || Number(credit) > 10)
    return res.status(400).json({ message: 'Enter subject code, name and valid credit (0–10).' });
  try {
    const [r] = await pool.execute('INSERT INTO subjects(subject_code,subject_name,credit) VALUES(?,?,?)',
      [subjectCode.trim().toUpperCase(),subjectName.trim(),Number(credit)]);
    res.status(201).json({ message: 'Subject created.', id: r.insertId });
  } catch (e) { if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Subject code already exists.' }); throw e; }
}));
app.put('/api/admin/subjects/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const { subjectCode, subjectName, credit } = req.body;
  if (![subjectCode,subjectName].every(v => typeof v === 'string' && v.trim()) ||
      !Number.isFinite(Number(credit)) || Number(credit) <= 0 || Number(credit) > 10)
    return res.status(400).json({ message: 'Enter valid subject details.' });
  try {
    const [r] = await pool.execute('UPDATE subjects SET subject_code=?,subject_name=?,credit=? WHERE id=?',
      [subjectCode.trim().toUpperCase(),subjectName.trim(),Number(credit),req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Subject not found.' });
    res.json({ message: 'Subject updated.' });
  } catch (e) { if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Subject code already exists.' }); throw e; }
}));
app.delete('/api/admin/subjects/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const [r] = await pool.execute('DELETE FROM subjects WHERE id=?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Subject not found.' });
  res.json({ message: 'Subject deleted.' });
}));

app.get('/api/admin/results', requireRole('admin'), asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.id, r.student_id AS studentDbId, s.student_id AS studentId, u.name AS studentName,
      sub.id AS subjectDbId, sub.subject_code AS subjectCode, sub.subject_name AS subjectName,
      sub.credit, r.marks
     FROM results r JOIN students s ON s.id=r.student_id JOIN users u ON u.id=s.user_id
     JOIN subjects sub ON sub.id=r.subject_id ORDER BY u.name, sub.subject_code`
  );
  res.json({ results: rows.map(r => ({ ...r, ...gradeFromMarks(r.marks) })) });
}));
app.post('/api/admin/results', requireRole('admin'), asyncRoute(async (req, res) => {
  const studentId = Number(req.body.studentDbId);
  const subjectId = Number(req.body.subjectDbId);
  const marks = Number(req.body.marks);
  if (!Number.isInteger(studentId) || !Number.isInteger(subjectId) || !Number.isFinite(marks) || marks < 0 || marks > 100)
    return res.status(400).json({ message: 'Choose a student, choose a subject and enter marks from 0 to 100.' });
  const [[student]] = await pool.execute('SELECT id FROM students WHERE id=?', [studentId]);
  const [[subject]] = await pool.execute('SELECT id FROM subjects WHERE id=?', [subjectId]);
  if (!student || !subject) return res.status(404).json({ message: 'Student or subject not found.' });
  await pool.execute(
    `INSERT INTO results(student_id,subject_id,marks) VALUES(?,?,?)
     ON DUPLICATE KEY UPDATE marks=VALUES(marks)`,
    [studentId,subjectId,marks]
  );
  res.json({ message: 'Marks saved.' });
}));
app.delete('/api/admin/results/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const [r] = await pool.execute('DELETE FROM results WHERE id=?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Result not found.' });
  res.json({ message: 'Result deleted.' });
}));

app.use((req, res) => res.status(404).json({ message: 'API endpoint not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ECONNREFUSED')
    return res.status(500).json({ message: 'Database connection failed or tables are missing. Check backend/.env and run database/schema.sql.' });
  res.status(500).json({ message: 'Unexpected server error.' });
});

(async () => {
  try {
    await pool.query('SELECT 1');
    app.listen(PORT, () => console.log(`SRMS API running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('Could not connect to MySQL. Check backend/.env and run database/schema.sql.', err.message);
    process.exit(1);
  }
})();
