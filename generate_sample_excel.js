const XLSX = require('./rankingdbv-backend/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const data = [
    { Titulo: 'Reunião de Teste 1', Data: '20/12/2025', Tipo: 'REGULAR', Pontos: 10 },
    { Titulo: 'Campori Online', Data: '25/12/2025', Tipo: 'EVENTO', Pontos: 50 },
    { Titulo: 'Classe Bíblica', Data: '26/12/2025', Tipo: 'CLASSE', Pontos: 5 }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Meetings');

const filePath = path.join(__dirname, 'sample_meetings.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`File created at: ${filePath}`);
