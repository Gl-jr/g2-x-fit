// ============================================================
//  G² x FIT — СЕРВЕР (Express + SQLite)
// ============================================================

const express = require('express');           // веб-фреймворк
const cors = require('cors');                 // разрешает кросс-доменные запросы
const path = require('path');                 // работа с путями
const bcrypt = require('bcryptjs');           // хэш паролей
const jwt = require('jsonwebtoken');          // токены авторизации
const Database = require('better-sqlite3');   // встроенная SQL-база

const app = express();
app.use(cors());
app.use(express.json());

// Раздаём статику клиента
app.use(express.static(path.join(__dirname, '../client/public')));

// ============================================================
//  ПОДКЛЮЧЕНИЕ И СХЕМА БАЗЫ ДАННЫХ
// ============================================================

const db = new Database(path.join(__dirname, 'g2xfit.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    nickname    TEXT,
    tag         TEXT,
    role        TEXT NOT NULL DEFAULT 'student',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS norms (
    user_id      INTEGER PRIMARY KEY,
    calories     INTEGER,
    protein      INTEGER,
    fat          INTEGER,
    carbs        INTEGER,
    goal         TEXT,
    goal_message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS foods (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL,
    date     TEXT NOT NULL,
    protein  REAL DEFAULT 0,
    fat      REAL DEFAULT 0,
    carbs    REAL DEFAULT 0,
    UNIQUE (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS allergies (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL,
    name     TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS injuries (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL,
    name     TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS coach_students (
    coach_id   INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    PRIMARY KEY (coach_id, student_id),
    FOREIGN KEY (coach_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS weights (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date    TEXT NOT NULL,
    kg      REAL NOT NULL,
    UNIQUE (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    coach_id   INTEGER NOT NULL,
    student_id INTEGER,         -- null если назначено всей группе тренера
    type       TEXT NOT NULL,   -- workout | meal
    plan_key   TEXT NOT NULL,   -- ключ программы (split, fullbody, lose, ...)
    start_date TEXT,
    end_date   TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (coach_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_nickname    ON users(nickname);
  CREATE INDEX IF NOT EXISTS idx_users_tag         ON users(tag);
  CREATE INDEX IF NOT EXISTS idx_foods_user        ON foods(user_id);
  CREATE INDEX IF NOT EXISTS idx_weights_user_date ON weights(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_assignments_coach ON assignments(coach_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id);
`);

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET || 'g2xfit-secret-change-me';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Не авторизован' });
  }
}

// Подсчёт эффективности (% дней в норме) по конкретному ученику
function calcEfficiency(userId) {
  const norm = db.prepare('SELECT * FROM norms WHERE user_id = ?').get(userId);
  if (!norm) return { totalDays: 0, daysInNorm: 0, percent: 0 };

  const days = db.prepare('SELECT * FROM foods WHERE user_id = ?').all(userId);
  let ok = 0;
  for (const d of days) {
    const within = (v, n) => v >= n * 0.9 && v <= n * 1.1;
    if (within(d.protein, norm.protein) && within(d.fat, norm.fat) && within(d.carbs, norm.carbs)) ok++;
  }
  return {
    totalDays: days.length,
    daysInNorm: ok,
    percent: days.length ? Math.round((ok / days.length) * 100) : 0
  };
}

// ============================================================
//  АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ
// ============================================================

app.post('/register', (req, res) => {
  try {
    const { email, password, nickname, tag, role } = req.body;
    if (!email || !password) return res.json({ error: 'Email и пароль обязательны' });

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.json({ error: 'Пользователь с таким email уже существует' });

    const hash = bcrypt.hashSync(password, 10);
    const safeRole = role === 'coach' ? 'coach' : 'student';
    const info = db.prepare(
      'INSERT INTO users (email, password, nickname, tag, role) VALUES (?, ?, ?, ?, ?)'
    ).run(email, hash, nickname || null, tag || null, safeRole);

    const user = { id: info.lastInsertRowid, email, role: safeRole };
    res.json({ message: 'OK', userId: user.id, role: safeRole, token: signToken(user) });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Ошибка регистрации' });
  }
});

app.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.json({ error: 'Пользователь не найден' });
    if (!bcrypt.compareSync(password, user.password)) return res.json({ error: 'Неверный пароль' });

    res.json({ token: signToken(user), userId: user.id, role: user.role, nickname: user.nickname });
  } catch (err) {
    res.json({ error: 'Ошибка входа' });
  }
});

// Восстановление пароля — без email-провайдера: код выводится в терминал
const resetCodes = new Map();
const genCode = () => Math.floor(1000 + Math.random() * 9000).toString();

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) return res.json({ error: 'Пользователь с таким email не найден' });

  const code = genCode();
  resetCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  console.log(`🔐 КОД ДЛЯ СБРОСА ПАРОЛЯ (${email}): ${code}`);
  res.json({ message: 'Код для сброса пароля отправлен (проверьте терминал)' });
});

app.post('/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  const record = resetCodes.get(email);
  if (!record || record.code !== code || record.expiresAt < Date.now())
    return res.json({ error: 'Неверный или истёкший код' });

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hash, email);
  resetCodes.delete(email);
  res.json({ message: 'Пароль успешно изменён! Теперь войдите.' });
});

// ============================================================
//  ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ============================================================

app.get('/profile/:userId', (req, res) => {
  const u = db.prepare('SELECT id, email, nickname, tag, role FROM users WHERE id = ?').get(req.params.userId);
  if (!u) return res.json({ error: 'Не найден' });
  res.json(u);
});

app.post('/profile/:userId', (req, res) => {
  const { nickname, tag } = req.body;
  db.prepare('UPDATE users SET nickname = COALESCE(?, nickname), tag = COALESCE(?, tag) WHERE id = ?')
    .run(nickname ?? null, tag ?? null, req.params.userId);
  res.json({ message: 'Профиль обновлён' });
});

// ============================================================
//  КАЛЬКУЛЯТОР НОРМЫ И БЖУ
// ============================================================

app.post('/calculate', (req, res) => {
  const { weight, height, age, userId, goal } = req.body;
  if (!weight || !height || !age) return res.json({ error: 'Заполни все поля' });

  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  let calories = bmr * 1.2;
  let goalMessage = '🎯 Цель: Поддержание веса';

  if (goal === 'lose')  { calories *= 0.85; goalMessage = '🎯 Цель: Похудение (дефицит 15%)'; }
  if (goal === 'gain')  { calories *= 1.15; goalMessage = '🎯 Цель: Набор мышечной массы (профицит 15%)'; }

  calories = Math.round(calories);
  const protein = Math.round((calories * 0.3) / 4);
  const fat     = Math.round((calories * 0.3) / 9);
  const carbs   = Math.round((calories * 0.4) / 4);

  if (userId) {
    db.prepare(`
      INSERT INTO norms (user_id, calories, protein, fat, carbs, goal, goal_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        calories=excluded.calories, protein=excluded.protein, fat=excluded.fat,
        carbs=excluded.carbs, goal=excluded.goal, goal_message=excluded.goal_message
    `).run(userId, calories, protein, fat, carbs, goal || 'maintain', goalMessage);
  }

  res.json({ calories, protein, fat, carbs, goal, goalMessage });
});

app.get('/norm/:userId', (req, res) => {
  const norm = db.prepare('SELECT * FROM norms WHERE user_id = ?').get(req.params.userId);
  if (!norm) return res.json({ error: 'Норма не рассчитана' });
  res.json({
    calories: norm.calories, protein: norm.protein, fat: norm.fat, carbs: norm.carbs,
    goal: norm.goal, goalMessage: norm.goal_message
  });
});

// ============================================================
//  ДНЕВНИК ПИТАНИЯ
// ============================================================

app.post('/food', (req, res) => {
  const { userId, date, protein, fat, carbs } = req.body;
  if (!userId || !date) return res.json({ error: 'Нет данных' });

  const existing = db.prepare('SELECT * FROM foods WHERE user_id = ? AND date = ?').get(userId, date);
  if (existing) {
    db.prepare('UPDATE foods SET protein = protein + ?, fat = fat + ?, carbs = carbs + ? WHERE id = ?')
      .run(protein || 0, fat || 0, carbs || 0, existing.id);
  } else {
    db.prepare('INSERT INTO foods (user_id, date, protein, fat, carbs) VALUES (?, ?, ?, ?, ?)')
      .run(userId, date, protein || 0, fat || 0, carbs || 0);
  }
  res.json({ message: 'Сохранено' });
});

app.get('/report/:userId', (req, res) => {
  const { startDate, endDate } = req.query;
  let rows;
  if (startDate && endDate) {
    rows = db.prepare('SELECT * FROM foods WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC')
      .all(req.params.userId, startDate, endDate);
  } else {
    rows = db.prepare('SELECT * FROM foods WHERE user_id = ? ORDER BY date DESC').all(req.params.userId);
  }
  res.json(rows);
});

app.get('/stats/:userId', (req, res) => {
  const norm = db.prepare('SELECT * FROM norms WHERE user_id = ?').get(req.params.userId);
  if (!norm) return res.json({ error: 'Сначала рассчитайте норму БЖУ' });

  const eff = calcEfficiency(req.params.userId);
  res.json({
    daysInNorm: eff.daysInNorm,
    daysOutOfNorm: eff.totalDays - eff.daysInNorm,
    totalDays: eff.totalDays,
    percent: eff.percent,
    norm: {
      calories: norm.calories, protein: norm.protein, fat: norm.fat, carbs: norm.carbs,
      goal: norm.goal, goalMessage: norm.goal_message
    }
  });
});

// ============================================================
//  АЛЛЕРГИИ И ТРАВМЫ (добавляются в любой момент)
// ============================================================

app.get('/health/:userId', (req, res) => {
  const allergies = db.prepare('SELECT id, name FROM allergies WHERE user_id = ?').all(req.params.userId);
  const injuries  = db.prepare('SELECT id, name FROM injuries  WHERE user_id = ?').all(req.params.userId);
  res.json({ allergies, injuries });
});

app.post('/health/:userId/allergy', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.json({ error: 'Введите название' });
  const info = db.prepare('INSERT INTO allergies (user_id, name) VALUES (?, ?)').run(req.params.userId, name);
  res.json({ id: info.lastInsertRowid, name });
});

app.delete('/health/:userId/allergy/:id', (req, res) => {
  db.prepare('DELETE FROM allergies WHERE id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ message: 'Удалено' });
});

app.post('/health/:userId/injury', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.json({ error: 'Введите название' });
  const info = db.prepare('INSERT INTO injuries (user_id, name) VALUES (?, ?)').run(req.params.userId, name);
  res.json({ id: info.lastInsertRowid, name });
});

app.delete('/health/:userId/injury/:id', (req, res) => {
  db.prepare('DELETE FROM injuries WHERE id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ message: 'Удалено' });
});

// ============================================================
//  КАБИНЕТ ТРЕНЕРА: ПОИСК, ГРУППА, ЭФФЕКТИВНОСТЬ
// ============================================================

// Поиск ученика по никнейму или тэгу
app.get('/students/search', (req, res) => {
  const q = `%${(req.query.q || '').trim()}%`;
  const rows = db.prepare(`
    SELECT id, email, nickname, tag
      FROM users
     WHERE role = 'student' AND (nickname LIKE ? OR tag LIKE ? OR email LIKE ?)
     LIMIT 25
  `).all(q, q, q);
  res.json(rows);
});

// Получить состав группы тренера + эффективность по каждому
app.get('/group/:coachId', (req, res) => {
  const students = db.prepare(`
    SELECT u.id, u.email, u.nickname, u.tag
      FROM coach_students cs
      JOIN users u ON u.id = cs.student_id
     WHERE cs.coach_id = ?
  `).all(req.params.coachId);

  const enriched = students.map(s => ({ ...s, ...calcEfficiency(s.id) }));
  const groupPercent = enriched.length
    ? Math.round(enriched.reduce((a, s) => a + s.percent, 0) / enriched.length)
    : 0;

  res.json({ students: enriched, groupPercent });
});

app.post('/group/:coachId/add', (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.json({ error: 'studentId обязателен' });
  db.prepare('INSERT OR IGNORE INTO coach_students (coach_id, student_id) VALUES (?, ?)')
    .run(req.params.coachId, studentId);
  res.json({ message: 'Ученик добавлен' });
});

app.delete('/group/:coachId/remove/:studentId', (req, res) => {
  db.prepare('DELETE FROM coach_students WHERE coach_id = ? AND student_id = ?')
    .run(req.params.coachId, req.params.studentId);
  res.json({ message: 'Ученик удалён' });
});

// ============================================================
//  ВЕС ПОЛЬЗОВАТЕЛЯ (трекинг по датам)
// ============================================================

app.get('/weights/:userId', (req, res) => {
  const rows = db.prepare(
    'SELECT id, date, kg FROM weights WHERE user_id = ? ORDER BY date ASC'
  ).all(req.params.userId);
  res.json(rows);
});

app.post('/weights/:userId', (req, res) => {
  const { date, kg } = req.body;
  if (!date || kg == null) return res.json({ error: 'Нет данных' });
  db.prepare('INSERT OR REPLACE INTO weights (user_id, date, kg) VALUES (?, ?, ?)')
    .run(req.params.userId, date, kg);
  res.json({ message: 'Сохранено' });
});

app.delete('/weights/:userId/:id', (req, res) => {
  db.prepare('DELETE FROM weights WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.params.userId);
  res.json({ message: 'Удалено' });
});

// ============================================================
//  НАЗНАЧЕНИЯ: план тренировок / питания
// ============================================================

app.get('/assignments', (req, res) => {
  const { coachId } = req.query;
  if (!coachId) return res.json([]);
  const rows = db.prepare(`
    SELECT a.*,
           u.nickname AS student_name,
           u.email    AS student_email
      FROM assignments a
      LEFT JOIN users u ON u.id = a.student_id
     WHERE a.coach_id = ?
     ORDER BY a.created_at DESC
  `).all(coachId);
  res.json(rows);
});

app.post('/assignments', (req, res) => {
  const { coachId, studentId, type, planKey, startDate, endDate } = req.body;
  if (!coachId || !type || !planKey) return res.json({ error: 'Нет данных' });
  const info = db.prepare(`
    INSERT INTO assignments (coach_id, student_id, type, plan_key, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(coachId, studentId || null, type, planKey, startDate || null, endDate || null);
  res.json({ id: info.lastInsertRowid, message: 'Назначено' });
});

app.delete('/assignments/:id', (req, res) => {
  db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Удалено' });
});

// ============================================================
//  ЗАПУСК СЕРВЕРА
// ============================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log('💾 База:', path.join(__dirname, 'g2xfit.db'));
});

// Безопасное закрытие БД
process.on('SIGINT',  () => { db.close(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); process.exit(0); });
