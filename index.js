const express = require('express');
const path = require('path');
const moment = require('moment-timezone');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();
const port = process.env.PORT || 3000;
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

// Configuração da Planilha via Variáveis de Ambiente
const SPREADSHEET_ID = '1IW-eO3ZX-l1NQoU0edo8AKe0hcgjR8DXl_m-dY3y2fs';

async function registrarAbertura(dados) {
    try {
        const auth = new JWT({
            email: 'googlesheetsintegration@bold-script-494715-p2.iam.gserviceaccount.com',
            // A chave privada deve estar na variável de ambiente da Vercel
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        // Adiciona a linha com os cabeçalhos exatos da sua imagem
        await sheet.addRow({
            'Email': dados.email,
            'Horário Disparo': dados.horario_disparo,
            'Data Abertura': dados.data_abertura,
            'Assunto': dados.assunto
        });
        console.log(`Planilha atualizada: ${dados.email}`);
    } catch (err) {
        console.error('Erro ao salvar no Sheets:', err.message);
    }
}

app.get('/api/imagem', async (req, res) => {
    const { email, horario_disparo_email, titulo_email } = req.query;

    if (!email) {
        return res.status(400).send('Parâmetro "email" é obrigatório.');
    }

    // Formata a data de abertura
    const agora = moment().tz(SAO_PAULO_TIMEZONE).format('DD/MM/YYYY HH:mm:ss');

    // Prepara os dados para a planilha
    const dadosParaPlanilha = {
        email: email,
        horario_disparo: horario_disparo_email || 'Não informado',
        data_abertura: agora,
        assunto: titulo_email || 'Sem título'
    };

    // Executa em segundo plano para não travar o envio da imagem
    registrarAbertura(dadosParaPlanilha);

    // Envia o Pixel Fantasma
    const imagePath = path.join(__dirname, 'img', 'pixelone.png');
    res.sendFile(imagePath, (err) => {
        if (err) res.status(500).send('Erro ao carregar imagem.');
    });
});

app.listen(port, () => console.log(`Rodando na porta ${port}`));