const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// РАЗДАЁМ СТАТИКУ ИЗ ПАПКИ client/public
app.use(express.static(path.join(__dirname, '../client/public')));

// ===== ПОДКЛЮЧЕНИЕ К MONGODB ATLAS =====
const MONGO_URI = 'mongodb://127.0.0.1:27017/g2xfit';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas подключена'))
  .catch(err => console.log('❌ Ошибка MongoDB:', err));

// ===== МОДЕЛИ ДАННЫХ =====
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const FoodSchema = new mongoose.Schema({
  userId: String,
  date: String,
  protein: Number,
  fat: Number,
  carbs: Number
});

const NormSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  calories: Number,
  protein: Number,
  fat: Number,
  carbs: Number,
  goal: String,
  goalMessage: String
});

const User = mongoose.model('User', UserSchema);
const Food = mongoose.model('Food', FoodSchema);
const Norm = mongoose.model('Norm', NormSchema);

// ===== НАСТРОЙКА NODEMAILER ДЛЯ ПИСЕМ =====
// ВНИМАНИЕ: Замени на свои данные!
const transporter = nodemailer.createTransport({
  host: 'smtp.mail.ru',
  port: 465,
  secure: true,
  auth: {
    user: 'g2xfit@mail.ru',     // ← серверная почта
    pass: 'gvardIya-doSol-2sPilka'
  }
});

// Временное хранилище кодов (в реальном проекте храни в БД)
const verificationCodes = new Map(); // email -> { code, expiresAt }

// Генерация 4-значного кода
function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ========== API МАРШРУТЫ ==========

// ОТПРАВКА КОДА ПОДТВЕРЖДЕНИЯ НА EMAIL
app.post('/send-verification', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.json({ error: 'Email обязателен' });
  }
  
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  
  verificationCodes.set(email, { code, expiresAt });
  
  setTimeout(() => {
    if (verificationCodes.has(email) && verificationCodes.get(email).expiresAt === expiresAt) {
      verificationCodes.delete(email);
    }
  }, 10 * 60 * 1000);
  
  // ВЫВОДИМ КОД В ТЕРМИНАЛ
  console.log('=========================================');
  console.log(`📧 КОД ДЛЯ ${email}: ${code}`);
  console.log('=========================================');
  
  // Пытаемся отправить письмо, но не ждём ошибки
  try {
    await transporter.sendMail({
      from: `"G² x FIT" <${transporter.options.auth.user}>`,
      to: email,
      subject: 'Подтверждение регистрации — G² x FIT',
      html: `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #0a0a14; color: #e2e8f0; border-radius: 20px;">
        <h1 style="color: #06b6d4;">G² x FIT</h1>
        <h2>Ваш код подтверждения:</h2>
        <div style="font-size: 48px; font-weight: bold; background: #1a1a2e; padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0; letter-spacing: 10px;">
          ${code}
        </div>
        <p>Код действителен <strong>10 минут</strong>.</p>
        <hr style="border-color: #2a2a3e;">
        <p style="font-size: 12px; color: #94a3b8;">G² x FIT — твоя совесть в приложении 💪</p>
      </div>`
    });
    console.log(`✅ Письмо отправлено на ${email}`);
  } catch (err) {
    console.log(`❌ Письмо не отправлено, но код: ${code}`);
  }
  
  res.json({ message: 'Код отправлен на почту (проверь терминал)' });
});

// ПРОВЕРКА КОДА (опционально, можно использовать перед регистрацией)
app.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  
  const record = verificationCodes.get(email);
  
  if (!record) {
    return res.json({ error: 'Код не найден или истёк. Запросите новый.' });
  }
  
  if (record.expiresAt < Date.now()) {
    verificationCodes.delete(email);
    return res.json({ error: 'Код истёк. Запросите новый.' });
  }
  
  if (record.code !== code) {
    return res.json({ error: 'Неверный код' });
  }
  
  res.json({ success: true, message: 'Код верный!' });
});

// РЕГИСТРАЦИЯ С ПОДТВЕРЖДЕНИЕМ
app.post('/register', async (req, res) => {
  try {
    const { email, password, verificationCode } = req.body;
    
    // Проверяем наличие кода
    if (!verificationCode) {
      return res.json({ error: 'Введите код подтверждения' });
    }
    
    // Проверяем код
    const record = verificationCodes.get(email);
    if (!record || record.code !== verificationCode || record.expiresAt < Date.now()) {
      return res.json({ error: 'Неверный или истёкший код подтверждения' });
    }
    
    // Проверяем, не зарегистрирован ли уже пользователь
    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({ error: 'Пользователь с таким email уже существует' });
    }
    
    // Создаём пользователя
    const hash = bcrypt.hashSync(password, 10);
    const newUser = new User({ email, password: hash, isVerified: true });
    await newUser.save();
    
    // Удаляем код после успешной регистрации
    verificationCodes.delete(email);
    
    // Создаём JWT токен
    const token = jwt.sign({ id: newUser._id, email: newUser.email }, 'secret');
    
    res.json({ message: 'OK', userId: newUser._id, token });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Ошибка регистрации' });
  }
});

// ЛОГИН
app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      return res.json({ error: 'Пользователь не найден' });
    }
    
    if (!bcrypt.compareSync(req.body.password, user.password)) {
      return res.json({ error: 'Неверный пароль' });
    }
    
    const token = jwt.sign({ id: user._id, email: user.email }, 'secret');
    res.json({ token, userId: user._id });
  } catch (err) {
    res.json({ error: 'Ошибка входа' });
  }
});

// КАЛЬКУЛЯТОР И СОХРАНЕНИЕ НОРМЫ
app.post('/calculate', async (req, res) => {
  const { weight, height, age, userId, goal } = req.body;
  
  if (!weight || !height || !age) {
    return res.json({ error: 'Заполни все поля' });
  }
  
  let bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  let calories = bmr * 1.2;
  let goalMessage = '';
  
  switch (goal) {
    case 'lose':
      calories = calories * 0.85;
      goalMessage = '🎯 Цель: Похудение (дефицит 15%)';
      break;
    case 'gain':
      calories = calories * 1.15;
      goalMessage = '🎯 Цель: Набор мышечной массы (профицит 15%)';
      break;
    default:
      goalMessage = '🎯 Цель: Поддержание веса';
      break;
  }
  
  calories = Math.round(calories);
  const protein = Math.round((calories * 0.3) / 4);
  const fat = Math.round((calories * 0.3) / 9);
  const carbs = Math.round((calories * 0.4) / 4);
  
  const normData = { calories, protein, fat, carbs, goal, goalMessage };
  
  if (userId) {
    await Norm.findOneAndUpdate(
      { userId: userId },
      { ...normData, userId: userId },
      { upsert: true, new: true }
    );
  }
  
  res.json(normData);
});

// ПОЛУЧИТЬ НОРМУ
app.get('/norm/:userId', async (req, res) => {
  try {
    const norm = await Norm.findOne({ userId: req.params.userId });
    if (norm) {
      res.json(norm);
    } else {
      res.json({ error: 'Норма не рассчитана' });
    }
  } catch (err) {
    res.json({ error: 'Ошибка получения нормы' });
  }
});

// СОХРАНИТЬ ЕДУ
app.post('/food', async (req, res) => {
  const { userId, date, protein, fat, carbs } = req.body;
  
  if (!userId || !date) {
    return res.json({ error: 'Нет данных' });
  }
  
  try {
    const existing = await Food.findOne({ userId, date });
    
    if (existing) {
      existing.protein += protein;
      existing.fat += fat;
      existing.carbs += carbs;
      await existing.save();
    } else {
      await new Food({ userId, date, protein, fat, carbs }).save();
    }
    
    res.json({ message: 'Сохранено' });
  } catch (err) {
    res.json({ error: 'Ошибка сохранения' });
  }
});

// ПОЛУЧИТЬ ОТЧЁТ
app.get('/report/:userId', async (req, res) => {
  try {
    let query = { userId: req.params.userId };
    const { startDate, endDate } = req.query;
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const userFoods = await Food.find(query).sort({ date: -1 });
    res.json(userFoods);
  } catch (err) {
    res.json([]);
  }
});

// ПОЛУЧИТЬ СТАТИСТИКУ
app.get('/stats/:userId', async (req, res) => {
  try {
    const userFoods = await Food.find({ userId: req.params.userId });
    const norm = await Norm.findOne({ userId: req.params.userId });
    
    if (!norm) {
      return res.json({ error: 'Сначала рассчитайте норму БЖУ' });
    }
    
    let daysInNorm = 0;
    let daysOutOfNorm = 0;
    
    userFoods.forEach(day => {
      const proteinOk = day.protein <= norm.protein * 1.1 && day.protein >= norm.protein * 0.9;
      const fatOk = day.fat <= norm.fat * 1.1 && day.fat >= norm.fat * 0.9;
      const carbsOk = day.carbs <= norm.carbs * 1.1 && day.carbs >= norm.carbs * 0.9;
      
      if (proteinOk && fatOk && carbsOk) {
        daysInNorm++;
      } else {
        daysOutOfNorm++;
      }
    });
    
    res.json({
      daysInNorm,
      daysOutOfNorm,
      totalDays: userFoods.length,
      norm
    });
  } catch (err) {
    res.json({ error: 'Ошибка статистики' });
  }
});

// ЗАПУСК СЕРВЕРА
app.listen(3001, () => {
  console.log('🚀 Сервер запущен на http://localhost:3001');
  console.log('📁 Статика из папки:', path.join(__dirname, '../client/public'));
});