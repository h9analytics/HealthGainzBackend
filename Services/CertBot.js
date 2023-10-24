// version 1

// This microservice relates to automatic server-certificate renewal. It is required for CertBot http authentication

const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', async (request, response) => {
    response.writeHead(200, {'Content-Type': 'text/html'})
	response.end('<!DOCTYPE html><html><head><title>Hello</title></head><body>Hello from HealthGainz</body></html>')
})

app.listen(80, () => {
    console.log('Microservice \'HealthGainz:CertBot\' running on port 80')
})

module.exports = app
