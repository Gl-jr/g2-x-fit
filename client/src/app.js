// ============================================================
// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ИНИЦИАЛИЗАЦИЯ
// ============================================================

let token = localStorage.getItem("token");
let userId = localStorage.getItem("userId");

let todayMeals = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: []
};

let pendingFoodResult = null;

let foodDatabase = {};
let recipes = [];
let availableProducts = [];

let currentTheme = "home";

// ============================================================
// 2. ЗАГРУЗКА ДАННЫХ + РЕЦЕПТЫ
// ============================================================

async function loadData() {
  try {
    const productsRes = await fetch('data/products.json');
    const fullDatabase = await productsRes.json();
    
    const recipesRes = await fetch('data/recipes.json');
    const loadedRecipes = await recipesRes.json();
    
    const usedIngredients = new Set();
    loadedRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => usedIngredients.add(ing));
    });
    
    const filtered = {};
    usedIngredients.forEach(ing => {
      if (fullDatabase[ing]) filtered[ing] = fullDatabase[ing];
    });
    
    foodDatabase = filtered;
    recipes = loadedRecipes;
    
    if (Object.keys(foodDatabase).length === 0 || recipes.length === 0) {
      useFallbackData();
    } else {
      availableProducts = Object.keys(foodDatabase);
    }
    
    if (document.getElementById("productsGrid")) renderProductsGrid();
    console.log("✅ Загружено:", Object.keys(foodDatabase).length, "продуктов,", recipes.length, "рецептов");
  } catch (error) {
    console.error("❌ Ошибка загрузки, используем fallback:", error);
    useFallbackData();
  }
}

function useFallbackData() {
  foodDatabase = {
    "курица":    { protein: 25,  fat: 3,   carbs: 0,   unit: "g",   perUnit: 100, forms: ["курица","курицы","куриц","курицу","куриного","куриная","куриной","куриное","куриную","курин","грудка","грудки","грудку","грудке","филе"] },
    "лосось":    { protein: 20,  fat: 13,  carbs: 0,   unit: "g",   perUnit: 100, forms: ["лосось","лосося","лососю","лосося","лососем","лосося","сёмга","семга","сёмги","семги","сёмгу","семгу"] },
    "говядина":  { protein: 26,  fat: 8,   carbs: 0,   unit: "g",   perUnit: 100, forms: ["говядина","говядины","говядину","говядиной","стейк","стейка"] },
    "индейка":   { protein: 29,  fat: 3,   carbs: 0,   unit: "g",   perUnit: 100, forms: ["индейка","индейки","индейку","индейкой"] },
    "тунец":     { protein: 25,  fat: 1,   carbs: 0,   unit: "g",   perUnit: 100, forms: ["тунец","тунца","тунцу","тунцом"] },
    "треска":    { protein: 18,  fat: 0.6, carbs: 0,   unit: "g",   perUnit: 100, forms: ["треска","трески","треску","треской"] },
    "рыба":      { protein: 20,  fat: 5,   carbs: 0,   unit: "g",   perUnit: 100, forms: ["рыба","рыбы","рыбу","рыбой","рыбе"] },
    "яйцо":      { protein: 13,  fat: 11,  carbs: 0.7, unit: "pcs", perUnit: 1,   forms: ["яйцо","яйца","яиц","яйцом","яйцу","яйцами","яйцах","яиц"] },
    "молоко":    { protein: 3.4, fat: 3.6, carbs: 4.8, unit: "ml",  perUnit: 100, forms: ["молоко","молока","молоку","молоком"] },
    "творог":    { protein: 18,  fat: 5,   carbs: 3,   unit: "g",   perUnit: 100, forms: ["творог","творога","творогу","творогом","творожный","сырник","сырники"] },
    "кефир":     { protein: 3.4, fat: 3.2, carbs: 4.7, unit: "ml",  perUnit: 100, forms: ["кефир","кефира","кефиру","кефиром"] },
    "йогурт":    { protein: 4,   fat: 2,   carbs: 6,   unit: "g",   perUnit: 100, forms: ["йогурт","йогурта","йогурту","йогуртом"] },
    "сыр":       { protein: 25,  fat: 30,  carbs: 0,   unit: "g",   perUnit: 100, forms: ["сыр","сыра","сыру","сыром"] },
    "рис":       { protein: 2.7, fat: 0.3, carbs: 28,  unit: "g",   perUnit: 100, forms: ["рис","риса","рису","рисом"] },
    "гречка":    { protein: 13,  fat: 3.4, carbs: 62,  unit: "g",   perUnit: 100, forms: ["гречка","гречки","гречку","гречкой","гречневый","гречневой","гречка"] },
    "овсянка":   { protein: 13,  fat: 7,   carbs: 68,  unit: "g",   perUnit: 100, forms: ["овсянка","овсянки","овсянку","овсяный","овсяных","овсяные","хлопья","хлопьев"] },
    "макароны":  { protein: 11,  fat: 1.5, carbs: 70,  unit: "g",   perUnit: 100, forms: ["макароны","макарон","макаронах","паста","пасты","пасту"] },
    "картофель": { protein: 2,   fat: 0.1, carbs: 17,  unit: "g",   perUnit: 100, forms: ["картофель","картофеля","картофелю","картошка","картошки","картошку"] },
    "банан":     { protein: 1.1, fat: 0.3, carbs: 23,  unit: "pcs", perUnit: 1,   forms: ["банан","банана","бананов","бананом","банану"] },
    "яблоко":    { protein: 0.4, fat: 0.4, carbs: 10,  unit: "pcs", perUnit: 1,   forms: ["яблоко","яблока","яблок","яблоком","яблоку"] },
    "авокадо":   { protein: 2,   fat: 15,  carbs: 9,   unit: "pcs", perUnit: 1,   forms: ["авокадо"] },
    "овощи":     { protein: 2,   fat: 0.5, carbs: 6,   unit: "g",   perUnit: 100, forms: ["овощи","овощей","овощами","овощах","овощу","брокколи","зелень","салат","помидор","помидоры","огурец","огурцы","морковь","морковки"] },
    "орехи":     { protein: 15,  fat: 50,  carbs: 14,  unit: "g",   perUnit: 100, forms: ["орехи","орехов","орехами","орех","миндаль","миндаля","грецкий","грецкого"] },
    "арахис":    { protein: 26,  fat: 46,  carbs: 16,  unit: "g",   perUnit: 100, forms: ["арахис","арахиса","арахисом","арахисовый","арахисовая","паста"] },
    "тофу":      { protein: 8,   fat: 4.5, carbs: 2,   unit: "g",   perUnit: 100, forms: ["тофу"] },
    "чечевица":  { protein: 9,   fat: 0.4, carbs: 20,  unit: "g",   perUnit: 100, forms: ["чечевица","чечевицы","чечевицу","чечевичный"] },
    "киноа":     { protein: 4.4, fat: 1.9, carbs: 21,  unit: "g",   perUnit: 100, forms: ["киноа"] },
    "нут":       { protein: 8.9, fat: 2.6, carbs: 27,  unit: "g",   perUnit: 100, forms: ["нут","нута","нуте","нутом"] },
    "протеин":   { protein: 75,  fat: 3,   carbs: 7,   unit: "g",   perUnit: 30,  forms: ["протеин","протеина","протеиновый","протеиновая","коктейль"] },
    "масло":     { protein: 0,   fat: 99,  carbs: 0,   unit: "g",   perUnit: 100, forms: ["масло","масла","маслом","оливковое","подсолнечное","сливочное"] },
  };
  
  recipes = [
    { 
      name: "🍗 Курица с рисом", 
      ingredients: ["курица", "рис"], 
      bju: { protein: 35, fat: 8, carbs: 45, calories: 392 }, 
      instructions: "Обжарь курицу, добавь рис и воду, туши до готовности." 
    },
    { 
      name: "🥚 Омлет с овощами", 
      ingredients: ["яйца", "овощи"], 
      bju: { protein: 22, fat: 18, carbs: 8, calories: 282 }, 
      instructions: "Взбей яйца, добавь нарезанные овощи, жарь на сковороде." 
    },
    { 
      name: "🥣 Овсяная каша с бананом", 
      ingredients: ["овсянка", "молоко", "банан"], 
      bju: { protein: 18, fat: 10, carbs: 65, calories: 422 }, 
      instructions: "Свари овсянку на молоке, добавь нарезанный банан." 
    },
    { 
      name: "🥢 Тофу с овощами по-азиатски", 
      ingredients: ["тофу", "овощи"], 
      bju: { protein: 20, fat: 12, carbs: 15, calories: 248 }, 
      instructions: "Нарежь тофу кубиками, обжарь с овощами, добавь соевый соус." 
    },
    { 
      name: "🍲 Чечевичный суп", 
      ingredients: ["чечевица", "овощи"], 
      bju: { protein: 15, fat: 3, carbs: 30, calories: 207 }, 
      instructions: "Отвари чечевицу, добавь пассерованные овощи, вари 20 минут." 
    },
    { 
      name: "🥗 Салат с киноа и овощами", 
      ingredients: ["киноа", "овощи"], 
      bju: { protein: 12, fat: 6, carbs: 28, calories: 214 }, 
      instructions: "Отвари киноа, смешай с нарезанными свежими овощами, заправь маслом." 
    },
    { 
      name: "🌱 Нут с рисом", 
      ingredients: ["нут", "рис"], 
      bju: { protein: 18, fat: 4, carbs: 55, calories: 328 }, 
      instructions: "Замочи нут на ночь, отвари с рисом до готовности." 
    },
    {
      name: "🥛 Сырники из творога",
      ingredients: ["творог", "яйцо"],
      bju: { protein: 28, fat: 10, carbs: 22, calories: 290 },
      instructions: "200г творога, 1 яйцо, 2 ст.л. муки, щепотка соли. Жарь на сковороде по 3 мин с каждой стороны."
    },
    {
      name: "🍨 Творожный десерт с бананом",
      ingredients: ["творог", "банан"],
      bju: { protein: 22, fat: 5, carbs: 32, calories: 261 },
      instructions: "Взбей 200г творога с 1 бананом блендером. Охлади 30 минут."
    },
    {
      name: "🥗 Творог с овощами",
      ingredients: ["творог", "овощи"],
      bju: { protein: 20, fat: 5, carbs: 10, calories: 165 },
      instructions: "200г творога, нарезанные свежие овощи, зелень, немного соли."
    }
  ];
  
  availableProducts = Object.keys(foodDatabase);
  renderProductsGrid();
}

// ============================================================
// 2.5. ДИНАМИЧЕСКИЙ ФОН
// ============================================================

function changeBackground(theme) {
  console.log('changeBackground вызвана с темой:', theme);
  
  const bgImage = document.querySelector('.bg-image');
  if (!bgImage) {
    console.error('bg-image не найден в DOM');
    return;
  }
  
  // Прямые пути к картинкам
  let imagePath = '';
  
  switch(theme) {
    case 'calculator':
      imagePath = '/client/public/assets/images/calculator.png';
      break;
    case 'meals':
      imagePath = '/client/public/assets/images/bju.png';
      break;
    case 'report':
      imagePath = '/client/public/assets/images/report.png';
      break;
    case 'chat':
      imagePath = '/client/public/assets/images/chat.png';
      break;
    case 'recipes':
      imagePath = '/client/public/assets/images/recipes.png';
      break;
    case 'home':
    default:
      imagePath = '/client/public/assets/images/home.png';
      break;
  }
  
  bgImage.src = imagePath;
  bgImage.style.opacity = '0.3';
  console.log('Фон установлен:', imagePath);

  const overlay = document.querySelector('.bg-overlay');
  if (overlay) {
    let gradient = '';
    switch(theme) {
      case 'calculator': gradient = 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.25))'; break;
      case 'meals': gradient = 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.2))'; break;
      case 'report': gradient = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.2))'; break;
      case 'chat': gradient = 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.15))'; break;
      case 'recipes': gradient = 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(16, 185, 129, 0.2))'; break;
      default: gradient = 'linear-gradient(135deg, rgba(10, 10, 20, 0.7), rgba(8, 8, 24, 0.8))';
    }
    overlay.style.background = gradient;
  }
}


function renderSidebarImages() {
  const container = document.getElementById("sidebarImages");
  if (!container) return;
  const athletes = [
    { emoji: "🏋️", name: "Тяжёлая атлетика" },
    { emoji: "🏃", name: "Бег" },
    { emoji: "🧘", name: "Йога" },
    { emoji: "🥊", name: "Бокс" }
  ];
  container.innerHTML = athletes.map(a => `
    <div class="athlete-card">
      <div class="athlete-emoji">${a.emoji}</div>
      <div class="athlete-name">${a.name}</div>
    </div>
  `).join('');
}

// ============================================================
// 3. OPEN FOOD FACTS API
// ============================================================

const OPENFOODFACTS_API = "https://world.openfoodfacts.org/api/v0";

async function searchFoodInOpenFoodFacts(query) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments,code,brands`);
    const data = await response.json();
    if (data.products && data.products.length > 0) {
      return data.products.map(p => {
        const nutriments = p.nutriments || {};
        return {
          name: p.product_name || p.product_name_fr || query,
          brand: p.brands || "",
          protein: nutriments.proteins_100g || nutriments.proteins || 0,
          fat: nutriments.fat_100g || nutriments.fat || 0,
          carbs: nutriments.carbohydrates_100g || nutriments.carbohydrates || 0,
          calories: nutriments["energy-kcal_100g"] || nutriments["energy-kcal"] || 0,
          barcode: p.code,
          source: "openfoodfacts"
        };
      });
    }
    return [];
  } catch (error) {
    console.error("Ошибка Open Food Facts:", error);
    return [];
  }
}

function searchInLocalDatabase(query) {
  const result = findProductByName(query);
  if (!result) return null;
  return {
    name: result._key || query,
    protein: result.protein,
    fat: result.fat,
    carbs: result.carbs,
    unit: result.unit,
    perUnit: result.perUnit,
    source: "local"
  };
}

async function findProduct(productName, amount, unit) {
  const localResult = searchInLocalDatabase(productName);
  if (localResult) return { ...localResult, amount, unit };
  
  const apiResults = await searchFoodInOpenFoodFacts(productName);
  if (apiResults && apiResults.length > 0) {
    const bestMatch = apiResults[0];
    return {
      name: bestMatch.name,
      protein: bestMatch.protein,
      fat: bestMatch.fat,
      carbs: bestMatch.carbs,
      unit: "g",
      perUnit: 100,
      amount: amount,
      originalUnit: unit,
      source: "openfoodfacts",
      brand: bestMatch.brand
    };
  }
  return null;
}

// ============================================================
// 4. МОТИВАЦИОННЫЕ ЦИТАТЫ
// ============================================================

const quotes = [
  { text: "«Победа любит подготовку»", author: "— неизвестный атлет" },
  { text: "«Тяжело в учении — легко в бою»", author: "— Александр Суворов" },
  { text: "«Никогда не сдавайся»", author: "— Уинстон Черчилль" },
  { text: "«Тело — храм, питай его правильно»", author: "— древняя мудрость" },
  { text: "«Каждая капля пота приближает к цели»", author: "— неизвестно" },
  { text: "«Дисциплина — мост между целями и достижениями»", author: "— Джим Рон" },
  { text: "«Здоровье — это не всё, но без здоровья всё — ничто»", author: "— Сократ" },
  { text: "«Лучшее время начать — сейчас»", author: "— неизвестно" },
  { text: "«Не жалей себя — жалей свои слабости»", author: "— неизвестно" },
  { text: "«Ты — то, что ты ешь»", author: "— Гиппократ" }
];

function updateQuotes() {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  const quoteElement = document.getElementById("motivationQuote");
  if (quoteElement) {
    quoteElement.innerHTML = `${randomQuote.text}<br><span style="font-size: 10px; opacity: 0.7;">${randomQuote.author}</span>`;
  }
}

setInterval(updateQuotes, 10 * 60 * 1000);
updateQuotes();

function getSelectedDate() {
  const dateInput = document.getElementById("mealDate");
  if (dateInput && dateInput.value) return dateInput.value;
  return new Date().toISOString().split('T')[0];
}

// ============================================================
// 5. АВТОРИЗАЦИЯ
// ============================================================

window.onload = async () => {
  await loadData();
  renderSidebarImages();
  if (token && userId) {
    showApp();
    loadUserNorm();
    loadTodayMeals();
  }
};

function showApp() {
  document.getElementById("mainPage").classList.add("hidden");
  document.getElementById("appPage").classList.remove("hidden");
  changeBackground('calculator');
}

function logout() {
  localStorage.clear();
  location.reload();
}

async function register() {
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const res = await fetch("http://localhost:3001/register", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email: email.value, password: password.value })
  });
  const data = await res.json();
  if (data.error) alert(data.error);
  else alert("Регистрация успешна! Теперь войдите.");
}

async function login() {
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const res = await fetch("http://localhost:3001/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email: email.value, password: password.value })
  });
  const data = await res.json();
  if (data.error) { alert(data.error); return; }
  token = data.token;
  userId = data.userId;
  localStorage.setItem("token", token);
  localStorage.setItem("userId", userId);
  showApp();
  loadUserNorm();
  loadTodayMeals();
  renderProductsGrid();
}

// ============================================================
// 6. КАЛЬКУЛЯТОР БЖУ
// ============================================================

async function loadUserNorm() {
  const res = await fetch(`http://localhost:3001/norm/${userId}`);
  const data = await res.json();
  if (!data.error) {
    let goalText = "";
    if (data.goal === "lose") goalText = "Похудение 🔥";
    else if (data.goal === "gain") goalText = "Набор массы 💪";
    else goalText = "Поддержание ⚖️";
    document.getElementById("bjuResult").innerHTML = `
      <p><strong>📊 Ваша сохраненная норма:</strong></p>
      <p>🎯 ${goalText}</p>
      <p>🔥 Калории: <strong>${Math.round(data.calories)}</strong> ккал</p>
      <p>🥩 Белки: <strong>${Math.round(data.protein)}</strong> г</p>
      <p>🧈 Жиры: <strong>${Math.round(data.fat)}</strong> г</p>
      <p>🍚 Углеводы: <strong>${Math.round(data.carbs)}</strong> г</p>
      <small>⚡ Можно пересчитать заново</small>
    `;
  }
}

async function calculateBJU() {
  const weight = document.getElementById("weight");
  const height = document.getElementById("height");
  const age = document.getElementById("age");
  const goal = document.getElementById("goal");
  if (!weight.value || !height.value || !age.value) { alert("Заполните все поля"); return; }
  if (weight.value < 15 || weight.value > 300) { alert("Вес должен быть от 15 до 300 кг"); return; }
  if (height.value < 50 || height.value > 250) { alert("Рост должен быть от 50 до 250 см"); return; }
  if (age.value < 10 || age.value > 120) { alert("Возраст должен быть от 10 до 120 лет"); return; }
  const res = await fetch("http://localhost:3001/calculate", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      weight: +weight.value, height: +height.value, age: +age.value,
      userId: userId, goal: goal.value
    })
  });
  const data = await res.json();
  if (data.error) { alert(data.error); return; }
  document.getElementById("bjuResult").innerHTML = `
    <p><strong>📊 Ваша норма:</strong></p>
    <p>${data.goalMessage}</p>
    <p>🔥 Калории: <strong>${Math.round(data.calories)}</strong> ккал</p>
    <p>🥩 Белки: <strong>${Math.round(data.protein)}</strong> г</p>
    <p>🧈 Жиры: <strong>${Math.round(data.fat)}</strong> г</p>
    <p>🍚 Углеводы: <strong>${Math.round(data.carbs)}</strong> г</p>
  `;
}

// ============================================================
// 7. УПРАВЛЕНИЕ ПРИЁМАМИ ПИЩИ
// ============================================================

function loadTodayMeals() {
  const selectedDate = getSelectedDate();
  const saved = localStorage.getItem(`meals_${userId}_${selectedDate}`);
  todayMeals = saved ? JSON.parse(saved) : { breakfast: [], lunch: [], dinner: [], snack: [] };
  renderMeals();
}

function saveTodayMeals() {
  const selectedDate = getSelectedDate();
  localStorage.setItem(`meals_${userId}_${selectedDate}`, JSON.stringify(todayMeals));
  renderMeals();
}

async function addMeal(mealType) {
  const product = prompt("Введите продукт и количество (например: 3 яйца или 200 мл молока):");
  if (!product) return;
  const parsed = parseFoodMessage(product);
  if (!parsed) {
    alert("❌ Не удалось распознать продукт.\n\nПримеры:\n• 3 яйца\n• 200 г курицы\n• 100 мл молока");
    return;
  }
  const productInfo = await findProduct(parsed.productName, parsed.amount, parsed.unit);
  if (!productInfo) {
    alert(`❌ Продукт "${parsed.productName}" не найден.\nДоступные: ${availableProducts.join(", ")}`);
    return;
  }
  let multiplier = 1;
  if (productInfo.unit === 'g' || productInfo.unit === 'ml') multiplier = productInfo.amount / (productInfo.perUnit || 100);
  else if (productInfo.unit === 'pcs') multiplier = productInfo.amount;
  const protein = productInfo.protein * multiplier;
  const fat = productInfo.fat * multiplier;
  const carbs = productInfo.carbs * multiplier;
  todayMeals[mealType].push({
    name: productInfo.name, amount: parsed.amount, unit: parsed.unit,
    protein, fat, carbs, source: productInfo.source || "local"
  });
  saveTodayMeals();
  const mealNames = { breakfast: "🍳 Завтрак", lunch: "🍲 Обед", dinner: "🍽️ Ужин", snack: "🍎 Перекус" };
  alert(`✅ Добавлено в ${mealNames[mealType]}:\n\n${productInfo.name} (${parsed.amount} ${parsed.unit})\n🥩 ${protein.toFixed(1)}г белков\n🧈 ${fat.toFixed(1)}г жиров\n🍚 ${carbs.toFixed(1)}г углеводов`);
}

function removeMealItem(mealType, index) {
  todayMeals[mealType].splice(index, 1);
  saveTodayMeals();
}

function renderMeals() {
  const container = document.getElementById("mealsContainer");
  if (!container) return;
  let html = "", totalProtein = 0, totalFat = 0, totalCarbs = 0;
  const mealNames = { breakfast: "🍳 Завтрак", lunch: "🍲 Обед", dinner: "🍽️ Ужин", snack: "🍎 Перекус" };
  for (const [type, items] of Object.entries(todayMeals)) {
    if (items.length) {
      html += `<details style="margin-bottom: 10px;"><summary style="font-weight: bold; cursor: pointer;">${mealNames[type]} (${items.length})</summary><div style="margin-left: 15px; margin-top: 5px;">`;
      items.forEach((item, idx) => {
        html += `<div style="display: flex; justify-content: space-between; align-items: center; margin: 5px 0; padding: 5px; background: rgba(139,92,246,0.08); border-radius: 5px;">
          <span style="font-size:12px;">${item.amount} ${item.unit} ${item.name}<br>🥩${Math.round(item.protein)}г 🧈${Math.round(item.fat)}г 🍚${Math.round(item.carbs)}г</span>
          <button onclick="removeMealItem('${type}', ${idx})" style="width:auto; padding:2px 8px;">❌</button>
        </div>`;
        totalProtein += item.protein; totalFat += item.fat; totalCarbs += item.carbs;
      });
      html += `</div></details>`;
    } else {
      html += `<div style="margin-bottom:10px;"><strong>${mealNames[type]}</strong><br><span style="color:#666; font-size:12px;">Пусто</span></div>`;
    }
  }
  const calories = Math.round(totalProtein*4 + totalFat*9 + totalCarbs*4);
  html += `<hr><div style="margin-top:10px;"><strong>📊 Итого:</strong><br>🥩 ${Math.round(totalProtein)}г | 🧈 ${Math.round(totalFat)}г | 🍚 ${Math.round(totalCarbs)}г | 🔥 ${calories} ккал</div>`;
  container.innerHTML = html;
  document.getElementById("dailyTotal").innerHTML = `🥩 ${Math.round(totalProtein)}г | 🧈 ${Math.round(totalFat)}г | 🍚 ${Math.round(totalCarbs)}г | 🔥 ${calories} ккал`;
}

async function saveDailyToServer() {
  const selectedDate = getSelectedDate();
  let totalProtein = 0, totalFat = 0, totalCarbs = 0;
  for (const items of Object.values(todayMeals))
    for (const item of items) {
      totalProtein += item.protein; totalFat += item.fat; totalCarbs += item.carbs;
    }
  const res = await fetch("http://localhost:3001/food", {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ userId, date: selectedDate, protein: Math.round(totalProtein), fat: Math.round(totalFat), carbs: Math.round(totalCarbs) })
  });
  const data = await res.json();
  if (data.error) alert(data.error);
  else alert(`✅ День ${selectedDate} сохранён в отчёт!`);
}

// ============================================================
// 8. ОТЧЁТЫ И СТАТИСТИКА
// ============================================================

async function loadReport() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  let url = `http://localhost:3001/report/${userId}`;
  if (startDate && endDate) url += `?startDate=${startDate}&endDate=${endDate}`;
  const res = await fetch(url);
  const data = await res.json();
  const reportDiv = document.getElementById("report");
  if (data.length === 0) { reportDiv.innerHTML = "<p>😴 Нет данных за выбранный период</p>"; return; }
  const normRes = await fetch(`http://localhost:3001/norm/${userId}`);
  const norm = await normRes.json();
  let reportHtml = `<h3>📅 Отчет за период</h3>`;
  for (const item of data) {
    let statusHtml = "", isInNorm = false;
    if (!norm.error) {
      const proteinOk = item.protein <= norm.protein*1.1 && item.protein >= norm.protein*0.9;
      const fatOk = item.fat <= norm.fat*1.1 && item.fat >= norm.fat*0.9;
      const carbsOk = item.carbs <= norm.carbs*1.1 && item.carbs >= norm.carbs*0.9;
      isInNorm = proteinOk && fatOk && carbsOk;
      statusHtml = isInNorm ? '<span style="color:#10b981;">✅ В норме</span>' : '<span style="color:#ef4444;">❌ Норма не достигнута</span>';
    }
    reportHtml += `<div style="margin:10px 0; padding:12px; background:rgba(139,92,246,0.08); border-radius:12px; border-left:3px solid ${isInNorm ? '#10b981' : '#ef4444'};">
      <strong>📆 ${item.date}</strong> ${statusHtml}<br>
      🥩 Белки: ${Math.round(item.protein)} г ${!norm.error ? `(норма: ${Math.round(norm.protein)} г)` : ""}<br>
      🧈 Жиры: ${Math.round(item.fat)} г ${!norm.error ? `(норма: ${Math.round(norm.fat)} г)` : ""}<br>
      🍚 Углеводы: ${Math.round(item.carbs)} г ${!norm.error ? `(норма: ${Math.round(norm.carbs)} г)` : ""}
    </div>`;
  }
  reportDiv.innerHTML = reportHtml;
  loadStats();
}

async function loadStats() {
  const res = await fetch(`http://localhost:3001/stats/${userId}`);
  const stats = await res.json();
  if (stats.error) return;
  const statsDiv = document.getElementById("stats");
  const percent = stats.totalDays > 0 ? Math.round((stats.daysInNorm / stats.totalDays) * 100) : 0;
  let goalText = "";
  if (stats.norm.goal === "lose") goalText = "Похудение 🔥";
  else if (stats.norm.goal === "gain") goalText = "Набор массы 💪";
  else goalText = "Поддержание ⚖️";
  statsDiv.innerHTML = `<div style="margin-top:20px; padding:15px; background:rgba(139,92,246,0.1); border-radius:12px;">
    <h4>📊 Ваша статистика:</h4><p>🎯 Текущая цель: <strong>${goalText}</strong></p>
    <p>🎯 Дневная норма:</p><p>🥩 Белки: <strong>${Math.round(stats.norm.protein)}</strong> г</p>
    <p>🧈 Жиры: <strong>${Math.round(stats.norm.fat)}</strong> г</p><p>🍚 Углеводы: <strong>${Math.round(stats.norm.carbs)}</strong> г</p><hr>
    <p>✅ Дней в норме: <strong>${stats.daysInNorm}</strong></p><p>❌ Дней вне нормы: <strong>${stats.daysOutOfNorm}</strong></p>
    <p>📈 Процент соблюдения: <strong>${percent}%</strong></p>
    <progress value="${stats.daysInNorm}" max="${stats.totalDays}" style="width:100%; height:8px; border-radius:10px;"></progress>
  </div>`;
}

function filterWeek() {
  const today = new Date();
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
  document.getElementById("startDate").value = weekAgo.toISOString().split('T')[0];
  document.getElementById("endDate").value = today.toISOString().split('T')[0];
  loadReport();
}
function filterMonth() {
  const today = new Date();
  const monthAgo = new Date(today); monthAgo.setMonth(today.getMonth() - 1);
  document.getElementById("startDate").value = monthAgo.toISOString().split('T')[0];
  document.getElementById("endDate").value = today.toISOString().split('T')[0];
  loadReport();
}
function filterAll() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  loadReport();
}

// ============================================================
// 9. ПАРСИНГ ПРОДУКТОВ
// ============================================================

function parseFoodMessage(message) {
  const lowerMsg = message.toLowerCase().trim();

  // Паттерны: "200 г курицы", "150г лосося", "3 яйца", "курица 200г"
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм|граммов|мл|миллилитр|миллилитров|шт|штук|штуки|порц|порция|порций)?\s+([а-яёА-ЯЁ][а-яёА-ЯЁ\s]*)/i,
    /([а-яёА-ЯЁ][а-яёА-ЯЁ\s]+?)\s+(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм|граммов|мл|шт|штук|штуки)?/i,
  ];

  let amount = null, unit = "g", productName = null;

  for (const pattern of patterns) {
    const match = pattern.exec(lowerMsg);
    if (match) {
      const first = match[1], second = match[2];
      if (!isNaN(parseFloat(first)) && second) {
        amount = parseFloat(first.replace(',', '.'));
        productName = second.trim().replace(/\s+/g, ' ');
      } else if (!isNaN(parseFloat(second)) && first) {
        amount = parseFloat(second.replace(',', '.'));
        productName = first.trim().replace(/\s+/g, ' ');
      }
      if (amount && productName) break;
    }
  }

  // Определяем единицу по контексту сообщения
  if (productName) {
    const msgLower = lowerMsg;
    if (msgLower.includes('мл') || msgLower.includes('миллилитр')) unit = 'ml';
    else if (msgLower.includes('шт') || msgLower.includes('штук')) unit = 'pcs';
    else {
      // Определяем по типу продукта
      const matched = findProductByName(productName);
      if (matched) unit = matched.unit;
      else unit = 'g';
    }
  }

  if (amount && productName) return { amount, unit, productName };
  return null;
}

function findProductByName(name) {
  const lower = name.toLowerCase().trim();
  // Точное совпадение ключа
  if (foodDatabase[lower]) return foodDatabase[lower];
  // Поиск по формам слова
  for (const [key, data] of Object.entries(foodDatabase)) {
    if (!data.forms) continue;
    for (const form of data.forms) {
      if (lower === form || lower.includes(form) || form.includes(lower)) {
        return { ...data, _key: key };
      }
    }
  }
  // Нечёткий поиск — ключ содержится в запросе или наоборот
  for (const [key, data] of Object.entries(foodDatabase)) {
    if (lower.includes(key) || key.includes(lower)) return { ...data, _key: key };
  }
  return null;
}

// ============================================================
// 10. РЕЦЕПТЫ И ПРОДУКТЫ
// ============================================================

function renderProductsGrid() {
  const container = document.getElementById("productsGrid");
  if (!container) return;
  const saved = JSON.parse(localStorage.getItem(`selectedProducts_${userId}`) || "[]");
  container.innerHTML = availableProducts.map(product => `
    <div class="product-card ${saved.includes(product) ? 'selected' : ''}" onclick="toggleProduct('${product}')">
      <span class="product-emoji">${getProductEmoji(product)}</span>
      <span class="product-name">${product}</span>
    </div>
  `).join('');
}

function getProductEmoji(product) {
  const emojis = {
    'курица':'🍗','рис':'🍚','яйцо':'🥚','молоко':'🥛','овсянка':'🥣','творог':'🥛','сыр':'🧀','банан':'🍌',
    'рыба':'🐟','гречка':'🌾','овощи':'🥬','протеин':'💪','яблоко':'🍎','орехи':'🥜','авокадо':'🥑','лосось':'🐟',
    'тофу':'🥟','чечевица':'🫘','киноа':'🌾','нут':'🫘'
  };
  return emojis[product] || '🍽️';
}

function toggleProduct(product) {
  let saved = JSON.parse(localStorage.getItem(`selectedProducts_${userId}`) || "[]");
  saved = saved.includes(product) ? saved.filter(p => p !== product) : [...saved, product];
  localStorage.setItem(`selectedProducts_${userId}`, JSON.stringify(saved));
  renderProductsGrid();
}

const productSynonyms = {
  "курица": ["курица", "куриное филе", "куриная грудка"],
  "рис": ["рис", "рисовый"],
  "яйцо": ["яйцо", "яйца"],
  "молоко": ["молоко", "молочко"],
  "овсянка": ["овсянка", "овсяные хлопья"],
  "творог": ["творог", "творожный", "сырник", "сырники"],
  "овощи": ["овощи", "овощное ассорти"]
};

function isIngredientMatch(selectedProduct, recipeIngredient) {
  const productLower = selectedProduct.toLowerCase();
  const ingredientLower = recipeIngredient.toLowerCase();
  if (productLower === ingredientLower) return true;
  if (ingredientLower.includes(productLower)) return true;
  if (productLower.includes(ingredientLower)) return true;
  const synonyms = productSynonyms[selectedProduct] || [selectedProduct];
  return synonyms.some(syn => ingredientLower.includes(syn.toLowerCase()) || syn.toLowerCase().includes(ingredientLower));
}

function getMatchingIngredients(selectedProducts, recipeIngredients) {
  const matches = [];
  for (const product of selectedProducts) {
    for (const ingredient of recipeIngredients) {
      if (isIngredientMatch(product, ingredient)) {
        matches.push({ product, ingredient });
        break;
      }
    }
  }
  return matches;
}

function findRecipesByProducts(selectedProducts, allRecipes) {
  return allRecipes.map(recipe => {
    const matches = getMatchingIngredients(selectedProducts, recipe.ingredients);
    const matchCount = matches.length;
    const matchPercentage = (matchCount / recipe.ingredients.length) * 100;
    const missingIngredients = recipe.ingredients.filter(ing => !selectedProducts.some(product => isIngredientMatch(product, ing)));
    return { ...recipe, matchCount, matchPercentage, missingIngredients, matches };
  }).sort((a, b) => b.matchCount - a.matchCount);
}

function switchRecipeTab(tab) {
  const mealPlanPanel = document.getElementById("panelMealPlan");
  const productsPanel = document.getElementById("panelProducts");
  const tabMealPlan = document.getElementById("tabMealPlan");
  const tabProducts = document.getElementById("tabProducts");
  if (tab === 'mealplan') {
    mealPlanPanel.style.display = 'block';
    productsPanel.style.display = 'none';
    tabMealPlan.style.background = 'var(--gradient-btn)';
    tabMealPlan.style.color = 'white';
    tabMealPlan.style.border = 'none';
    tabProducts.style.background = 'rgba(255,255,255,0.05)';
    tabProducts.style.color = 'var(--text-dim)';
    tabProducts.style.border = '1px solid var(--border)';
    renderMealPlanSection();
  } else {
    mealPlanPanel.style.display = 'none';
    productsPanel.style.display = 'block';
    tabProducts.style.background = 'var(--gradient-btn)';
    tabProducts.style.color = 'white';
    tabProducts.style.border = 'none';
    tabMealPlan.style.background = 'rgba(255,255,255,0.05)';
    tabMealPlan.style.color = 'var(--text-dim)';
    tabMealPlan.style.border = '1px solid var(--border)';
  }
}

function findRecipes() {
  const saved = JSON.parse(localStorage.getItem(`selectedProducts_${userId}`) || "[]");
  const container = document.getElementById("productsRecipesList");
  if (saved.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:var(--text-dim); padding:20px;">❌ Выберите хотя бы один продукт</p>';
    return;
  }
  const rankedRecipes = findRecipesByProducts(saved, recipes);
  const recipesWithMatches = rankedRecipes.filter(r => r.matchCount > 0);
  if (recipesWithMatches.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-dim); padding:20px;">😴 Нет рецептов с выбранными продуктами<br><small>Попробуйте выбрать другие продукты</small></div>`;
    return;
  }
  container.innerHTML = `<div style="margin-bottom:15px; padding:10px; background:rgba(139,92,246,0.1); border-radius:12px; text-align:center;">🎯 Найдено ${recipesWithMatches.length} рецептов из ${recipes.length}</div>
    ${recipesWithMatches.map(recipe => {
      const matchPercent = Math.round(recipe.matchPercentage);
      let matchColor = matchPercent >= 80 ? '#10b981' : matchPercent >= 50 ? '#f59e0b' : '#ef4444';
      return `<div class="recipe-card">
        <div class="recipe-header"><span class="recipe-name">${recipe.name}</span><span class="recipe-badge" style="background:${matchColor}20; color:${matchColor};">${recipe.matchCount}/${recipe.ingredients.length} продуктов</span></div>
        <div class="recipe-match-bar"><div style="height:6px; background:rgba(255,255,255,0.1); border-radius:10px;"><div style="width:${matchPercent}%; height:100%; background:${matchColor}; border-radius:10px;"></div></div><div style="font-size:11px; margin-top:4px; color:var(--text-dim);">${matchPercent}% совпадение</div></div>
        <div class="recipe-ingredients">🥘 <strong>Ингредиенты:</strong> ${recipe.ingredients.join(', ')}</div>
        ${recipe.missingIngredients.length ? `<div class="recipe-missing">⚠️ Не хватает: ${recipe.missingIngredients.join(', ')}</div>` : `<div class="recipe-ready">✅ У вас есть все ингредиенты!</div>`}
        <div class="recipe-bju">🥩 ${recipe.bju.protein}г | 🧈 ${recipe.bju.fat}г | 🍚 ${recipe.bju.carbs}г | 🔥 ${recipe.bju.calories} ккал</div>
        <div class="recipe-instructions">📖 ${recipe.instructions}</div>
        ${recipe.missingIngredients.length && recipe.missingIngredients.length <= 2 ? `<button onclick="suggestToBuy('${recipe.missingIngredients.join(', ')}')" style="margin-top:12px; width:100%; background:rgba(139,92,246,0.2); border:1px solid var(--border);">🛒 Докупить: ${recipe.missingIngredients.join(', ')}</button>` : ''}
      </div>`;
    }).join('')}`;
}

function suggestToBuy(missingIngredients) {
  alert(`✨ Для этого рецепта нужно докупить:\n📦 ${missingIngredients}\n\nДобавьте их в список продуктов и попробуйте снова!`);
}

// ============================================================
// 11. G-BOT (Telegram-подобные сообщения)
// ============================================================

let chatHistory = [];

function addChatMessage(type, text, showButtons = false, extraData = null) {
  const chatDiv = document.getElementById("chatMessages");
  const now = new Date();
  const timeString = now.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
  const placeholder = chatDiv.querySelector('.chat-placeholder');
  if (placeholder && chatDiv.children.length === 1) chatDiv.innerHTML = "";
  const messageContainer = document.createElement("div");
  messageContainer.className = `message-wrapper ${type === 'user' ? 'user-wrapper' : 'bot-wrapper'}`;
  const avatar = document.createElement("div");
  avatar.className = `message-avatar ${type === 'user' ? 'user-avatar' : 'bot-avatar'}`;
  avatar.innerHTML = type === 'user' ? '👤' : '🤖';
  const contentDiv = document.createElement("div");
  contentDiv.className = `message-content ${type === 'user' ? 'user-message' : 'bot-message'}`;
  const senderName = document.createElement("div");
  senderName.className = "message-sender";
  senderName.innerHTML = type === 'user' ? 'Вы' : 'G-BOT';
  const textDiv = document.createElement("div");
  textDiv.className = "message-text";
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:#06b6d4; text-decoration:underline;">$1</a>').replace(/\n/g, '<br>');
  textDiv.innerHTML = formattedText;
  const timeDiv = document.createElement("div");
  timeDiv.className = "message-time";
  timeDiv.innerHTML = timeString;
  contentDiv.appendChild(senderName);
  contentDiv.appendChild(textDiv);
  contentDiv.appendChild(timeDiv);
  if (showButtons) {
    const btnDiv = document.createElement("div");
    btnDiv.className = "chat-action-buttons";
    btnDiv.id = "mealActionButtons";
    btnDiv.innerHTML = `
      <div style="font-size:12px; color:var(--text-dim); margin-bottom:8px;">➕ Добавить в приём пищи:</div>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        <button onclick="addToMeal('breakfast')" style="flex:1; min-width:100px;">🍳 Завтрак</button>
        <button onclick="addToMeal('lunch')" style="flex:1; min-width:100px;">🍲 Обед</button>
        <button onclick="addToMeal('dinner')" style="flex:1; min-width:100px;">🍽️ Ужин</button>
        <button onclick="addToMeal('snack')" style="flex:1; min-width:100px;">🍎 Перекус</button>
        <button onclick="cancelAdd()" style="flex:1; min-width:100px; background:rgba(236,72,153,0.15); border:1px solid rgba(236,72,153,0.3); color:var(--pink);">❌ Отмена</button>
      </div>`;
    contentDiv.appendChild(btnDiv);
  }
  messageContainer.appendChild(avatar);
  messageContainer.appendChild(contentDiv);
  chatDiv.appendChild(messageContainer);
  chatDiv.scrollTo({ top: chatDiv.scrollHeight, behavior: 'smooth' });
  chatHistory.push({ type, text, time: timeString });
  if (chatHistory.length > 50) chatHistory.shift();
}

function showTypingIndicator() {
  const chatDiv = document.getElementById("chatMessages");
  const existing = document.getElementById("typingIndicator");
  if (existing) existing.remove();
  const typingWrapper = document.createElement("div");
  typingWrapper.id = "typingIndicator";
  typingWrapper.className = "message-wrapper bot-wrapper typing-wrapper";
  const avatar = document.createElement("div");
  avatar.className = "message-avatar bot-avatar";
  avatar.innerHTML = '🤖';
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content bot-message typing-indicator";
  contentDiv.innerHTML = "<span>●</span><span>●</span><span>●</span>";
  typingWrapper.appendChild(avatar);
  typingWrapper.appendChild(contentDiv);
  chatDiv.appendChild(typingWrapper);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

function hideTypingIndicator() {
  const typing = document.getElementById("typingIndicator");
  if (typing) typing.remove();
}

function setExample(text) {
  const input = document.getElementById("chatInput");
  if (input) { input.value = text; input.focus(); }
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;
  addChatMessage("user", message);
  input.value = "";
  showTypingIndicator();
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("статистик") || lowerMsg.includes("прогресс") || lowerMsg.includes("мои показатели")) await handleStatsRequest();
  else if (lowerMsg.includes("норма") || lowerMsg.includes("сколько нужно") || lowerMsg.includes("дневная норма")) await handleNormRequest();
  else if (lowerMsg.includes("видео") || lowerMsg.includes("техника") || lowerMsg.includes("как делать") || lowerMsg.includes("упражнение")) await handleVideoRequest(message);
  else if (lowerMsg.includes("рецепт") || lowerMsg.includes("приготовить") || lowerMsg.includes("блюдо")) await handleRecipeRequest(message);
  else if (lowerMsg.includes("мотивация") || lowerMsg.includes("вдохновение") || lowerMsg.includes("поддержка")) handleMotivationRequest();
  else if (lowerMsg.includes("совет") || lowerMsg.includes("что такое") || lowerMsg.includes("как")) handleTipRequest(lowerMsg);
  else {
    const parsed = parseFoodMessage(message);
    if (parsed) await handleProductRequest(parsed);
    else setTimeout(() => { hideTypingIndicator(); addChatMessage("bot", "❌ Не совсем понял запрос.\n\n💡 **Примеры:**\n• 200 г курицы\n• рецепт с курицей и рисом\n• техника приседаний\n• моя статистика\n• что такое БЖУ\n• мотивация"); }, 500);
  }
}

async function handleStatsRequest() {
  if (!userId) { hideTypingIndicator(); addChatMessage("bot", "🔐 Войдите в личный кабинет!"); return; }
  try {
    const res = await fetch(`http://localhost:3001/stats/${userId}`);
    const stats = await res.json();
    if (stats.error) { hideTypingIndicator(); addChatMessage("bot", "📊 Сначала рассчитайте норму БЖУ!"); return; }
    const percent = stats.totalDays > 0 ? Math.round((stats.daysInNorm / stats.totalDays)*100) : 0;
    let response = `📊 **Твоя статистика:**\n\n✅ Дней в норме: **${stats.daysInNorm}**\n❌ Дней вне нормы: **${stats.daysOutOfNorm}**\n📈 Процент соблюдения: **${percent}%**\n📆 Всего дней: **${stats.totalDays}**\n\n🎯 Твоя дневная норма:\n🥩 Белки: ${Math.round(stats.norm.protein)} г\n🧈 Жиры: ${Math.round(stats.norm.fat)} г\n🍚 Углеводы: ${Math.round(stats.norm.carbs)} г\n🔥 Калории: ${Math.round(stats.norm.calories)} ккал\n\n💪 GG! Так держать!`;
    hideTypingIndicator(); addChatMessage("bot", response);
  } catch(e) { hideTypingIndicator(); addChatMessage("bot", "❌ Ошибка загрузки статистики."); }
}

async function handleNormRequest() {
  if (!userId) { hideTypingIndicator(); addChatMessage("bot", "🔐 Войдите в личный кабинет!"); return; }
  try {
    const res = await fetch(`http://localhost:3001/norm/${userId}`);
    const norm = await res.json();
    if (norm.error) { hideTypingIndicator(); addChatMessage("bot", "📊 Сначала рассчитайте норму в калькуляторе!"); return; }
    let response = `📊 **Твоя персональная норма:**\n\n🎯 ${norm.goal === 'lose' ? 'Похудение' : norm.goal === 'gain' ? 'Набор массы' : 'Поддержание веса'}\n\n🔥 Калории: **${Math.round(norm.calories)}** ккал\n🥩 Белки: **${Math.round(norm.protein)}** г\n🧈 Жиры: **${Math.round(norm.fat)}** г\n🍚 Углеводы: **${Math.round(norm.carbs)}** г\n\n💡 GG! Придерживайся этих значений!`;
    hideTypingIndicator(); addChatMessage("bot", response);
  } catch(e) { hideTypingIndicator(); addChatMessage("bot", "❌ Не удалось загрузить норму."); }
}

async function handleVideoRequest(query) {
  let exercise = query.replace(/видео|техника|как делать|упражнение|найди|покажи/gi,'').trim();
  if (!exercise) exercise = "тренировка";
  const videoDatabase = {
    "приседание":{title:"Как правильно делать приседания со штангой",url:"https://youtu.be/aclHkVu9j0o"},
    "становая":{title:"Техника становой тяги",url:"https://youtu.be/1ZXobu7JwhE"},
    "жим":{title:"Техника жима лёжа",url:"https://youtu.be/rT7DgCr-3pg"},
    "подтягивание":{title:"Как научиться подтягиваться",url:"https://youtu.be/eGo4IYjbE6g"},
    "отжимание":{title:"Техника отжиманий",url:"https://youtu.be/IODxDxX7oi4"},
    "пресс":{title:"Топ упражнений на пресс",url:"https://youtu.be/EIj0OiWbVp4"},
    "планка":{title:"Как правильно делать планку",url:"https://youtu.be/pSHjTRCQxIw"}
  };
  hideTypingIndicator();
  let found = false, videoTitle="", videoUrl="";
  for (const [key, video] of Object.entries(videoDatabase)) {
    if (exercise.includes(key)) { videoTitle=video.title; videoUrl=video.url; found=true; break; }
  }
  if (found) addChatMessage("bot", `🎥 **${videoTitle}**\n\n🔗 [Смотреть видео на YouTube](${videoUrl})\n\n💡 GG! Смотри и отрабатывай технику!`);
  else addChatMessage("bot", `🎥 **Видео по запросу "${exercise}"**\n\n🔗 [Найти видео на YouTube](https://youtube.com/results?search_query=${encodeURIComponent(exercise+' техника выполнения')})\n\n💡 GG! Смотри и совершенствуй технику!`);
}

async function handleRecipeRequest(query) {
  hideTypingIndicator();
  const recipesList = [
    { name:"🍗 Курица с рисом", ingredients:["курица","рис"], calories:450, protein:35, fat:12, carbs:45 },
    { name:"🥚 Омлет с овощами", ingredients:["яйца","овощи"], calories:320, protein:22, fat:18, carbs:8 },
    { name:"🥣 Овсяная каша", ingredients:["овсянка","молоко"], calories:340, protein:12, fat:8, carbs:55 },
    { name:"🥢 Тофу с овощами", ingredients:["тофу","овощи"], calories:248, protein:20, fat:12, carbs:15 },
    { name:"🍲 Чечевичный суп", ingredients:["чечевица","овощи"], calories:207, protein:15, fat:3, carbs:30 },
    { name:"🥗 Киноа с овощами", ingredients:["киноа","овощи"], calories:214, protein:12, fat:6, carbs:28 }
  ];
  let response = `🍳 **Рецепты по твоему запросу:**\n\n`;
  recipesList.slice(0,3).forEach(recipe => {
    response += `📖 **${recipe.name}**\n   Ингредиенты: ${recipe.ingredients.join(", ")}\n   🔥 ${recipe.calories} ккал | 🥩 ${recipe.protein}г | 🧈 ${recipe.fat}г | 🍚 ${recipe.carbs}г\n\n`;
  });
  response += `💡 GG! Хочешь добавить что-то в рацион? Просто напиши!`;
  addChatMessage("bot", response);
}

function handleMotivationRequest() {
  hideTypingIndicator();
  const quotes = ["💪 GG! Ты уже сделал первый шаг!","🔥 Сегодня ты лучше, чем вчера!","🎯 Дисциплина сегодня — свобода завтра!","⚡ GG x FIT — играем в твою пользу!","💯 Лучше, чем вчера — уже GG!"];
  addChatMessage("bot", `${quotes[Math.floor(Math.random()*quotes.length)]}\n\n💪 GG! Продолжай в том же духе!`);
}

function handleTipRequest(query) {
  hideTypingIndicator();
  if (query.includes("бжу")) addChatMessage("bot", "📚 **Что такое БЖУ?**\n\nБелки — 4 ккал/г\nЖиры — 9 ккал/г\nУглеводы — 4 ккал/г\n\n💡 Баланс БЖУ — ключ к успеху!");
  else if (query.includes("белок")) addChatMessage("bot", "🥩 **Совет по белку:**\n\n1.6-2.2 г на кг веса. Источники: курица, рыба, яйца, творог, протеин.\n\n💪 GG!");
  else addChatMessage("bot", "📚 **Совет G-BOT:**\n\n• Пей воду — 30 мл на кг веса\n• Не пропускай приёмы пищи\n• Спи 7-8 часов\n• Веди дневник питания\n\n💪 GG!");
}

async function handleProductRequest(parsed) {
  const productInfo = await findProduct(parsed.productName, parsed.amount, parsed.unit);
  hideTypingIndicator();
  if (!productInfo) { addChatMessage("bot", `❌ Продукт "${parsed.productName}" не найден.\n💡 Попробуй: ${availableProducts.slice(0,5).join(", ")}`); return; }
  let multiplier = 1;
  if (productInfo.unit === 'g' || productInfo.unit === 'ml') multiplier = productInfo.amount / (productInfo.perUnit || 100);
  else if (productInfo.unit === 'pcs') multiplier = productInfo.amount;
  const protein = productInfo.protein * multiplier;
  const fat = productInfo.fat * multiplier;
  const carbs = productInfo.carbs * multiplier;
  const calories = Math.round(protein*4 + fat*9 + carbs*4);
  let response = `✅ **${productInfo.name}** (${parsed.amount} ${parsed.unit})\n\n📊 **БЖУ:**\n🥩 Белки: ${protein.toFixed(1)} г\n🧈 Жиры: ${fat.toFixed(1)} г\n🍚 Углеводы: ${carbs.toFixed(1)} г\n🔥 Калории: ${calories} ккал\n\n➕ Добавить в рацион?`;
  pendingFoodResult = { details: [{ name: productInfo.name, amount: parsed.amount, unit: parsed.unit, protein: protein.toFixed(1), fat: fat.toFixed(1), carbs: carbs.toFixed(1) }] };
  addChatMessage("bot", response, true);
}

function addToMeal(mealType) {
  if (!pendingFoodResult) { addChatMessage("bot", "❌ Нет продукта для добавления. Сначала спроси о продукте!"); return; }
  for (const detail of pendingFoodResult.details) {
    todayMeals[mealType].push({
      name: detail.name, amount: detail.amount, unit: detail.unit,
      protein: parseFloat(detail.protein), fat: parseFloat(detail.fat), carbs: parseFloat(detail.carbs)
    });
  }
  saveTodayMeals();
  const mealNames = { breakfast: "🍳 Завтрак", lunch: "🍲 Обед", dinner: "🍽️ Ужин", snack: "🍎 Перекус" };
  const detail = pendingFoodResult.details[0];
  // Убираем кнопки после добавления
  const btns = document.getElementById("mealActionButtons");
  if (btns) btns.remove();
  addChatMessage("bot", `✅ **${detail.name}** добавлено в **${mealNames[mealType]}**!\n\n🥩 ${detail.protein}г белков | 🧈 ${detail.fat}г жиров | 🍚 ${detail.carbs}г углеводов\n\n💡 Переключись на вкладку «Рацион» чтобы увидеть итого за день!`);
  pendingFoodResult = null;
}
function cancelAdd() {
  pendingFoodResult = null;
  const btns = document.getElementById("mealActionButtons");
  if (btns) btns.remove();
  addChatMessage("bot", "❌ Добавление отменено");
}
function getMealName(type) { const names = { breakfast:"Завтрак", lunch:"Обед", dinner:"Ужин", snack:"Перекус" }; return names[type]; }

// ============================================================
// 12. ГЛАВНАЯ СТРАНИЦА (НОВОСТИ)
// ============================================================

// Новости ротируются каждый день — 8 из пула показываются ежедневно
const ALL_NEWS = [
  { title:"🏋️ Топ-5 продуктов для набора мышечной массы", link:"https://sport24.ru/news/other/2021-01-25-luchshie-produkty-dlya-nabora-myshechnoy-massy" },
  { title:"📖 Как правильно делать становую тягу: полный гайд", link:"https://www.menshealth.com/fitness/a19536087/deadlift-form/" },
  { title:"⏰ Интервальное голодание: плюсы и минусы", link:"https://sport24.ru/news/other/2019-11-04-intervalnoe-golodanie-vse-chto-nuzhno-znat" },
  { title:"❌ 10 мифов о спортивном питании", link:"https://www.menshealth.com/nutrition/a19536578/supplement-myths/" },
  { title:"🧮 Как рассчитать свою норму калорий", link:"https://sport24.ru/news/other/2020-04-06-kak-rasschitat-normu-kaloriy" },
  { title:"💪 Лучшие упражнения для пресса", link:"https://www.menshealth.com/fitness/a19536616/best-abs-exercises/" },
  { title:"💧 Сколько воды пить во время тренировки", link:"https://sport24.ru/news/other/2021-03-12-skolko-vody-nuzhno-pit-vo-vremya-trenirovki" },
  { title:"🥛 Как выбрать протеин: гид для начинающих", link:"https://www.menshealth.com/nutrition/a19536041/whey-protein-guide/" },
  { title:"🔥 HIIT тренировки: максимальный эффект за 20 минут", link:"https://www.menshealth.com/fitness/a19536387/hiit-workouts/" },
  { title:"🥩 Сколько белка нужно есть для роста мышц", link:"https://sport24.ru/news/other/2020-08-18-skolko-belka-nuzhno-est-dlya-rosta-myshts" },
  { title:"😴 Почему сон важен для восстановления", link:"https://www.menshealth.com/health/a19545491/sleep-and-muscle-recovery/" },
  { title:"🧘 Растяжка после тренировки: зачем и как", link:"https://sport24.ru/news/other/2019-09-23-rastyazhka-posle-trenirovki" },
  { title:"🍽️ Что есть до и после тренировки", link:"https://www.menshealth.com/nutrition/a19536184/what-to-eat-before-workout/" },
  { title:"📊 Дефицит калорий для похудения: как считать", link:"https://sport24.ru/news/other/2021-05-10-defitsit-kaloriy-dlya-pokhudeniya" },
  { title:"⚡ Кофе перед тренировкой: польза и вред", link:"https://www.menshealth.com/nutrition/a19536463/coffee-before-workout/" },
  { title:"🏃 Бег или силовые: что лучше для похудения", link:"https://sport24.ru/news/other/2020-06-15-beg-ili-silovye-trenirovki-chto-luchshe" },
];

function getTodayNews() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const shuffled = [...ALL_NEWS].sort((a, b) => {
    // Детерминированная перемешка по дню года
    const hashA = (ALL_NEWS.indexOf(a) * 7 + dayOfYear * 3) % ALL_NEWS.length;
    const hashB = (ALL_NEWS.indexOf(b) * 7 + dayOfYear * 3 + 1) % ALL_NEWS.length;
    return hashA - hashB;
  });
  return shuffled.slice(0, 6);
}

const FULL_MEAL_PLANS = {
  lose: {
    name: "Рацион для похудения 🔥",
    calories: 1800,
    desc: "Дефицит 20%, 1800 ккал/день",
    days: [
      { day: "День 1", meals: [
        { type:"Завтрак", food:"Овсянка на воде 80г + 2 яйца всмятку + чай", p:22, f:14, c:54, kcal:434 },
        { type:"Обед", food:"Куриная грудка 200г + гречка 80г + огурец", p:48, f:7, c:56, kcal:479 },
        { type:"Перекус", food:"Творог 0% 150г + яблоко", p:22, f:0, c:22, kcal:176 },
        { type:"Ужин", food:"Рыба запечённая 200г + овощи на гриле 200г", p:38, f:8, c:14, kcal:280 },
      ]},
      { day: "День 2", meals: [
        { type:"Завтрак", food:"Омлет из 3 яиц + помидор + кофе без сахара", p:21, f:18, c:5, kcal:266 },
        { type:"Обед", food:"Индейка 200г + рис 80г + брокколи 150г", p:46, f:5, c:50, kcal:425 },
        { type:"Перекус", food:"Кефир 1% 250мл + горсть орехов 20г", p:11, f:12, c:10, kcal:190 },
        { type:"Ужин", food:"Говядина нежирная 180г + салат из свежих овощей", p:40, f:10, c:8, kcal:282 },
      ]},
      { day: "День 3", meals: [
        { type:"Завтрак", food:"Творог 5% 200г + ягоды 100г + 1 ч.л. мёда", p:24, f:10, c:22, kcal:274 },
        { type:"Обед", food:"Лосось 180г + гречка 80г + зелёный салат", p:40, f:16, c:54, kcal:520 },
        { type:"Перекус", food:"2 яйца варёных + огурец", p:14, f:12, c:2, kcal:172 },
        { type:"Ужин", food:"Куриная грудка 180г + тушёные овощи 250г", p:42, f:5, c:16, kcal:277 },
      ]},
    ]
  },
  gain: {
    name: "Рацион для набора массы 💪",
    calories: 3200,
    desc: "Профицит 15%, 3200 ккал/день",
    days: [
      { day: "День 1", meals: [
        { type:"Завтрак", food:"Овсянка 120г на молоке + 4 яйца + банан + мёд", p:40, f:22, c:110, kcal:794 },
        { type:"2-й завтрак", food:"Творог 5% 200г + 30г орехов + 1 банан", p:28, f:18, c:36, kcal:418 },
        { type:"Обед", food:"Куриная грудка 300г + рис 150г + авокадо", p:72, f:20, c:60, kcal:700 },
        { type:"Перекус", food:"Протеиновый коктейль + банан + арахисовая паста 30г", p:30, f:18, c:40, kcal:442 },
        { type:"Ужин", food:"Говядина 250г + гречка 100г + овощной салат", p:56, f:18, c:72, kcal:674 },
      ]},
      { day: "День 2", meals: [
        { type:"Завтрак", food:"4 яйца омлет + сыр 40г + 2 тоста + молоко 300мл", p:42, f:28, c:40, kcal:580 },
        { type:"2-й завтрак", food:"Греческий йогурт 200г + гранола 50г + ягоды", p:18, f:8, c:60, kcal:388 },
        { type:"Обед", food:"Лосось 250г + рис 150г + брокколи 200г", p:56, f:24, c:60, kcal:680 },
        { type:"Перекус", food:"Творог 200г + 2 банана + мёд", p:26, f:5, c:65, kcal:405 },
        { type:"Ужин", food:"Индейка 300г + макароны 120г + томатный соус", p:66, f:10, c:90, kcal:726 },
      ]},
    ]
  },
  maintain: {
    name: "Сбалансированное питание ⚖️",
    calories: 2500,
    desc: "Поддержание веса, 2500 ккал/день",
    days: [
      { day: "День 1", meals: [
        { type:"Завтрак", food:"Овсянка 100г на молоке + 2 яйца + фрукты", p:24, f:14, c:80, kcal:546 },
        { type:"Обед", food:"Куриная грудка 200г + рис 100г + овощи 200г", p:48, f:8, c:50, kcal:464 },
        { type:"Перекус", food:"Творог 150г + орехи 20г + банан", p:22, f:12, c:30, kcal:316 },
        { type:"Ужин", food:"Рыба 200г + картофель 200г + салат", p:38, f:10, c:36, kcal:386 },
      ]},
      { day: "День 2", meals: [
        { type:"Завтрак", food:"Гречка 100г + 3 яйца + молоко 200мл", p:30, f:18, c:58, kcal:510 },
        { type:"Обед", food:"Говядина 180г + гречка 100г + брокколи", p:44, f:14, c:58, kcal:546 },
        { type:"Перекус", food:"Йогурт 150г + яблоко + орехи 15г", p:10, f:10, c:30, kcal:250 },
        { type:"Ужин", food:"Лосось 180г + рис 80г + салат из свежих овощей", p:40, f:16, c:40, kcal:464 },
      ]},
    ]
  },
  keto: {
    name: "Кето-диета 🥑",
    calories: 2000,
    desc: "Низкоуглеводное питание, <50г углеводов/день",
    days: [
      { day: "День 1", meals: [
        { type:"Завтрак", food:"4 яйца с беконом 60г + авокадо + кофе с маслом", p:32, f:52, c:4, kcal:608 },
        { type:"Обед", food:"Говядина 250г + брокколи на масле 200г + сыр", p:52, f:38, c:8, kcal:584 },
        { type:"Перекус", food:"Орехи грецкие 40г + сыр Чеддер 40г", p:12, f:36, c:4, kcal:388 },
        { type:"Ужин", food:"Лосось 200г + шпинат с маслом + яйца 2шт", p:46, f:38, c:4, kcal:546 },
      ]},
      { day: "День 2", meals: [
        { type:"Завтрак", food:"Омлет 3 яйца + сливки 50мл + бекон + авокадо", p:26, f:50, c:4, kcal:570 },
        { type:"Обед", food:"Куриная грудка 200г + цветная капуста 300г + масло", p:46, f:22, c:10, kcal:422 },
        { type:"Перекус", food:"Творог жирный 150г + орехи 30г", p:22, f:28, c:4, kcal:356 },
        { type:"Ужин", food:"Стейк говяжий 220г + спаржа 150г + сливочный соус", p:48, f:36, c:6, kcal:548 },
      ]},
    ]
  },
  veg: {
    name: "Вегетарианский рацион 🌱",
    calories: 2200,
    desc: "Без мяса, с высоким содержанием белка",
    days: [
      { day: "День 1", meals: [
        { type:"Завтрак", food:"Овсянка 100г на молоке + орехи 30г + банан", p:18, f:14, c:90, kcal:562 },
        { type:"Обед", food:"Чечевица 200г + рис 80г + тушёные овощи 200г", p:24, f:4, c:72, kcal:420 },
        { type:"Перекус", food:"Творог 200г + ягоды 100г + мёд", p:24, f:10, c:26, kcal:290 },
        { type:"Ужин", food:"Тофу 200г + гречка 80г + брокколи 200г", p:22, f:10, c:60, kcal:422 },
      ]},
      { day: "День 2", meals: [
        { type:"Завтрак", food:"Омлет 3 яйца + сыр 30г + помидор + тост", p:26, f:22, c:20, kcal:382 },
        { type:"Обед", food:"Нут 200г + киноа 80г + овощной салат с маслом", p:20, f:10, c:72, kcal:458 },
        { type:"Перекус", food:"Греческий йогурт 200г + орехи 25г + яблоко", p:16, f:14, c:30, kcal:314 },
        { type:"Ужин", food:"Яйца 3шт + картофель запечённый 200г + овощи", p:20, f:16, c:40, kcal:384 },
      ]},
    ]
  }
};

const WORKOUT_TYPES = {
  split: {
    name: "💪 Сплит (3 дня)",
    desc: "Каждый день — отдельная группа мышц. Для среднего и продвинутого уровня.",
    days: [
      { day: "День A — Грудь + Трицепс", exercises: [
        { name:"Жим штанги лёжа", sets:"4×8-10", tip:"Лопатки сведены, небольшой мост" },
        { name:"Жим гантелей под углом 30°", sets:"3×10-12", tip:"Полная амплитуда, не разводи локти" },
        { name:"Разводка гантелей", sets:"3×12-15", tip:"Лёгкий изгиб в локтях, ощущай растяжку" },
        { name:"Отжимания на брусьях", sets:"3×12", tip:"Корпус чуть вперёд для акцента на грудь" },
        { name:"Французский жим", sets:"3×12", tip:"Локти не расходятся" },
        { name:"Разгибания на блоке", sets:"3×15", tip:"Контроль в нижней точке" },
      ]},
      { day: "День B — Спина + Бицепс", exercises: [
        { name:"Становая тяга", sets:"4×5-6", tip:"Спина прямая, штанга скользит по ногам" },
        { name:"Подтягивания широким хватом", sets:"4×max", tip:"Полная амплитуда, без рывков" },
        { name:"Тяга штанги в наклоне", sets:"4×8-10", tip:"Тяни локтями назад, не корпусом" },
        { name:"Тяга верхнего блока", sets:"3×12", tip:"Тяни к подбородку, сводя лопатки" },
        { name:"Подъём штанги на бицепс", sets:"3×10-12", tip:"Не раскачивайся" },
        { name:"Молотки с гантелями", sets:"3×12", tip:"Нейтральный хват, контроль движения" },
      ]},
      { day: "День C — Ноги + Плечи", exercises: [
        { name:"Приседания со штангой", sets:"4×8-10", tip:"Колени над носками, спина прямая" },
        { name:"Жим ногами", sets:"3×12", tip:"Не блокируй колени в верхней точке" },
        { name:"Выпады с гантелями", sets:"3×12", tip:"Шаг широкий, корпус прямо" },
        { name:"Жим штанги стоя", sets:"4×8-10", tip:"Корпус не отклоняй назад" },
        { name:"Тяга штанги к подбородку", sets:"3×12", tip:"Локти выше кистей" },
        { name:"Махи гантелями в стороны", sets:"3×15", tip:"Небольшой наклон вперёд" },
      ]},
    ]
  },
  cardio: {
    name: "🏃 Кардио программа",
    desc: "Сжигание жира и улучшение выносливости. Для начинающих и продолжающих.",
    days: [
      { day: "День 1 — HIIT (20 мин)", exercises: [
        { name:"Бёрпи", sets:"4×30 сек / 15 сек отдых", tip:"Максимальная интенсивность" },
        { name:"Прыжки на месте (джампинг джек)", sets:"4×30 сек", tip:"Руки активно работают" },
        { name:"Бег на месте с высоким подъёмом колен", sets:"4×30 сек", tip:"Колени до пояса" },
        { name:"Скалолаз (mountain climber)", sets:"4×30 сек", tip:"Спина ровная, темп высокий" },
        { name:"Прыжки в стороны (lateral jumps)", sets:"4×30 сек", tip:"Мягкое приземление" },
      ]},
      { day: "День 2 — Бег / Велосипед (40 мин)", exercises: [
        { name:"Разминка — ходьба", sets:"5 мин", tip:"ЧСС 50-60% от макс" },
        { name:"Лёгкий бег", sets:"10 мин", tip:"ЧСС 65-70% — можешь говорить" },
        { name:"Умеренный темп", sets:"15 мин", tip:"ЧСС 70-80% — тяжело говорить" },
        { name:"Ускорение", sets:"5 мин", tip:"ЧСС 80-90% — максимальное усилие" },
        { name:"Заминка — ходьба", sets:"5 мин", tip:"Восстановление пульса" },
      ]},
      { day: "День 3 — Круговая тренировка", exercises: [
        { name:"Прыжки со скакалкой", sets:"3×2 мин", tip:"Приземление на носки" },
        { name:"Отжимания", sets:"3×15-20", tip:"Тело в одну линию" },
        { name:"Приседания с прыжком", sets:"3×15", tip:"Мягкое приземление" },
        { name:"Планка", sets:"3×45 сек", tip:"Не прогибай поясницу" },
        { name:"Пресс — скручивания", sets:"3×20", tip:"Поясница прижата к полу" },
      ]},
    ]
  },
  strength: {
    name: "🏋️ Силовая программа",
    desc: "Максимальное развитие силы. Базовые движения, малые повторения.",
    days: [
      { day: "День 1 — Присед (80-90% от макс)", exercises: [
        { name:"Приседания со штангой", sets:"5×5", tip:"Работаем с большим весом, не менее 3 мин отдых" },
        { name:"Фронтальные приседания", sets:"3×5", tip:"Акцент на квадрицепс" },
        { name:"Жим ногами", sets:"3×8", tip:"Доп нагрузка после основного движения" },
        { name:"Сгибание ног лёжа", sets:"3×10", tip:"Бицепс бедра" },
        { name:"Подъёмы на икры", sets:"4×12", tip:"Полная амплитуда" },
      ]},
      { day: "День 2 — Жим (80-90% от макс)", exercises: [
        { name:"Жим штанги лёжа", sets:"5×5", tip:"Отдых 3-4 мин между подходами" },
        { name:"Жим стоя (ОХП)", sets:"4×5", tip:"Базовое движение для плеч" },
        { name:"Жим гантелей лёжа", sets:"3×8", tip:"Вспомогательная работа" },
        { name:"Отжимания на брусьях", sets:"3×8", tip:"С отягощением если нужно" },
        { name:"Трицепс на блоке", sets:"3×12", tip:"Изолирующее движение" },
      ]},
      { day: "День 3 — Тяга (80-90% от макс)", exercises: [
        { name:"Становая тяга", sets:"5×3", tip:"Главное упражнение сессии" },
        { name:"Подтягивания с весом", sets:"4×5", tip:"Добавь 5-10 кг на пояс" },
        { name:"Тяга штанги в наклоне", sets:"4×6", tip:"Строгая техника, нет рывков" },
        { name:"Тяга гантели одной рукой", sets:"3×8", tip:"Фиксируй спину на скамье" },
        { name:"Подъём штанги на бицепс", sets:"3×8", tip:"Чистое движение без раскачки" },
      ]},
    ]
  },
  fullbody: {
    name: "⚡ Фулл Боди (3 дня/нед)",
    desc: "Всё тело за одну тренировку. Идеально для новичков и при ограниченном времени.",
    days: [
      { day: "Тренировка A", exercises: [
        { name:"Приседания со штангой", sets:"3×10", tip:"Акцент на технику" },
        { name:"Жим штанги лёжа", sets:"3×10", tip:"Базовое движение на грудь" },
        { name:"Тяга штанги в наклоне", sets:"3×10", tip:"Спина + бицепс" },
        { name:"Жим штанги стоя", sets:"3×10", tip:"Плечи + трицепс" },
        { name:"Становая тяга румынская", sets:"3×10", tip:"Бицепс бедра" },
        { name:"Планка", sets:"3×30 сек", tip:"Кор и стабилизация" },
      ]},
      { day: "Тренировка B", exercises: [
        { name:"Фронтальные приседания", sets:"3×8", tip:"Акцент на квадрицепс" },
        { name:"Жим гантелей лёжа", sets:"3×10", tip:"Вариация жима" },
        { name:"Подтягивания (или тяга блока)", sets:"3×10", tip:"Ширина спины" },
        { name:"Тяга гантелей к поясу", sets:"3×10", tip:"Средняя часть спины" },
        { name:"Выпады с гантелями", sets:"3×10", tip:"По 10 на каждую ногу" },
        { name:"Скручивания на пресс", sets:"3×15", tip:"Не тяни за шею" },
      ]},
      { day: "Тренировка C", exercises: [
        { name:"Приседания с гантелями", sets:"3×12", tip:"Легче чем A, больше повторений" },
        { name:"Отжимания от пола", sets:"3×15", tip:"Тело прямое" },
        { name:"Тяга верхнего блока", sets:"3×12", tip:"К груди широким хватом" },
        { name:"Разводка гантелей стоя", sets:"3×12", tip:"Плечи, лёгкий вес" },
        { name:"Жим гантелями стоя", sets:"3×12", tip:"Жим над головой" },
        { name:"Мёртвая тяга с гантелями", sets:"3×12", tip:"Контроль при опускании" },
      ]},
    ]
  }
};

const exercisesData = [
  { name:"Приседания со штангой", desc:"Держите спину прямо, колени не выходят за носки", videoUrl:"https://youtu.be/aclHkVu9j0o" },
  { name:"Становая тяга", desc:"Спина прямая, штанга скользит по ногам", videoUrl:"https://youtu.be/1ZXobu7JwhE" },
  { name:"Жим лёжа", desc:"Лопатки сведены, мост в пояснице", videoUrl:"https://youtu.be/rT7DgCr-3pg" },
  { name:"Подтягивания", desc:"Полная амплитуда, без рывков", videoUrl:"https://youtu.be/eGo4IYjbE6g" },
  { name:"Отжимания на брусьях", desc:"Корпус прямой, локти прижаты", videoUrl:"https://youtu.be/IODxDxX7oi4" },
  { name:"Тяга штанги в наклоне", desc:"Спина прямая, движение локтями назад", videoUrl:"https://youtu.be/0lz9L7K5qCk" }
];

function loadMainPageData() {
  const today = new Date().toLocaleDateString('ru-RU', {day:'numeric', month:'long'});

  // === НОВОСТИ (ежедневная ротация) ===
  const newsContainer = document.getElementById('newsList');
  if (newsContainer) {
    const todayNews = getTodayNews();
    newsContainer.innerHTML = todayNews.map(news => `
      <div class="news-item" onclick="window.open('${news.link}','_blank')" style="cursor:pointer;">
        <div class="news-title">${news.title}</div>
        <div class="news-date">📅 ${today} · Читать →</div>
      </div>`).join('');
  }

  // === ГОТОВЫЕ РАЦИОНЫ (кликабельные) ===
  const mealPlansContainer = document.getElementById('mealPlans');
  if (mealPlansContainer) {
    mealPlansContainer.innerHTML = Object.entries(FULL_MEAL_PLANS).map(([key, plan]) => `
      <div class="meal-plan-item" onclick="showFullMealPlan('${key}')" style="cursor:pointer; transition:all 0.2s;" onmouseover="this.style.paddingLeft='8px'" onmouseout="this.style.paddingLeft='0'">
        <div class="meal-plan-name">${plan.name}</div>
        <div class="meal-plan-desc">${plan.desc} · <span style="color:var(--cyan);">Открыть рацион →</span></div>
      </div>`).join('');
  }

  // === ВИДЫ ТРЕНИРОВОК + УПРАЖНЕНИЯ ===
  const exercisesContainer = document.getElementById('exercisesList');
  if (exercisesContainer) {
    const workoutBtns = Object.entries(WORKOUT_TYPES).map(([key, wt]) => `
      <div class="exercise-item" onclick="showWorkoutPlan('${key}')" style="cursor:pointer;">
        <div class="exercise-name">${wt.name}</div>
        <div class="exercise-desc">${wt.desc}</div>
      </div>`).join('');
    const techBtns = exercisesData.map(ex => `
      <div class="exercise-item" onclick="window.open('${ex.videoUrl}','_blank')" style="cursor:pointer;">
        <div class="exercise-name">🎥 ${ex.name}</div>
        <div class="exercise-desc">${ex.desc}</div>
      </div>`).join('');
    exercisesContainer.innerHTML = `
      <div style="font-size:11px; color:var(--cyan); font-weight:700; letter-spacing:1px; margin-bottom:8px;">ВИДЫ ТРЕНИРОВОК</div>
      ${workoutBtns}
      <div style="font-size:11px; color:var(--cyan); font-weight:700; letter-spacing:1px; margin:14px 0 8px;">ПРАВИЛЬНАЯ ТЕХНИКА</div>
      ${techBtns}`;
  }

  changeBackground('home');
}

// === МОДАЛ: Полный рацион ===
function showFullMealPlan(key) {
  const plan = FULL_MEAL_PLANS[key];
  if (!plan) return;
  const overlay = document.createElement('div');
  overlay.id = 'planModal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:2000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
  const box = document.createElement('div');
  box.style.cssText = 'background:#0a0816;border:1px solid rgba(139,92,246,0.35);border-radius:24px;padding:32px;max-width:680px;width:90%;max-height:85vh;overflow-y:auto;position:relative;';
  let html = `<button onclick="document.getElementById('planModal').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;width:auto;padding:0;">✕</button>
    <h2 style="font-family:'Orbitron',sans-serif;font-size:1.1rem;color:#06b6d4;margin-bottom:4px;">${plan.name}</h2>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:24px;">🔥 ${plan.calories} ккал/день · ${plan.desc}</p>`;
  plan.days.forEach(day => {
    let dayP=0, dayF=0, dayC=0, dayK=0;
    day.meals.forEach(m => { dayP+=m.p; dayF+=m.f; dayC+=m.c; dayK+=m.kcal; });
    html += `<div style="margin-bottom:20px;"><div style="font-family:'Orbitron',sans-serif;font-size:0.75rem;color:#8b5cf6;letter-spacing:1px;margin-bottom:12px;">📅 ${day.day}</div>`;
    day.meals.forEach(m => {
      html += `<div style="margin-bottom:8px;padding:12px;background:rgba(139,92,246,0.06);border-radius:12px;border-left:3px solid #8b5cf6;">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">🍽️ ${m.type}</div>
        <div style="font-size:13px;color:#e2e8f0;margin-bottom:6px;">${m.food}</div>
        <div style="font-size:11px;color:#94a3b8;">🥩 ${m.p}г · 🧈 ${m.f}г · 🍚 ${m.c}г · 🔥 ${m.kcal} ккал</div>
      </div>`;
    });
    html += `<div style="padding:8px 12px;background:rgba(6,182,212,0.08);border-radius:10px;font-size:12px;color:#06b6d4;margin-top:4px;">📊 Итого за день: 🥩 ${dayP}г · 🧈 ${dayF}г · 🍚 ${dayC}г · 🔥 ${dayK} ккал</div></div>`;
  });
  html += `<p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">💡 Полный 30-дневный рацион — вариации каждые 3 дня с теми же принципами</p>`;
  box.innerHTML = html;
  overlay.appendChild(box);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

// === МОДАЛ: Программа тренировок ===
function showWorkoutPlan(key) {
  const plan = WORKOUT_TYPES[key];
  if (!plan) return;
  const overlay = document.createElement('div');
  overlay.id = 'workoutModal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:2000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
  const box = document.createElement('div');
  box.style.cssText = 'background:#0a0816;border:1px solid rgba(139,92,246,0.35);border-radius:24px;padding:32px;max-width:680px;width:90%;max-height:85vh;overflow-y:auto;position:relative;';
  let html = `<button onclick="document.getElementById('workoutModal').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;width:auto;padding:0;">✕</button>
    <h2 style="font-family:'Orbitron',sans-serif;font-size:1.1rem;color:#06b6d4;margin-bottom:4px;">${plan.name}</h2>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:24px;">${plan.desc}</p>`;
  plan.days.forEach(day => {
    html += `<div style="margin-bottom:20px;"><div style="font-family:'Orbitron',sans-serif;font-size:0.75rem;color:#8b5cf6;letter-spacing:1px;margin-bottom:12px;">🏋️ ${day.day}</div>`;
    day.exercises.forEach((ex, i) => {
      html += `<div style="margin-bottom:8px;padding:12px;background:rgba(139,92,246,0.06);border-radius:12px;border-left:3px solid rgba(6,182,212,0.5);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-weight:700;font-size:13px;">${i+1}. ${ex.name}</span>
          <span style="font-size:11px;background:rgba(6,182,212,0.15);color:#06b6d4;padding:2px 8px;border-radius:20px;">${ex.sets}</span>
        </div>
        <div style="font-size:12px;color:#94a3b8;">💡 ${ex.tip}</div>
      </div>`;
    });
    html += `</div>`;
  });
  box.innerHTML = html;
  overlay.appendChild(box);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

function showAllMealPlans() { showFullMealPlan('lose'); }
function showAllExercises() { showWorkoutPlan('fullbody'); }

// ============================================================
// 13. МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ
// ============================================================

function showAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }
async function registerFromModal() {
  const email = document.getElementById("modalEmail"), password = document.getElementById("modalPassword");
  const res = await fetch("http://localhost:3001/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:email.value, password:password.value }) });
  const data = await res.json();
  if (data.error) alert(data.error); else alert("Регистрация успешна! Теперь войдите.");
}
async function loginFromModal() {
  const email = document.getElementById("modalEmail"), password = document.getElementById("modalPassword");
  const res = await fetch("http://localhost:3001/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:email.value, password:password.value }) });
  const data = await res.json();
  if (data.error) { alert(data.error); return; }
  token = data.token; userId = data.userId;
  localStorage.setItem("token", token); localStorage.setItem("userId", userId);
  closeAuthModal(); showApp(); loadUserNorm(); loadTodayMeals(); renderProductsGrid();
}
window.showApp = function() {
  document.getElementById("mainPage").classList.add("hidden");
  document.getElementById("appPage").classList.remove("hidden");
  if (typeof loadUserNorm === 'function') loadUserNorm();
  if (typeof loadTodayMeals === 'function') loadTodayMeals();
  if (typeof renderProductsGrid === 'function') renderProductsGrid();
};

// ============================================================
// 14. ИНИЦИАЛИЗАЦИЯ И СОБЫТИЯ
// ============================================================

// ============================================================
// 15. РОТАЦИЯ ЧИПОВ G-BOT (не повторяются)
// ============================================================

const ALL_CHIPS = [
  { label: "🍗 200г курицы", text: "200 г курицы" },
  { label: "🥚 3 яйца", text: "3 яйца" },
  { label: "🥛 150г творога", text: "150 г творога" },
  { label: "🍚 100г риса", text: "100 г риса" },
  { label: "🐟 150г лосося", text: "150 г лосося" },
  { label: "🍌 1 банан", text: "1 банан" },
  { label: "🥣 80г овсянки", text: "80 г овсянки" },
  { label: "🍳 Рецепты с курицей", text: "рецепт с курицей и рисом" },
  { label: "🥗 Рецепты с творогом", text: "рецепт с творогом" },
  { label: "🎥 Техника приседаний", text: "техника приседаний" },
  { label: "🎥 Техника жима", text: "техника жима лёжа" },
  { label: "📊 Моя норма", text: "моя норма калорий" },
  { label: "📈 Мой прогресс", text: "статистика за неделю" },
  { label: "📚 Что такое БЖУ", text: "что такое БЖУ" },
  { label: "💧 Норма воды", text: "сколько воды пить" },
  { label: "💪 Мотивация", text: "мотивация" },
  { label: "🔥 Как похудеть", text: "как правильно похудеть" },
  { label: "💪 Как набрать массу", text: "как набрать мышечную массу" },
];

let lastChipIndices = [];

function renderCommandChips() {
  const container = document.getElementById("commandChips");
  if (!container) return;
  // Берём 8 чипов, исключая недавно показанные
  const available = ALL_CHIPS.map((c, i) => i).filter(i => !lastChipIndices.includes(i));
  const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 8);
  lastChipIndices = shuffled;
  container.innerHTML = shuffled.map(i => {
    const chip = ALL_CHIPS[i];
    return `<div class="command-chip" onclick="setExampleAndRefresh('${chip.text}')">${chip.label}</div>`;
  }).join('');
}

function setExampleAndRefresh(text) {
  setExample(text);
  // Обновляем чипы чтобы не повторялись
  setTimeout(renderCommandChips, 300);
}

// ============================================================
// 16. ГОТОВЫЕ ВАРИАНТЫ РАЦИОНОВ ПО ПРИЁМАМ ПИЩИ
// ============================================================

const DAILY_MEAL_PLANS = {
  breakfast: [
    { name: "🥣 Овсянка с бананом и мёдом", protein: 14, fat: 8, carbs: 62, calories: 378, recipe: "80г овсянки на 200мл молока, 1 банан, 1 ч.л. мёда" },
    { name: "🍳 Омлет с сыром и помидорами", protein: 22, fat: 18, carbs: 4, calories: 262, recipe: "3 яйца, 30г сыра, 1 помидор, зелень" },
    { name: "🥛 Творог с ягодами и орехами", protein: 24, fat: 10, carbs: 18, calories: 258, recipe: "200г творога 5%, горсть ягод, 20г грецких орехов" },
    { name: "🥞 Гречневая каша с молоком", protein: 12, fat: 5, carbs: 48, calories: 285, recipe: "100г гречки, 150мл молока, щепотка соли" },
    { name: "🥗 Йогурт с гранолой и фруктами", protein: 10, fat: 6, carbs: 45, calories: 274, recipe: "150г греческого йогурта, 40г гранолы, 1 яблоко" },
    { name: "🍞 Тосты с авокадо и яйцом пашот", protein: 18, fat: 20, carbs: 28, calories: 360, recipe: "2 тоста, 1 авокадо, 2 яйца пашот, соль, лимон" },
  ],
  lunch: [
    { name: "🍗 Куриная грудка с рисом и овощами", protein: 42, fat: 8, carbs: 50, calories: 440, recipe: "200г куриного филе, 100г риса, микс овощей на гриле" },
    { name: "🐟 Лосось с гречкой и брокколи", protein: 38, fat: 18, carbs: 36, calories: 462, recipe: "180г лосося запечённого, 80г гречки, 150г брокколи" },
    { name: "🍲 Борщ с говядиной + хлеб", protein: 28, fat: 12, carbs: 38, calories: 372, recipe: "250мл борща с говядиной, 2 ломтя ржаного хлеба" },
    { name: "🥗 Салат с тунцом и яйцами", protein: 35, fat: 14, carbs: 12, calories: 314, recipe: "1 банка тунца, 2 яйца, листья салата, огурец, оливковое масло" },
    { name: "🌯 Бурито с курицей и фасолью", protein: 36, fat: 10, carbs: 56, calories: 458, recipe: "Тортилья, 150г курицы, 80г фасоли, салат, сальса" },
    { name: "🍜 Куриный суп с лапшой", protein: 30, fat: 8, carbs: 42, calories: 364, recipe: "Куриный бульон, 150г курицы, 60г лапши, морковь, зелень" },
  ],
  dinner: [
    { name: "🥩 Говяжий стейк с овощами гриль", protein: 40, fat: 16, carbs: 14, calories: 360, recipe: "200г говядины, цукини, болгарский перец, оливковое масло" },
    { name: "🐟 Запечённая рыба с картофелем", protein: 34, fat: 12, carbs: 40, calories: 408, recipe: "200г трески, 200г картофеля запечённого, лимон, зелень" },
    { name: "🍗 Курица в духовке с гречкой", protein: 38, fat: 10, carbs: 38, calories: 398, recipe: "200г куриного бедра б/к, 80г гречки, чеснок, специи" },
    { name: "🥘 Рагу из индейки с овощами", protein: 36, fat: 8, carbs: 24, calories: 312, recipe: "200г индейки, кабачок, морковь, лук, томаты" },
    { name: "🧆 Котлеты из нута с салатом", protein: 20, fat: 10, carbs: 42, calories: 338, recipe: "200г нута, специи, запечь, салат из свежих овощей" },
    { name: "🍳 Яичница с беконом и авокадо", protein: 28, fat: 32, carbs: 8, calories: 436, recipe: "3 яйца, 50г бекона, 1/2 авокадо, тост" },
  ],
  snack: [
    { name: "🍎 Яблоко с арахисовой пастой", protein: 6, fat: 16, carbs: 28, calories: 284, recipe: "1 большое яблоко, 2 ст.л. арахисовой пасты" },
    { name: "🥛 Протеиновый коктейль", protein: 25, fat: 4, carbs: 8, calories: 164, recipe: "1 порция протеина, 300мл молока или воды" },
    { name: "🧀 Творог с мёдом", protein: 18, fat: 5, carbs: 14, calories: 173, recipe: "150г творога, 1 ч.л. мёда, корица" },
    { name: "🥜 Смесь орехов и сухофруктов", protein: 8, fat: 18, carbs: 22, calories: 282, recipe: "20г грецких орехов, 20г миндаля, 15г изюма" },
    { name: "🫐 Греческий йогурт с ягодами", protein: 14, fat: 4, carbs: 16, calories: 156, recipe: "150г греческого йогурта 2%, горсть ягод" },
    { name: "🥚 Варёные яйца с овощами", protein: 16, fat: 12, carbs: 6, calories: 196, recipe: "2 варёных яйца, огурец, морковь, щепотка соли" },
  ]
};

function getDayMealPlan() {
  // Каждый день — другие варианты (меняются по дню недели)
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const result = {};
  for (const [mealType, options] of Object.entries(DAILY_MEAL_PLANS)) {
    const offset = dayOfYear % options.length;
    // Берём 3 варианта начиная с offset
    result[mealType] = [
      options[offset % options.length],
      options[(offset + 1) % options.length],
      options[(offset + 2) % options.length],
    ];
  }
  return result;
}

function renderMealPlanSection() {
  const container = document.getElementById("recipesList");
  if (!container) return;
  const plan = getDayMealPlan();
  const mealLabels = { breakfast: "🍳 Завтрак", lunch: "🍲 Обед", dinner: "🍽️ Ужин", snack: "🍎 Перекус" };

  // Расширенные шаги приготовления для каждого блюда
  const cookingSteps = {
    "🥣 Овсянка с бананом и мёдом": ["Залей 80г хлопьев 200мл молока", "Вари 5 мин на среднем огне, помешивая", "Нарежь банан кружочками", "Выложи в тарелку, добавь банан и 1 ч.л. мёда"],
    "🍳 Омлет с сыром и помидорами": ["Взбей 3 яйца с щепоткой соли", "Нарежь помидор и натри 30г сыра", "Разогрей сковороду, вылей яйца", "Через 2 мин добавь помидор и сыр, сложи пополам"],
    "🥛 Творог с ягодами и орехами": ["Выложи 200г творога в миску", "Добавь горсть свежих или замороженных ягод", "Измельчи 20г грецких орехов", "Перемешай, можно добавить стевию"],
    "🥞 Гречневая каша с молоком": ["Промой 100г гречки", "Залей 200мл воды, доведи до кипения", "Вари 15 мин на малом огне", "Слей лишнюю воду, добавь 150мл горячего молока"],
    "🥗 Йогурт с гранолой и фруктами": ["Возьми 150г греческого йогурта", "Нарежь яблоко кубиками", "Насыпь 40г гранолы поверх йогурта", "Добавь фрукты, по желанию — корицу"],
    "🍞 Тосты с авокадо и яйцом пашот": ["Поджарь 2 тоста", "Разомни авокадо с лимоном и солью", "Вскипяти воду, добавь уксус, создай воронку", "Разбей яйцо и вари 3 мин, выложи на тост"],
    "🍗 Куриная грудка с рисом и овощами": ["Отвари 100г риса (15 мин)", "Нарежь 200г филе, посоли, поперчи", "Обжарь курицу по 4 мин с каждой стороны", "Добавь овощи, туши 5 мин под крышкой"],
    "🐟 Лосось с гречкой и брокколи": ["Отвари 80г гречки (15 мин)", "Посоли лосось, сбрызни лимоном", "Запекай при 180° 15-18 мин", "Отвари брокколи 5 мин, подавай всё вместе"],
    "🍲 Борщ с говядиной + хлеб": ["Свари говядину в бульоне 40 мин", "Добавь нарезанные свёклу, морковь, картофель", "Через 20 мин добавь капусту и томатную пасту", "Вари ещё 10 мин, подавай со сметаной и хлебом"],
    "🥗 Салат с тунцом и яйцами": ["Свари 2 яйца вкрутую (8 мин)", "Нарежь огурец, листья салата", "Открой тунца, слей жидкость", "Смешай всё, заправь оливковым маслом и лимоном"],
    "🌯 Бурито с курицей и фасолью": ["Обжарь 150г курицы с чесноком и специями", "Разогрей 80г консервированной фасоли", "Выложи начинку на тортилью", "Добавь листья салата и сальсу, сверни"],
    "🍜 Куриный суп с лапшой": ["Свари куриный бульон с морковью и луком", "Добавь 150г нарезанной курицы", "Засыпь 60г лапши, вари 7 мин", "Посоли, добавь зелень, подавай горячим"],
    "🥩 Говяжий стейк с овощами гриль": ["Вытащи говядину заранее, дай нагреться", "Посоли, поперчи, смажь маслом", "Жарь на раскалённой сковороде 3-4 мин с каждой стороны", "Дай отдохнуть 5 мин, нарежь, подавай с овощами"],
    "🐟 Запечённая рыба с картофелем": ["Нарежь 200г картофеля дольками, посоли, в духовку 200° на 20 мин", "Посоли треску, добавь лимон и зелень", "Положи рыбу в духовку на 15 мин", "Подавай с картофелем и лимоном"],
    "🍗 Курица в духовке с гречкой": ["Замаринуй куриное бедро в чесноке и специях", "Запекай при 200° 30-35 мин", "Отвари 80г гречки", "Подавай вместе, добавь зелень"],
    "🥘 Рагу из индейки с овощами": ["Нарежь 200г индейки кубиками", "Обжарь лук и морковь до золотистости", "Добавь индейку, обжарь 5 мин", "Добавь нарезанные томаты и кабачок, туши 20 мин"],
    "🧆 Котлеты из нута с салатом": ["Смешай 200г варёного нута со специями блендером", "Сформируй котлеты, обваляй в панировке", "Запекай при 190° 20-25 мин", "Подавай с салатом из свежих овощей"],
    "🍳 Яичница с беконом и авокадо": ["Обжарь 50г бекона до хруста", "На том же масле пожарь 3 яйца", "Нарежь авокадо дольками", "Подавай всё вместе с тостом"],
    "🍎 Яблоко с арахисовой пастой": ["Вымой и нарежь яблоко дольками", "Отмерь 2 ст.л. арахисовой пасты", "Окунай дольки в пасту — готово!"],
    "🥛 Протеиновый коктейль": ["Налей 300мл молока или воды в шейкер", "Добавь 1 мерную ложку протеина", "Закрой и встряхни 15-20 раз", "Выпей сразу после тренировки"],
    "🧀 Творог с мёдом": ["Выложи 150г творога в миску", "Добавь 1 ч.л. мёда", "Посыпь щепоткой корицы", "Перемешай и подавай охлаждённым"],
    "🥜 Смесь орехов и сухофруктов": ["Отмерь 20г грецких орехов", "Добавь 20г миндаля и 15г изюма", "Перемешай в небольшой ёмкости", "Подавай как есть, не требует готовки"],
    "🫐 Греческий йогурт с ягодами": ["Выложи 150г греческого йогурта", "Добавь горсть свежих или мороженых ягод", "Можно посыпать льняными семенами", "Подавай сразу или охлаждённым"],
    "🥚 Варёные яйца с овощами": ["Свари 2 яйца: 8 мин для вкрутую", "Охлади в холодной воде, очисти", "Нарежь яйца и свежие овощи", "Посоли, по желанию — немного горчицы"],
  };

  let html = `<div style="margin-bottom:20px; padding:14px; background:rgba(6,182,212,0.1); border:1px solid rgba(6,182,212,0.2); border-radius:16px; text-align:center;">
    📅 Варианты на сегодня — <strong>${new Date().toLocaleDateString('ru-RU', {weekday:'long', day:'numeric', month:'long'})}</strong><br>
    <small style="color:var(--text-dim)">Варианты меняются каждый день</small>
  </div>`;

  for (const [mealType, meals] of Object.entries(plan)) {
    html += `<div style="margin-bottom:28px;">
      <h3 style="font-family:'Orbitron',sans-serif; font-size:0.85rem; color:var(--cyan); margin-bottom:12px; letter-spacing:1px;">${mealLabels[mealType]}</h3>
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${meals.map((meal, idx) => {
          const steps = cookingSteps[meal.name] || [meal.recipe];
          const stepsHtml = steps.map((s, i) => `<div style="display:flex;gap:8px;margin-bottom:4px;"><span style="color:var(--cyan);font-weight:700;min-width:18px;">${i+1}.</span><span style="font-size:12px;color:#e2e8f0;">${s}</span></div>`).join('');
          return `<div class="recipe-card" style="cursor:default;">
            <div class="recipe-header">
              <span class="recipe-name" style="font-size:14px;">${meal.name}</span>
              <span class="recipe-badge" style="background:rgba(6,182,212,0.15); color:var(--cyan);">Вариант ${idx+1}</span>
            </div>
            <div class="recipe-bju" style="margin:8px 0;">🥩 ${meal.protein}г | 🧈 ${meal.fat}г | 🍚 ${meal.carbs}г | 🔥 ${meal.calories} ккал</div>
            <div style="margin:10px 0 4px; font-size:11px; font-weight:700; color:var(--purple); letter-spacing:0.5px;">📋 КАК ПРИГОТОВИТЬ:</div>
            <div style="background:rgba(0,0,0,0.2); border-radius:10px; padding:10px 12px; margin-bottom:10px;">
              ${stepsHtml}
            </div>
            <button onclick="addMealPlanToRation('${mealType}', ${idx})" style="width:100%; background:rgba(139,92,246,0.15); border:1px solid var(--border); height:36px; border-radius:10px; font-size:12px; cursor:pointer; color:var(--text);">➕ Добавить в рацион</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }
  container.innerHTML = html;
}

function addMealPlanToRation(mealType, idx) {
  const plan = getDayMealPlan();
  const meal = plan[mealType][idx];
  todayMeals[mealType].push({
    name: meal.name,
    amount: 1, unit: "порция",
    protein: meal.protein, fat: meal.fat, carbs: meal.carbs
  });
  saveTodayMeals();
  // Визуальный фидбэк
  const btn = event.target;
  btn.textContent = "✅ Добавлено!";
  btn.style.background = "rgba(16,185,129,0.2)";
  btn.style.borderColor = "#10b981";
  btn.disabled = true;
}

document.addEventListener("DOMContentLoaded", () => {
  loadMainPageData();
  renderSidebarImages();
  renderCommandChips();
  const chatInput = document.getElementById("chatInput");
  if (chatInput) chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
  const dateInput = document.getElementById("mealDate");
  if (dateInput) dateInput.addEventListener("change", () => { loadTodayMeals(); });
});