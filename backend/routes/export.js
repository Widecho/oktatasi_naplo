const express = require('express');
const router = express.Router();
const db = require('../models/db');
const ExcelJS = require('exceljs');
const auth = require('../middleware/auth');

const ALL_SHIFTS_LABEL = 'Összes';

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function addHeaderCell(sheet, cellRef, value) {
  const cell = sheet.getCell(cellRef);
  cell.value = value;
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.font = { bold: true };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
}

function buildDateFilter(query) {
  const { type, month, day, start, end } = query;

  if (type === 'month' && month) {
    return {
      where: "strftime('%Y-%m', naplo_entries.date) = ?",
      params: [month],
      suffix: month
    };
  }

  if (type === 'day' && day) {
    return {
      where: 'naplo_entries.date = ?',
      params: [day],
      suffix: day
    };
  }

  if (type === 'interval' && start && end) {
    return {
      where: 'naplo_entries.date BETWEEN ? AND ?',
      params: [start, end],
      suffix: `${start}_to_${end}`
    };
  }

  const date = new Date();
  const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return {
    where: "strftime('%Y-%m', naplo_entries.date) = ?",
    params: [currentMonth],
    suffix: currentMonth
  };
}

function buildColumns(isAdmin) {
  const baseColumns = [
    { header: 'Óra', width: 14, value: row => row.hour },
    { header: 'Oktatás típusa', width: 25, value: row => row.education_type },
    { header: 'Időtartam', width: 18, value: row => row.duration },
    { header: 'Oktató', width: 25, value: row => row.instructor },
    { header: 'Téma', width: 20, value: row => row.topic },
    { header: 'Vázlat', width: 40, value: row => row.outline },
    { header: 'Kitöltötte', width: 18, value: row => row.user }
  ];

  if (!isAdmin) return baseColumns;

  return [
    baseColumns[0],
    { header: 'Műszak', width: 12, value: row => row.shift },
    ...baseColumns.slice(1)
  ];
}

router.get('/export', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filters = buildDateFilter(req.query);
  const whereClauses = [filters.where];
  const queryParams = [...filters.params];
  let filenameSuffix = filters.suffix;

  if (!isAdmin) {
    whereClauses.push('naplo_entries.shift = ?');
    queryParams.push(req.user.shift);
  } else if (req.query.shift && req.query.shift !== ALL_SHIFTS_LABEL) {
    whereClauses.push('naplo_entries.shift = ?');
    queryParams.push(req.query.shift);
    filenameSuffix += `_muszak_${req.query.shift}`;
  }

  try {
    const rows = await all(`
      SELECT naplo_entries.date,
             naplo_entries.shift,
             hours.name AS hour,
             et.name AS education_type,
             durations.value AS duration,
             instructors.name AS instructor,
             topics.name AS topic,
             outlines.content AS outline,
             users.username AS user
      FROM naplo_entries
      JOIN hours ON naplo_entries.hour_id = hours.id
      JOIN durations ON naplo_entries.duration_id = durations.id
      JOIN instructors ON naplo_entries.instructor_id = instructors.id
      JOIN topics ON naplo_entries.topic_id = topics.id
      JOIN outlines ON naplo_entries.outline_id = outlines.id
      JOIN users ON naplo_entries.user_id = users.id
      JOIN education_types et ON naplo_entries.education_type_id = et.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY naplo_entries.date ASC, naplo_entries.hour_id ASC
    `, queryParams);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Napló', {
      properties: { tabColor: { argb: 'FFC0000' } }
    });

    const columns = buildColumns(isAdmin);
    sheet.columns = columns.map(column => ({ width: column.width }));

    let rowIndex = isAdmin ? 3 : 4;
    const columnLetters = columns.map((_, index) => sheet.getColumn(index + 1).letter);

    if (!isAdmin) {
      const lastColumn = columnLetters[columnLetters.length - 1];
      sheet.mergeCells(`A1:${lastColumn}1`);
      const titleCell = sheet.getCell('A1');
      titleCell.value = `${req.user.shift}. műszak`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      titleCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    const headerStartRow = isAdmin ? 1 : 2;
    const headerEndRow = isAdmin ? 2 : 3;
    columnLetters.forEach((letter, index) => {
      sheet.mergeCells(`${letter}${headerStartRow}:${letter}${headerEndRow}`);
      addHeaderCell(sheet, `${letter}${headerStartRow}`, columns[index].header);
    });

    let currentDate = '';
    for (const row of rows) {
      if (row.date !== currentDate) {
        currentDate = row.date;
        const lastColumn = columnLetters[columnLetters.length - 1];
        sheet.mergeCells(`A${rowIndex}:${lastColumn}${rowIndex}`);
        const dateCell = sheet.getCell(`A${rowIndex}`);
        dateCell.value = row.date;
        dateCell.font = { bold: true };
        dateCell.alignment = { horizontal: 'left' };
        dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        rowIndex++;
      }

      const excelRow = sheet.getRow(rowIndex);
      columns.forEach((column, index) => {
        excelRow.getCell(index + 1).value = column.value(row);
      });
      rowIndex++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=naplo_${filenameSuffix}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Hiba az export készítésekor.', details: err.message });
  }
});

module.exports = router;
