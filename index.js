const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');

export default async function handler(req, res) {
    const { email, horario_disparo_email, titulo_email } = req.query;

    // 1. Prioridade Total: Enviar a imagem imediatamente para o e-mail não travar
    const imagePath = path.join(process.cwd(), 'public', 'img', 'pixel.png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(imagePath);

    // 2. Processamento em "segundo plano" para a planilha
    try {
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            // Correção crucial para o formato da chave na Vercel
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        
        // Carrega apenas o necessário para ganhar tempo
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        await sheet.addRow({
            'Email': email || 'N/A',
            'Horário Disparo': horario_disparo_email || 'N/A',
            'Data Abertura': new Date().toLocaleString('pt-BR', { timeZone: 'America/Porto_Velho' }),
            'Assunto': titulo_email || 'Sem Assunto'
        });

        console.log(`Planilha atualizada para: ${email}`);
    } catch (error) {
        // Loga o erro mas não interrompe a entrega da imagem
        console.error('Erro ao salvar no Sheets:', error.message);
    }
}
