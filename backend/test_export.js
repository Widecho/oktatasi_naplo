const ExcelJS = require('exceljs');
const http = require('http');
const fs = require('fs');

async function testExport(url, filename, expectedRows) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            const path = filename;
            const writeStream = fs.createWriteStream(path);
            res.pipe(writeStream);
            writeStream.on('finish', async () => {
                writeStream.close();
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.readFile(path);
                const worksheet = workbook.getWorksheet('Napló');
                const rows = worksheet.rowCount - 2; // header rows
                console.log(`Tested ${url} -> Rows in excel: ${rows} | Expected: ${expectedRows}`);
                if (rows === expectedRows) {
                    console.log('✅ PASS');
                } else {
                    console.log('❌ FAIL');
                }
                resolve();
            });
        });
    });
}

async function runTests() {
    await testExport('http://localhost:3000/api/export?type=month&month=2025-07', 'test_month.xlsx', 10);
    await testExport('http://localhost:3000/api/export?type=day&day=2025-07-03', 'test_day.xlsx', 3);
    await testExport('http://localhost:3000/api/export?type=interval&start=2025-07-08&end=2025-07-10', 'test_interval.xlsx', 10);
}
runTests();
