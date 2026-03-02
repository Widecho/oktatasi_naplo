// backend/routes/export.js
const express = require('express');
const router = express.Router();
const db = require('../models/db');
const ExcelJS = require('exceljs');
const auth = require('../middleware/auth');

router.get('/export', auth, async (req, res) => {
  const { type, month, day, start, end, shift } = req.query;
  const userRole = req.user.role;
  const userShift = req.user.shift;

  let whereClauses = [];
  let queryParams = [];
  let filenameSuffix = 'export';

  if (type === 'month' && month) {
    whereClauses.push("strftime('%Y-%m', naplo_entries.date) = ?");
    queryParams.push(month);
    filenameSuffix = month;
  } else if (type === 'day' && day) {
    whereClauses.push("naplo_entries.date = ?");
    queryParams.push(day);
    filenameSuffix = day;
  } else if (type === 'interval' && start && end) {
    whereClauses.push("naplo_entries.date BETWEEN ? AND ?");
    queryParams.push(start, end);
    filenameSuffix = `${start}_to_${end}`;
  } else {
    // default to current month if no valid parameters provided
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    whereClauses.push("strftime('%Y-%m', naplo_entries.date) = ?");
    queryParams.push(currentMonth);
    filenameSuffix = currentMonth;
  }

  // Shift logic based on role
  if (userRole !== 'admin' && userShift) {
    // Users only see their shift
    whereClauses.push("naplo_entries.shift = ?");
    queryParams.push(userShift);
  } else if (userRole === 'admin' && shift && shift !== 'Összes') {
    // Admin selected a specific shift
    whereClauses.push("naplo_entries.shift = ?");
    queryParams.push(shift);
    filenameSuffix += `_muszak_${shift}`;
  }

  const finalWhereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const rows = await new Promise((resolve, reject) => {
    db.all(`
      SELECT
        naplo_entries.date,
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
      ${finalWhereClause}
      ORDER BY naplo_entries.date ASC, naplo_entries.hour_id ASC
    `, queryParams, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Napló', {
    properties: { tabColor: { argb: 'FFC0000' } }
  });

  let rowIndex;
  let cols = [];

  if (userRole === 'admin') {
    cols = [
      { header: 'Óra', width: 14 },
      { header: 'Műszak', width: 12 },
      { header: 'Oktatás típusa', width: 25 },
      { header: 'Időtartam', width: 18 },
      { header: 'Oktató', width: 25 },
      { header: 'Téma', width: 20 },
      { header: 'Vázlat', width: 40 },
      { header: 'Kitöltötte', width: 18 }
    ];

    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    letters.forEach((letter, index) => {
      sheet.mergeCells(`${letter}1:${letter}2`);
      sheet.getCell(`${letter}1`).value = cols[index].header;

      const cell = sheet.getCell(`${letter}1`);
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    rowIndex = 3;
  } else {
    cols = [
      { header: 'Óra', width: 14 },
      { header: 'Oktatás típusa', width: 25 },
      { header: 'Időtartam', width: 18 },
      { header: 'Oktató', width: 25 },
      { header: 'Téma', width: 20 },
      { header: 'Vázlat', width: 40 },
      { header: 'Kitöltötte', width: 18 }
    ];

    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${userShift}. műszak`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    titleCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    letters.forEach((letter, index) => {
      sheet.mergeCells(`${letter}2:${letter}3`);
      sheet.getCell(`${letter}2`).value = cols[index].header;

      const cell = sheet.getCell(`${letter}2`);
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    rowIndex = 4;
  }

  let currentDate = '';
  sheet.columns = cols.map(c => ({ width: c.width }));

  for (const row of rows) {
    if (row.date !== currentDate) {
      currentDate = row.date;
      const mergeEnd = userRole === 'admin' ? 'H' : 'G';
      sheet.mergeCells(`A${rowIndex}:${mergeEnd}${rowIndex}`);
      const dateCell = sheet.getCell(`A${rowIndex}`);
      dateCell.value = `${row.date}`;
      dateCell.font = { bold: true };
      dateCell.alignment = { horizontal: 'left' };
      dateCell.fill = {
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' }
      };
      rowIndex++;
    }
    const excelRow = sheet.getRow(rowIndex);

    if (userRole === 'admin') {
      excelRow.getCell(1).value = row.hour;
      excelRow.getCell(2).value = row.shift;
      excelRow.getCell(3).value = row.education_type;
      excelRow.getCell(4).value = row.duration;
      excelRow.getCell(5).value = row.instructor;
      excelRow.getCell(6).value = row.topic;
      excelRow.getCell(7).value = row.outline;
      excelRow.getCell(8).value = row.user;
    } else {
      excelRow.getCell(1).value = row.hour;
      excelRow.getCell(2).value = row.education_type;
      excelRow.getCell(3).value = row.duration;
      excelRow.getCell(4).value = row.instructor;
      excelRow.getCell(5).value = row.topic;
      excelRow.getCell(6).value = row.outline;
      excelRow.getCell(7).value = row.user;
    }
    rowIndex++;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=naplo_${filenameSuffix}.xlsx`);
  res.send(buffer);
});

module.exports = router;
