const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

const app = express();

app.get('/api/imagem', async (req, res) => {
    const { email, horario_disparo_email, titulo_email } = req.query;

    // 1. Enviar a imagem imediatamente (estabilidade para o e-mail)
    const imagePath = path.join(process.cwd(), 'public', 'img', 'pixel.png');
    
    if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.send(imageBuffer);
    } else {
        // Fallback: se a imagem sumir, envia um pixel transparente via código
        const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.send(pixel);
    }

    // 2. Gravar na Planilha em "segundo plano"
    try {
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        await sheet.addRow({
            'Email': email || 'N/A',
            'Horário Disparo': horario_disparo_email || 'N/A',
            'Data Abertura': new Date().toLocaleString('pt-BR', { timeZone: 'America/Porto_Velho' }),
            'Assunto': titulo_email || 'Sem Assunto'
        });

        console.log(`Sucesso: ${email}`);
    } catch (error) {
        console.error('Erro no Sheets:', error.message);
    }
});

// Rota padrão para evitar o erro "Cannot GET /"
app.get('/', (req, res) => {
    res.send('Tracker de Email Ativo 🚀');
});

module.exports = app;
