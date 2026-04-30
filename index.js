const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();

// Rota para o pixel de rastreamento
app.get('/api/imagem', async (req, res) => {
    const { email, horario_disparo_email, titulo_email } = req.query;
    
    // Pixel transparente 1x1 (PNG)
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

    // --- LÓGICA ANTI-BOT / ANÁLISE RÁPIDA ---
    const agora = Date.now(); // Timestamp atual (ms)
    const momentoDisparo = Number(horario_disparo_email); // Espera um timestamp na URL
    const diferencaSegundos = (agora - momentoDisparo) / 1000;

    // Se o acesso for feito em menos de 30 segundos após o disparo, 
    // apenas entregamos o pixel e encerramos a execução aqui (sem gravar no Sheets).
    if (!isNaN(momentoDisparo) && diferencaSegundos < 30) {
        console.log(`🤖 Bot detectado ou abertura muito rápida (${diferencaSegundos.toFixed(1)}s): ${email}`);
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return res.status(200).send(pixel);
    }
    // ----------------------------------------

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

        // Formatamos o horário de disparo (vinda do timestamp) para algo legível na planilha
        const disparoLegivel = !isNaN(momentoDisparo) 
            ? new Date(momentoDisparo).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            : 'N/A';

        // Adiciona a linha com os dados
        await sheet.addRow({
            'Email': email || 'N/A',
            'Horário Disparo': disparoLegivel,
            'Data Abertura': new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            'Assunto': titulo_email || 'Sem Assunto'
        });

        console.log(`✅ Abertura real registrada: ${email} (após ${diferencaSegundos.toFixed(1)}s)`);

    } catch (error) {
        // Log detalhado para depuração no painel da Vercel
        console.error('❌ Erro no Sheets:', error.response ? error.response.data : error);
    } finally {
        // Garante que o pixel será enviado se o código chegar até aqui (fluxo normal ou erro)
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.status(200).send(pixel);
        }
    }
});

// Rota padrão para evitar erro 404 na raiz
app.get('/', (req, res) => {
    res.send('Tracker Online 🚀');
});

// EXPORTAÇÃO OBRIGATÓRIA PARA O VERCEL:
module.exports = app;
