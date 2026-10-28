import { useEffect, useState } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserRound,
  Menu,
  X,
} from 'lucide-react';
import api, { getErrorMessage } from './api';

function Notice({ message, error }) {
  if (!message) return null;

  return (
    <div className={`notice ${error ? 'notice-error' : 'notice-success'}`}>
      {message}
    </div>
  );
}

function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { user, setUser, loading, refresh };
}

function Protected({ auth, role, children }) {
  const location = useLocation();

  if (auth.loading) {
    return <div className="page-loading">Loading your workspace…</div>;
  }

  if (!auth.user) {
    return (
      <Navigate
        to={role === 'admin' ? '/admin-login' : '/login'}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (auth.user.role !== role) {
    return (
      <Navigate
        to={auth.user.role === 'admin' ? '/admin' : '/student'}
        replace
      />
    );
  }

  return children;
}

function AuthPage({ auth, admin = false }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    department: '',
    semester: '',
  });

  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const update = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError(false);

    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError(true);
      setMessage('Passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      if (mode === 'register') {
        await api.post('/auth/register', {
          name: form.name,
          email: form.email,
          password: form.password,
          studentId: form.studentId,
          department: form.department,
          semester: form.semester,
        });

        setMode('login');
        setMessage('Registration successful. Please sign in.');
      } else {
        const { data } = await api.post('/auth/login', {
          email: form.email,
          password: form.password,
        });

        if (admin && data.user.role !== 'admin') {
          await api.post('/auth/logout');
          throw new Error('This page is for administrators only.');
        }

        if (!admin && data.user.role === 'admin') {
          auth.setUser(data.user);
          navigate('/admin', { replace: true });
          return;
        }

        auth.setUser(data.user);

        navigate(
          data.user.role === 'admin' ? '/admin' : '/student',
          { replace: true }
        );
      }
    } catch (e) {
      setError(true);
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const registering = mode === 'register' && !admin;

  return (
    <div className="auth-shell">
      <div className="auth-decoration">
        <div className="auth-logo">
          <GraduationCap size={36} />
        </div>

        <p className="eyebrow">ACADEMIC PORTAL</p>
        <h1>
          Every result.
          <br />
          One place.
        </h1>

        <p>
          Simple, organized and secure academic record management.
        </p>

        <div className="auth-points">
          <span>
            <ShieldCheck size={17} /> Role-based access
          </span>
          <span>
            <BookOpen size={17} /> Clear result summaries
          </span>
        </div>
      </div>

      <div className="auth-panel">
        <div className="mobile-brand">
          <GraduationCap /> SRMS
        </div>

        <div className="auth-heading">
          <span className="eyebrow">
            {admin
              ? 'ADMINISTRATOR ACCESS'
              : registering
              ? 'CREATE ACCOUNT'
              : 'WELCOME BACK'}
          </span>

          <h2>
            {admin
              ? 'Admin sign in'
              : registering
              ? 'Student registration'
              : 'Sign in to SRMS'}
          </h2>

          <p>
            {admin
              ? 'Manage student records, subjects and results.'
              : registering
              ? 'Create a student account to view your results.'
              : 'Enter your credentials to continue.'}
          </p>
        </div>

        <Notice message={message} error={error} />

        <form className="form-stack" onSubmit={submit}>
          {registering && (
            <>
              <Field
                label="Full name"
                name="name"
                value={form.name}
                onChange={update}
                placeholder="Your full name"
                required
              />

              <div className="form-row">
                <Field
                  label="Student ID"
                  name="studentId"
                  value={form.studentId}
                  onChange={update}
                  placeholder="e.g. CSE-1026"
                  required
                />

                <Field
                  label="Semester"
                  name="semester"
                  value={form.semester}
                  onChange={update}
                  placeholder="e.g. 6th"
                  required
                />
              </div>

              <Field
                label="Department"
                name="department"
                value={form.department}
                onChange={update}
                placeholder="e.g. Computer Science and Engineering"
                required
              />
            </>
          )}

          <Field
            label="Email address"
            name="email"
            type="email"
            value={form.email}
            onChange={update}
            placeholder="you@example.com"
            required
          />

          <Field
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />

          {registering && (
            <Field
              label="Confirm password"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={update}
              placeholder="Enter password again"
              minLength={8}
              required
            />
          )}

          <button
            className="btn btn-primary btn-wide"
            disabled={busy}
          >
            {busy
              ? 'Please wait…'
              : admin
              ? 'Sign in as admin'
              : registering
              ? 'Create student account'
              : 'Sign in'}
            <span>→</span>
          </button>
        </form>

        {!admin && (
          <p className="auth-switch">
            {registering ? 'Already registered?' : 'New student?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(registering ? 'login' : 'register');
                setMessage('');
                setError(false);
              }}
            >
              {registering ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        )}

        {admin && (
          <Link className="back-link" to="/login">
            ← Student login
          </Link>
        )}

        <p className="auth-foot">
          Student Result Management System · Web Technologies
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  ...props
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        {...props}
      />
    </label>
  );
}

function Shell({ auth, children, active }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const admin = auth.user?.role === 'admin';

  const links = admin
    ? [
        ['/admin', 'Overview', LayoutDashboard],
        ['/admin/students', 'Students', Users],
        ['/admin/subjects', 'Subjects', BookOpen],
        ['/admin/results', 'Results', ClipboardList],
      ]
    : [
        ['/student', 'My results', ClipboardList],
        ['/student/profile', 'My profile', UserRound],
      ];

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear local authentication even if logout request fails.
    }

    auth.setUser(null);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <Link
          to={admin ? '/admin' : '/student'}
          className="brand"
        >
          <span className="brand-mark">
            <GraduationCap size={23} />
          </span>

          <span>
            SRMS
            <small>ACADEMIC PORTAL</small>
          </span>
        </Link>

        <div className="workspace-label">WORKSPACE</div>

        <nav>
          {links.map(([to, label, Icon]) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`nav-link ${
                active === to ? 'nav-active' : ''
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {active === to && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-note">
            <ShieldCheck size={17} />
            <span>
              <b>Secure workspace</b>
              <small>Your account is protected</small>
            </span>
          </div>

          <button className="logout-button" onClick={logout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span>{' '}
            <b>
              {active === '/admin'
                ? 'Overview'
                : active
                    .split('/')
                    .pop()
                    .replace(/^./, (c) => c.toUpperCase())}
            </b>
          </div>

          <div className="top-user">
            <span className="avatar">
              {auth.user?.name?.charAt(0)?.toUpperCase()}
            </span>
            <span>
              <b>{auth.user?.name}</b>
              <small>{admin ? 'Administrator' : 'Student'}</small>
            </span>
          </div>
        </header>

        <div className="content">{children}</div>

        <footer className="footer">
          © {new Date().getFullYear()} Student Result Management System
          <span>Built for Web Technologies</span>
        </footer>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({ title, value, hint, Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon">
          <Icon size={19} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  );
}

function QuickLink({ to, Icon, title, desc }) {
  return (
    <Link className="quick-link" to={to}>
      <span className="quick-icon">
        <Icon size={20} />
      </span>
      <span>
        <b>{title}</b>
        <small>{desc}</small>
      </span>
      <span className="quick-arrow">↗</span>
    </Link>
  );
}

function StudentTable({
  students,
  compact = false,
  onEdit,
  onDelete,
}) {
  if (!students.length) {
    return (
      <div className="empty-state">
        <Users size={28} />
        <b>No student records yet</b>
        <span>Add a student to get started.</span>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>STUDENT</th>
            <th>STUDENT ID</th>
            <th>DEPARTMENT</th>
            <th>SEMESTER</th>
            {!compact && <th>ACTIONS</th>}
          </tr>
        </thead>

        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>
                <div className="person-cell">
                  <span className="mini-avatar">
                    {s.name?.charAt(0)?.toUpperCase()}
                  </span>
                  <span>
                    <b>{s.name}</b>
                    <small>{s.email}</small>
                  </span>
                </div>
              </td>

              <td>
                <span className="code-pill">{s.studentId}</span>
              </td>
              <td>{s.department}</td>
              <td>{s.semester}</td>

              {!compact && (
                <td>
                  <div className="row-actions">
                    <button
                      className="small-btn"
                      onClick={() => onEdit(s)}
                    >
                      Edit
                    </button>
                    <button
                      className="small-btn danger-text"
                      onClick={() => onDelete(s)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminOverview({ auth }) {
  const [stats, setStats] = useState({
    students: '—',
    subjects: '—',
    results: '—',
  });

  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/overview'),
      api.get('/admin/students'),
    ])
      .then(([a, b]) => {
        setStats(a.data);
        setRecent(b.data.students.slice(0, 5));
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  return (
    <Shell auth={auth} active="/admin">
      <PageHeading
        eyebrow="ADMIN CONSOLE"
        title={`Good day, ${auth.user?.name?.split(' ')[0]}.`}
        description="Here’s an overview of your academic records."
      />

      <Notice message={error} error />

      <div className="stats-grid">
        <StatCard
          title="Total students"
          value={stats.students}
          hint="Registered student profiles"
          Icon={Users}
        />
        <StatCard
          title="Subjects"
          value={stats.subjects}
          hint="Available academic subjects"
          Icon={BookOpen}
        />
        <StatCard
          title="Result records"
          value={stats.results}
          hint="Marks saved in the system"
          Icon={ClipboardList}
        />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recently added students</h2>
            <p>Latest student profiles in the system</p>
          </div>
          <Link className="text-link" to="/admin/students">
            View all →
          </Link>
        </div>

        <StudentTable students={recent} compact />
      </section>

      <section className="quick-grid">
        <QuickLink
          to="/admin/students"
          Icon={Users}
          title="Manage students"
          desc="Add, search and update student records"
        />
        <QuickLink
          to="/admin/subjects"
          Icon={BookOpen}
          title="Manage subjects"
          desc="Set subject codes and credit values"
        />
        <QuickLink
          to="/admin/results"
          Icon={ClipboardList}
          title="Enter results"
          desc="Save marks and calculate grades"
        />
      </section>
    </Shell>
  );
}

function StudentsPage({ auth }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const blank = {
    name: '',
    email: '',
    password: '',
    studentId: '',
    department: 'Computer Science and Engineering',
    semester: '6th',
  };

  const [form, setForm] = useState(blank);

  const load = async () => {
    try {
      const { data } = await api.get('/admin/students', {
        params: { search },
      });
      setStudents(data.students);
    } catch (e) {
      setError(true);
      setMessage(getErrorMessage(e));
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm(blank);
    setShowForm(true);
    setMessage('');
  };

  const edit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      email: s.email,
      password: '',
      studentId: s.studentId,
      department: s.department,
      semester: s.semester,
    });
    setShowForm(true);
    setMessage('');
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setError(false);

    try {
      if (editing) {
        const { password, ...payload } = form;
        await api.put(`/admin/students/${editing.id}`, payload);
      } else {
        await api.post('/admin/students', form);
      }

      setMessage(
        editing
          ? 'Student updated successfully.'
          : 'Student created successfully.'
      );
      setShowForm(false);
      await load();
    } catch (e) {
      setError(true);
      setMessage(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s) => {
    if (
      !window.confirm(
        `Delete ${s.name} and their academic records?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/students/${s.id}`);
      setMessage('Student deleted.');
      setError(false);
      await load();
    } catch (e) {
      setMessage(getErrorMessage(e));
      setError(true);
    }
  };

  return (
    <Shell auth={auth} active="/admin/students">
      <PageHeading
        eyebrow="ACADEMIC RECORDS"
        title="Students"
        description="Create and maintain student profiles and login accounts."
        action={
          <button
            className="btn btn-primary"
            onClick={openAdd}
          >
            ＋ Add student
          </button>
        }
      />

      <Notice message={message} error={error} />

      {showForm && (
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>{editing ? 'Edit student' : 'Add new student'}</h2>
              <p>
                {editing
                  ? 'Update profile details.'
                  : 'A student login account will be created too.'}
              </p>
            </div>
            <button
              className="icon-button"
              onClick={() => setShowForm(false)}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={save} className="form-grid">
            <Field
              label="Full name"
              name="name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
            <Field
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              required
            />
            <Field
              label="Student ID"
              name="studentId"
              value={form.studentId}
              onChange={(e) =>
                setForm({ ...form, studentId: e.target.value })
              }
              required
            />
            <Field
              label="Department"
              name="department"
              value={form.department}
              onChange={(e) =>
                setForm({ ...form, department: e.target.value })
              }
              required
            />
            <Field
              label="Semester"
              name="semester"
              value={form.semester}
              onChange={(e) =>
                setForm({ ...form, semester: e.target.value })
              }
              required
            />

            {!editing && (
              <Field
                label="Initial password (min 8 chars)"
                name="password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                minLength={8}
                required
              />
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Save student'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              All students{' '}
              <span className="count-pill">{students.length}</span>
            </h2>
            <p>Search by student name, email or ID</p>
          </div>

          <div className="search-box">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students…"
            />
          </div>
        </div>

        <StudentTable
          students={students}
          onEdit={edit}
          onDelete={remove}
        />
      </section>
    </Shell>
  );
}

function SubjectsPage({ auth }) {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({
    subjectCode: '',
    subjectName: '',
    credit: '3',
  });
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/admin/subjects');
      setSubjects(data.subjects);
    } catch (e) {
      setError(true);
      setMessage(getErrorMessage(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMessage('');
    setError(false);

    try {
      if (editing) {
        await api.put(`/admin/subjects/${editing.id}`, form);
      } else {
        await api.post('/admin/subjects', form);
      }

      setShow(false);
      setEditing(null);
      setForm({
        subjectCode: '',
        subjectName: '',
        credit: '3',
      });
      setMessage(editing ? 'Subject updated.' : 'Subject added.');
      await load();
    } catch (e) {
      setError(true);
      setMessage(getErrorMessage(e));
    }
  };

  const edit = (s) => {
    setEditing(s);
    setForm({
      subjectCode: s.subject_code,
      subjectName: s.subject_name,
      credit: String(s.credit),
    });
    setShow(true);
  };

  const remove = async (s) => {
    if (
      !window.confirm(
        `Delete subject ${s.subject_code}? Related results will also be deleted.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/subjects/${s.id}`);
      setMessage('Subject deleted.');
      setError(false);
      await load();
    } catch (e) {
      setError(true);
      setMessage(getErrorMessage(e));
    }
  };

  return (
    <Shell auth={auth} active="/admin/subjects">
      <PageHeading
        eyebrow="ACADEMIC SETUP"
        title="Subjects"
        description="Maintain subject codes, names and credit values."
        action={
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setForm({
                subjectCode: '',
                subjectName: '',
                credit: '3',
              });
              setShow(true);
            }}
          >
            ＋ Add subject
          </button>
        }
      />

      <Notice message={message} error={error} />

      {show && (
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>{editing ? 'Edit subject' : 'New subject'}</h2>
              <p>Credits are used to calculate GPA.</p>
            </div>
            <button
              className="icon-button"
              onClick={() => setShow(false)}
            >
              <X size={18} />
            </button>
          </div>

          <form className="form-grid" onSubmit={save}>
            <Field
              label="Subject code"
              name="subjectCode"
              value={form.subjectCode}
              onChange={(e) =>
                setForm({ ...form, subjectCode: e.target.value })
              }
              placeholder="CSE-361"
              required
            />
            <Field
              label="Subject name"
              name="subjectName"
              value={form.subjectName}
              onChange={(e) =>
                setForm({ ...form, subjectName: e.target.value })
              }
              placeholder="Web Technologies"
              required
            />
            <Field
              label="Credit"
              name="credit"
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              value={form.credit}
              onChange={(e) =>
                setForm({ ...form, credit: e.target.value })
              }
              required
            />

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setShow(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary">
                Save subject
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Subject catalogue{' '}
              <span className="count-pill">{subjects.length}</span>
            </h2>
            <p>Subjects available for result entry</p>
          </div>
        </div>

        {subjects.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={28} />
            <b>No subjects added yet</b>
            <span>Add a subject before entering results.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SUBJECT CODE</th>
                  <th>SUBJECT NAME</th>
                  <th>CREDIT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="code-pill">
                        {s.subject_code}
                      </span>
                    </td>
                    <td>
                      <b>{s.subject_name}</b>
                    </td>
                    <td>{Number(s.credit).toFixed(2)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="small-btn"
                          onClick={() => edit(s)}
                        >
                          Edit
                        </button>
                        <button
                          className="small-btn danger-text"
                          onClick={() => remove(s)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  );
}

function ResultsPage({ auth }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);

  const [form, setForm] = useState({
    studentDbId: '',
    subjectDbId: '',
    marks: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const load = async () => {
    try {
      const [s, sub, r] = await Promise.all([
        api.get('/admin/students'),
        api.get('/admin/subjects'),
        api.get('/admin/results'),
      ]);

      setStudents(s.data.students);
      setSubjects(sub.data.subjects);
      setResults(r.data.results);
    } catch (e) {
      setError(true);
      setMessage(getErrorMessage(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMessage('');
    setError(false);

    try {
      await api.post('/admin/results', {
        ...form,
        marks: Number(form.marks),
      });

      setMessage('Marks saved and grade calculated.');
      setForm({ ...form, marks: '' });
      await load();
    } catch (e) {
      setError(true);
      setMessage(getErrorMessage(e));
    }
  };

  const remove = async (r) => {
    if (!window.confirm('Delete this result record?')) return;

    try {
      await api.delete(`/admin/results/${r.id}`);
      setMessage('Result deleted.');
      setError(false);
      await load();
    } catch (e) {
      setError(true);
      setMessage(getErrorMessage(e));
    }
  };

  return (
    <Shell auth={auth} active="/admin/results">
      <PageHeading
        eyebrow="EXAMINATION RECORDS"
        title="Results & marks"
        description="Enter subject-wise marks. Grades are calculated automatically."
      />

      <Notice message={message} error={error} />

      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <h2>Enter marks</h2>
            <p>
              Marks must be between 0 and 100. Existing
              student-subject records are updated.
            </p>
          </div>
          <span className="stat-icon">
            <ClipboardList size={20} />
          </span>
        </div>

        {(!students.length || !subjects.length) && (
          <Notice
            message="Add at least one student and one subject before entering marks."
            error
          />
        )}

        <form className="form-grid" onSubmit={save}>
          <label className="field">
            <span>Student</span>
            <select
              value={form.studentDbId}
              onChange={(e) =>
                setForm({ ...form, studentDbId: e.target.value })
              }
              required
            >
              <option value="">Choose student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentId} — {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Subject</span>
            <select
              value={form.subjectDbId}
              onChange={(e) =>
                setForm({ ...form, subjectDbId: e.target.value })
              }
              required
            >
              <option value="">Choose subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject_code} — {s.subject_name}
                </option>
              ))}
            </select>
          </label>

          <Field
            label="Marks (0–100)"
            name="marks"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.marks}
            onChange={(e) =>
              setForm({ ...form, marks: e.target.value })
            }
            required
          />

          <div className="form-actions">
            <button
              className="btn btn-primary"
              disabled={!students.length || !subjects.length}
            >
              Save marks
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Recorded results{' '}
              <span className="count-pill">{results.length}</span>
            </h2>
            <p>Current marks and computed grade points</p>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={28} />
            <b>No results recorded</b>
            <span>Use the form above to enter marks.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>SUBJECT</th>
                  <th>CREDIT</th>
                  <th>MARKS</th>
                  <th>GRADE</th>
                  <th>POINT</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.studentName}</b>
                      <small className="block-muted">
                        {r.studentId}
                      </small>
                    </td>
                    <td>
                      <b>{r.subjectCode}</b>
                      <small className="block-muted">
                        {r.subjectName}
                      </small>
                    </td>
                    <td>{Number(r.credit).toFixed(2)}</td>
                    <td>
                      <b>{Number(r.marks).toFixed(2)}</b>
                    </td>
                    <td>
                      <span
                        className={`grade-chip ${
                          r.letterGrade === 'F' ? 'grade-fail' : ''
                        }`}
                      >
                        {r.letterGrade}
                      </span>
                    </td>
                    <td>{Number(r.gradePoint).toFixed(2)}</td>
                    <td>
                      <button
                        className="small-btn danger-text"
                        onClick={() => remove(r)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  );
}

function StudentResults({ auth }) {
  const [data, setData] = useState({
    results: [],
    gpa: 0,
    totalCredits: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/student/results'),
      api.get('/student/me'),
    ])
      .then(([r]) => {
        setData(r.data);
      })
      .catch((e) => {
        setError(getErrorMessage(e));
      });
  }, []);

  return (
    <Shell auth={auth} active="/student">
      <PageHeading
        eyebrow="STUDENT PORTAL"
        title={`Welcome, ${auth.user?.name?.split(' ')[0]}.`}
        description="Your academic performance, all in one place."
      />

      <Notice message={error} error={!!error} />

      <div className="student-summary">
        <div>
          <span className="eyebrow">CURRENT GPA</span>
          <div className="gpa-value">
            {Number(data.gpa).toFixed(2)}
            <small> / 4.00</small>
          </div>
          <p>Calculated from recorded subject credits</p>
        </div>

        <div className="summary-divider" />

        <div className="summary-detail">
          <span>SUBJECTS GRADED</span>
          <b>{data.results.length}</b>
        </div>

        <div className="summary-detail">
          <span>TOTAL CREDITS</span>
          <b>{Number(data.totalCredits).toFixed(2)}</b>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Subject-wise results</h2>
            <p>Your marks, grades and grade points</p>
          </div>
          <span className="result-status">
            <span /> Personal record
          </span>
        </div>

        {data.results.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={28} />
            <b>No results published yet</b>
            <span>
              Your results will appear here after your administrator
              enters marks.
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SUBJECT</th>
                  <th>CREDIT</th>
                  <th>MARKS</th>
                  <th>GRADE</th>
                  <th>GRADE POINT</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.subjectCode}>
                    <td>
                      <div className="subject-cell">
                        <span className="subject-symbol">
                          <BookOpen size={17} />
                        </span>
                        <span>
                          <b>{r.subjectName}</b>
                          <small>{r.subjectCode}</small>
                        </span>
                      </div>
                    </td>
                    <td>{Number(r.credit).toFixed(2)}</td>
                    <td>
                      <div className="marks-cell">
                        <b>{Number(r.marks).toFixed(2)}</b>
                        <span className="marks-track">
                          <i
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, Number(r.marks))
                              )}%`,
                            }}
                          />
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`grade-chip ${
                          r.letterGrade === 'F' ? 'grade-fail' : ''
                        }`}
                      >
                        {r.letterGrade}
                      </span>
                    </td>
                    <td>
                      <b>{Number(r.gradePoint).toFixed(2)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="info-strip">
        <ShieldCheck size={20} />
        <div>
          <b>Your results are private</b>
          <p>
            Only results linked to your signed-in student account are
            displayed.
          </p>
        </div>
      </section>
    </Shell>
  );
}

function StudentProfile({ auth }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/student/me')
      .then((r) => setProfile(r.data.student))
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  return (
    <Shell auth={auth} active="/student/profile">
      <PageHeading
        eyebrow="ACCOUNT DETAILS"
        title="My profile"
        description="Your registered academic and account information."
      />

      <Notice message={error} error={!!error} />

      {profile && (
        <section className="panel profile-panel">
          <div className="profile-hero">
            <span className="profile-avatar">
              {profile.name?.charAt(0)?.toUpperCase()}
            </span>
            <div>
              <h2>{profile.name}</h2>
              <p>{profile.email}</p>
              <span className="grade-chip">Student account</span>
            </div>
          </div>

          <div className="profile-fields">
            <ProfileItem label="Student ID" value={profile.studentId} />
            <ProfileItem label="Department" value={profile.department} />
            <ProfileItem
              label="Current semester"
              value={profile.semester}
            />
            <ProfileItem label="Email address" value={profile.email} />
          </div>
        </section>
      )}
    </Shell>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div className="profile-item">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={
              auth.user
                ? auth.user.role === 'admin'
                  ? '/admin'
                  : '/student'
                : '/login'
            }
            replace
          />
        }
      />

      <Route
        path="/login"
        element={
          auth.loading ? (
            <div className="page-loading">Loading…</div>
          ) : auth.user ? (
            <Navigate
              to={auth.user.role === 'admin' ? '/admin' : '/student'}
              replace
            />
          ) : (
            <AuthPage auth={auth} />
          )
        }
      />

      <Route
        path="/admin-login"
        element={
          auth.loading ? (
            <div className="page-loading">Loading…</div>
          ) : auth.user ? (
            <Navigate
              to={auth.user.role === 'admin' ? '/admin' : '/student'}
              replace
            />
          ) : (
            <AuthPage auth={auth} admin />
          )
        }
      />

      <Route
        path="/admin"
        element={
          <Protected auth={auth} role="admin">
            <AdminOverview auth={auth} />
          </Protected>
        }
      />

      <Route
        path="/admin/students"
        element={
          <Protected auth={auth} role="admin">
            <StudentsPage auth={auth} />
          </Protected>
        }
      />

      <Route
        path="/admin/subjects"
        element={
          <Protected auth={auth} role="admin">
            <SubjectsPage auth={auth} />
          </Protected>
        }
      />

      <Route
        path="/admin/results"
        element={
          <Protected auth={auth} role="admin">
            <ResultsPage auth={auth} />
          </Protected>
        }
      />

      <Route
        path="/student"
        element={
          <Protected auth={auth} role="student">
            <StudentResults auth={auth} />
          </Protected>
        }
      />

      <Route
        path="/student/profile"
        element={
          <Protected auth={auth} role="student">
            <StudentProfile auth={auth} />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}