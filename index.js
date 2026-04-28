app.get('/api/imagem', async (req, res) => {
    const { email, horario_disparo_email, titulo_email } = req.query;

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
            'Data Abertura': new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            'Assunto': titulo_email || 'Sem Assunto'
        });

        console.log(`✅ Planilha atualizada: ${email}`);
    } catch (error) {
        console.error('❌ Erro no Sheets:', error.message);
    } finally {
        // Envia o pixel SOMENTE DEPOIS de tentar gravar (ou falhar)
        const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.send(pixel);
    }
});
