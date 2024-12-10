const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dataFolder = path.join(__dirname, 'data');
const excelDataFolder = path.join(__dirname, 'ExcelData');

// Убедимся, что папки существуют
const ensureFolderExistence = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
};

ensureFolderExistence(dataFolder);
ensureFolderExistence(excelDataFolder);

// Пути к файлам данных
const filePaths = {
  polly: path.join(dataFolder, 'inventory_polly.json'),
  polikarpova: path.join(dataFolder, 'inventory_polikarpova.json'),
  total: path.join(dataFolder, 'inventory_total.json'),
  pallets: path.join(dataFolder, 'pallets.json')
};

// Вспомогательные функции для чтения и записи данных в файлы
const readDataFromFile = (filePath, defaultValue = []) => {
  if (!fs.existsSync(filePath)) {
    saveDataToFile(filePath, defaultValue);
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return defaultValue;
  }
};

const saveDataToFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// Сохранение и получение данных
app.post('/save-data', (req, res) => {
  try {
    const data = req.body;
    const filePath = path.join(dataFolder, 'inventory_total.json');
    saveDataToFile(filePath, data);
    res.status(200).json({ status: 'success', message: 'Данные успешно сохранены.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Ошибка при сохранении данных.' });
  }
});

app.get('/get-total', (req, res) => {
  const totalData = readDataFromFile(filePaths.total, []);
  res.json({ status: 'success', data: totalData });
});

// Очистка данных
app.post('/clear-data', (req, res) => {
  try {
    Object.values(filePaths).forEach(filePath => saveDataToFile(filePath, []));
    res.status(200).json({ status: 'success', message: 'Данные успешно очищены.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Ошибка при очистке данных.' });
  }
});


// Функция для создания Excel файла 
const createExcelFile = (data, fileName) => {
  const headers = [
    "Наименование товара",
    "Общее количество",
    "Полные коробки",
    "Оставшиеся единицы",
    "Полные поддоны",
    "Оставшиеся коробки",
    "Поддоны для товара"
  ];

  // Форматируем данные для таблицы
  const formattedData = data.map(item => [
    item.itemName,
    item.totalUnits,
    item.fullBoxes,
    item.remainingUnits,
    item.fullPallets,
    item.remainingBoxes,
    item.palletsForItem
  ]);

  const sheetData = [headers, ...formattedData];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Задаем стили для выравнивания содержимого по центру
  const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } };

  // Применяем стиль ко всем ячейкам (как заголовкам, так и данным)
  const range = XLSX.utils.decode_range(ws['!ref']); // Получаем диапазон ячеек
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = { r: row, c: col };
      const cell = ws[XLSX.utils.encode_cell(cellAddress)];
      if (cell) {
        cell.s = centerStyle; // Применяем стиль
      }
    }
  }

  // Задаем ширину столбцов (если нужно)
  ws['!cols'] = [
    { wpx: 650 }, // Ширина для "Наименование товара"
    { wpx: 120 }, // Ширина для "Общее количество"
    { wpx: 120 }, // Ширина для "Полные коробки"
    { wpx: 120 }, // Ширина для "Оставшиеся единицы"
    { wpx: 120 }, // Ширина для "Полные поддоны"
    { wpx: 120 }, // Ширина для "Оставшиеся коробки"
    { wpx: 120 }  // Ширина для "Поддоны для товара"
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Данные');

  // Путь к файлу
  const filePath = path.join(excelDataFolder, `${fileName}.xlsx`);

  // Создаем Excel файл
  XLSX.writeFile(wb, filePath);
};
// Эндпоинт для создания Excel файла
app.post('/create-excel', (req, res) => {
  const data = req.body; // Пример данных из запроса
  const fileName = 'inventory_report'; // Имя файла

  try {
    createExcelFile(data, fileName);
    res.status(200).json({ status: 'success', message: 'Excel файл успешно создан.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Ошибка при создании Excel файла.' });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер работает на http://localhost:${port}`);
});
