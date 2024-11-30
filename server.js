const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Путь к папке с данными
const dataFolder = path.join(__dirname, 'data');

// Убедимся, что папка для хранения данных существует, если нет — создаём
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder);
}

// Пути к файлам данных
const filePaths = {
  polly: path.join(dataFolder, 'inventory_polly.json'),
  polikarpova: path.join(dataFolder, 'inventory_polikarpova.json'),
  total: path.join(dataFolder, 'inventory_total.json'),
  pallets: path.join(dataFolder, 'pallets.json')
};

// Маршрут для очистки всех данных
app.post('/clear-data', (req, res) => {
  // Заменяем данные на пустые массивы
  saveDataToFile(filePaths.polly, []);
  saveDataToFile(filePaths.polikarpova, []);
  saveDataToFile(filePaths.total, []);

  res.json({ status: 'success', message: 'Все данные успешно очищены.' });
});

// Вспомогательная функция для чтения данных из файла, если файл не существует, возвращает пустой массив/объект
const readDataFromFile = (filePath, defaultValue = []) => {
  if (!fs.existsSync(filePath)) {
    saveDataToFile(filePath, defaultValue);  // Создаём файл, если его нет
    return defaultValue;
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(rawData);
  } catch (err) {
    console.error(`Ошибка парсинга данных из файла: ${filePath}`, err);
    return defaultValue;
  }
};

// Вспомогательная функция для записи данных в файл
const saveDataToFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// Маршрут для получения только данных из файла total
app.get('/get-total', (req, res) => {
  const totalData = readDataFromFile(filePaths.total);
  res.json(totalData);  // Отправляем данные из файла inventory_total.json
});

// Маршрут для получения данных о паллетах
app.get('/get-pallets', (req, res) => {
  const palletsData = readDataFromFile(filePaths.pallets, { occupiedPallets: 0 });
  res.json(palletsData);
});

// Маршрут для обновления данных о паллетах
app.post('/update-pallets', (req, res) => {
  const { occupiedPallets } = req.body;
  if (typeof occupiedPallets !== 'number') {
    return res.status(400).json({ status: 'error', message: 'Некорректные данные.' });
  }

  const palletsData = { occupiedPallets };
  saveDataToFile(filePaths.pallets, palletsData);
  res.json({ status: 'success', message: 'Данные о паллетах успешно обновлены.' });
});

// Маршрут для получения данных с сервера
app.get('/get-data', (req, res) => {
  const pollyData = readDataFromFile(filePaths.polly);
  const polikarpovaData = readDataFromFile(filePaths.polikarpova);
  const totalData = readDataFromFile(filePaths.total);

  res.json({ pollyData, polikarpovaData, totalData });
});

// Маршрут для сохранения данных на сервер
app.post('/save-data', (req, res) => {
  const { polikarpovaData, pollyData, totalData } = req.body;

  if (polikarpovaData) saveDataToFile(filePaths.polikarpova, polikarpovaData);
  if (pollyData) saveDataToFile(filePaths.polly, pollyData);
  if (totalData) saveDataToFile(filePaths.total, totalData);

  res.json({ status: 'success', message: 'Данные успешно сохранены.' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер работает на http://localhost:${port}`);
});