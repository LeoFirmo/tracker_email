const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();

// Rota para o pixel de rastreamento
app.get('/api/imagem', async (req, res) => {
    const { email, horario_disparo_email, titulo_email } = req.query;

    try {
        // Configuração da autenticação com Google
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        
        // Carrega as informações da planilha
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        // Adiciona a linha com os dados
        await sheet.addRow({
            'Email': email || 'N/A',
            'Horário Disparo': horario_disparo_email || 'N/A',
            'Data Abertura': new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            'Assunto': titulo_email || 'Sem Assunto'
        });

        console.log(`✅ Planilha atualizada: ${email}`);
    } catch (error) {
        // Isso vai mostrar o erro detalhado nos logs do Vercel
        console.error('❌ Erro completo:', error.response ? error.response.data : error);
    } finally {
        // Envia o pixel (imagem 1x1 transparente)
        const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).send(pixel);
    }
});

// Rota padrão para evitar erro 404 na raiz
app.get('/', (req, res) => {
    res.send('Tracker Online 🚀');
});

// EXPORTAÇÃO OBRIGATÓRIA PARA O VERCEL:
module.exports = app;
