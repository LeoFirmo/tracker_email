const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();

app.get('/api/imagem', async (req, res) => {
    // Adicionamos o 'link_clicado' nos parâmetros recebidos
    const { email, horario_disparo_email, titulo_email, link_clicado } = req.query;
    
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const agora = Date.now();
    const momentoDisparo = Number(horario_disparo_email);
    const diferencaSegundos = (agora - momentoDisparo) / 1000;

    // --- LÓGICA ANTI-BOT PARA ABERTURAS (PIXEL) ---
    // Só aplicamos a trava de 30s se NÃO for um clique no link. 
    // Se a pessoa clicar no botão muito rápido, queremos registrar o interesse de compra.
    if (!link_clicado && !isNaN(momentoDisparo) && diferencaSegundos < 30) {
        console.log(`🤖 Bot detectado na abertura (${diferencaSegundos.toFixed(1)}s): ${email}`);
        res.setHeader('Content-Type', 'image/png');
        return res.status(200).send(pixel);
    }

    try {
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        const disparoLegivel = !isNaN(momentoDisparo) 
            ? new Date(momentoDisparo).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            : 'N/A';

        // Adiciona a linha com a nova coluna 'Link clicado'
        await sheet.addRow({
            'Email': email || 'N/A',
            'Horário Disparo': disparoLegivel,
            'Data Abertura': new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            'Assunto': titulo_email || 'Sem Assunto',
            'Link clicado': link_clicado || '' // Se for clique, preenche. Se for abertura, fica vazio.
        });

        if (link_clicado) {
            console.log(`💰 CLIQUE NO LINK: ${email} -> ${link_clicado}`);
        } else {
            console.log(`✅ Abertura real registrada: ${email}`);
        }

    } catch (error) {
        console.error('❌ Erro no Sheets:', error.response ? error.response.data : error);
    } finally {
        // Se for um clique no link, redirecionamos o usuário
        if (link_clicado) {
            return res.redirect(link_clicado);
        }

        // Se for apenas o pixel de abertura, enviamos a imagem
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.status(200).send(pixel);
        }
    }
});

app.get('/', (req, res) => {
    res.send('Tracker Online 🚀');
});

module.exports = app;
