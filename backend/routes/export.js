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

  // fejléc
  sheet.mergeCells('A1:A2');
  sheet.mergeCells('B1:B2');
  sheet.mergeCells('C1:C2');
  sheet.mergeCells('D1:D2');
  sheet.mergeCells('E1:E2');
  sheet.mergeCells('F1:F2');
  sheet.mergeCells('G1:G2');
  sheet.mergeCells('H1:H2');

  sheet.getCell('A1').value = 'Óra';
  sheet.getCell('B1').value = 'Műszak';
  sheet.getCell('C1').value = 'Oktatás típusa';
  sheet.getCell('D1').value = 'Időtartam';
  sheet.getCell('E1').value = 'Oktató';
  sheet.getCell('F1').value = 'Téma';
  sheet.getCell('G1').value = 'Vázlat';
  sheet.getCell('H1').value = 'Kitöltötte';

  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'].forEach(cell => {
    sheet.getCell(cell).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(cell).font = { bold: true };
    sheet.getCell(cell).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' }
    };
    sheet.getCell(cell).border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  let rowIndex = 3;
  let currentDate = '';

  for (const row of rows) {
    if (row.date !== currentDate) {
      currentDate = row.date;
      sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
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
    excelRow.getCell(1).value = row.hour;
    excelRow.getCell(2).value = row.shift;
    excelRow.getCell(3).value = row.education_type;
    excelRow.getCell(4).value = row.duration;
    excelRow.getCell(5).value = row.instructor;
    excelRow.getCell(6).value = row.topic;
    excelRow.getCell(7).value = row.outline;
    excelRow.getCell(8).value = row.user;
    rowIndex++;
  }

  sheet.columns = [
    { width: 14 }, { width: 12 }, { width: 25 }, { width: 18 }, { width: 25 },
    { width: 20 }, { width: 40 }, { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=naplo_${filenameSuffix}.xlsx`);
  res.send(buffer);
});

module.exports = router;
