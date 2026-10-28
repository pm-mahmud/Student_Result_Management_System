require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

(async () => {
  try {
    const email = 'admin@srms.local';
    const password = 'Admin@12345';
    const hash = await bcrypt.hash(password, 12);
    const [existing] = await pool.execute('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length) {
      console.log('Admin account already exists; no changes made.');
    } else {
      await pool.execute(
        'INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
        ['System Administrator', email, hash, 'admin']
      );
      console.log('Admin account created.');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log('Change the demo password before using this beyond a local course project.');
    }
  } catch (error) {
    console.error('Could not create admin. Check backend/.env and run database/schema.sql first.', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
