const ExcelJS = require('exceljs');
const http = require('http');
const fs = require('fs');

const token = process.env.TEST_TOKEN;

if (!token) {
  console.error('TEST_TOKEN környezeti változó megadása kötelező az export teszthez.');
  process.exit(1);
}

async function testExport(path, filename, expectedRows) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000${path}&token=${encodeURIComponent(token)}`;

    http.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Export sikertelen: ${res.statusCode}`));
        return;
      }

      const writeStream = fs.createWriteStream(filename);
      res.pipe(writeStream);
      writeStream.on('finish', async () => {
        writeStream.close();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filename);
        const worksheet = workbook.getWorksheet('Napló');
        const rows = worksheet.rowCount - 2;
        console.log(`Tesztelve: ${url} -> Excel sorok: ${rows} | Elvárt: ${expectedRows}`);
        console.log(rows === expectedRows ? 'PASS' : 'FAIL');
        resolve();
      });
    }).on('error', reject);
  });
}

async function runTests() {
  await testExport('/api/export?type=month&month=2025-07', 'test_month.xlsx', 10);
  await testExport('/api/export?type=day&day=2025-07-03', 'test_day.xlsx', 3);
  await testExport('/api/export?type=interval&start=2025-07-08&end=2025-07-10', 'test_interval.xlsx', 10);
}

runTests().catch(err => {
  console.error(err.message);
  process.exit(1);
});
