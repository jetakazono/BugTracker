require('dotenv/config');

const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const sgMail = require('@sendgrid/mail');
const GoogleSpreadsheet = require('google-spreadsheet');
const sendGridKey = process.env.SEND_GRID_KEY;
const credentials = require('./bugtracker.json');

//config
const docId = process.env.DOC_ID;
const worksheetIndex = 0;

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));
app.use("/assets", express.static(__dirname + '/assets'));


app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (request, response) => {
    response.render('home');
});

app.post('/', async (request, response) => {
    try {
        const doc = new GoogleSpreadsheet(docId)
        await promisify(doc.useServiceAccountAuth)(credentials)
        const info = await promisify(doc.getInfo)()
        const worksheet = info.worksheets[worksheetIndex]
        await promisify(worksheet.addRow)({
            name: request.body.name,
            email: request.body.email,
            issueType: request.body.issueType,
            howToReproduce: request.body.howToReproduce,
            expectedOutput: request.body.expectedOutput,
            receivedOutput: request.body.receivedOutput,
            userAgent: request.body.userAgent,
            userDate: request.body.userDate,
            source: request.query.source || 'direct'
        })
        //se for critico
        if (request.body.issueType === 'CRITICAL') {
            
            sgMail.setApiKey(sendGridKey);
            const msg = {
                to: 'jessica.takazono@gmail.com',
                from: 'jessica.takazono@gmail.com',
                subject: 'Bug crítico reportado',
                text: `O usuário ${request.body.name} reportou um problema  `,
                html: `O usuário ${request.body.name} reportou um problema  `
            };
            await sgMail.send(msg);
        }

        response.render('sucesso');
    } catch (err) {
        response.send('erro ao enviar formulário');
        console.log(err);
    }
})

app.listen(3000, (err) => {
    if (err) {
        console.log('aconteceu um erro', err);
    } else {
        console.log('bugtracker rodando na porta http://localhost:3000');
    }
});
