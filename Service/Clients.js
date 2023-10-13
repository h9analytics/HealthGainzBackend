// version 1

const { Client } = require('pg')
const types = require('pg').types
const express = require('express')

const { healthgainzConfig, checkCredentials, handleError } = require('./HealthGainz')

const clientSelectSQL = 'SELECT "user".name, "user".address, client.* FROM client JOIN "user" ON client.userid = "user".id'

// the following type parsers are required for returning correct JSON

types.setTypeParser(types.builtins.INT8, (value) => {
	return value == null ? null : parseInt(value)
})

types.setTypeParser(types.builtins.NUMERIC, (value) => {
	return value == null ? null : parseFloat(value)
})

types.setTypeParser(types.builtins.INT4, (value) => {
	return value == null ? null : parseInt(value)
})

types.setTypeParser(types.builtins.DATE, (value) => {
	return value == null ? null : value.substring(0, 10)
})

const doFilterQuery = async (sql, values, request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
        await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = values.length ? await healthgainzClient.query(sql, values) : await healthgainzClient.query(sql)
        response.writeHead(200, {'Content-Type': 'application/json'})
        response.end(JSON.stringify(result.rows))
    }
    catch (error) {
        handleError(response, error.message)
    }
    finally {
        await healthgainzClient.end()
    }
}

const app = express()
app.use(express.json())

// Enable CORS for all methods
app.use(function (request, response, next) {
    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Headers', '*')
    next()
})

app.post('/createClient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO client VALUES (DEFAULT, $1, $2, $3) RETURNING *', Object.values(request.body))
		response.writeHead(200, {'Content-Type': 'application/json'})
        response.end(JSON.stringify(result.rows[0]))
    }
    catch (error) {
        handleError(response, error.message)
    }
    finally {
        await healthgainzClient.end()
    }
})

app.post('/updateClient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE client SET userid = $2, therapistid = $3, dateofbirth = $4 WHERE id = $1 RETURNING *', Object.values(request.body))
		response.writeHead(200, {'Content-Type': 'application/json'})
        response.end(JSON.stringify(result.rows[0]))
    }
    catch (error) {
        handleError(response, error.message)
    }
    finally {
        await healthgainzClient.end()
    }
})

app.get('/deleteClient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM client WHERE id = $1', [request.query.id])
        response.writeHead(200)
        response.end()
    }
    catch (error) {
        handleError(response, error.message)
    }
    finally {
        await healthgainzClient.end()
    }
})

app.get('/getClientById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query(clientSelectSQL + ' WHERE client.id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('Client not found')
		else {
			response.writeHead(200, {'Content-Type': 'application/json'})
			response.end(JSON.stringify(result.rows[0]))
		}
    }
    catch (error) {
        handleError(response, error.message)
    }
    finally {
        await healthgainzClient.end()
    }
})

app.get('/getClientsByTherapist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query(clientSelectSQL + ' WHERE client.therapistid = $1', [request.query.therapistid])
        response.writeHead(200, {'Content-Type': 'application/json'})
        response.end(JSON.stringify(result.rows))
    }
    catch (error) {
        handleError(response, error.message)
    }
    finally {
        await healthgainzClient.end()
    }
})

app.get('/getClientsByTherapistAndNameContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = clientSelectSQL + ' WHERE client.therapistid = $1 AND name ILIKE $2'
    doFilterQuery(sql, [query.therapistid, '%' + value + '%'], request, response)
})

app.get('/getClientsByTherapistAndNameEmpty', (request, response) => {
    let sql = clientSelectSQL + ' WHERE client.therapistid = $1 AND "user".name IS NULL'
    doFilterQuery(sql, [request.query.therapistid], request, response)
})

app.get('/getClientsByTherapistAndNameNotEmpty', (request, response) => {
    let sql = clientSelectSQL + ' WHERE client.therapistid = $1 AND "user".name IS NOT NULL'
    doFilterQuery(sql, [request.query.therapistid], request, response)
})

app.get('/getClientsByTherapistAndAddressContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = clientSelectSQL + ' WHERE client.therapistid = $1 AND "user".address ILIKE $2'
    doFilterQuery(sql, [query.therapistid, '%' + value + '%'], request, response)
})

app.get('/getClientsByTherapistAndAddressEmpty', (request, response) => {
    let sql = clientSelectSQL + ' WHERE client.therapistid = $1 AND "user".address IS NULL'
    doFilterQuery(sql, [request.query.therapistid], request, response)
})

app.get('/getClientsByTherapistAndAddressNotEmpty', (request, response) => {
    let sql = clientSelectSQL + ' WHERE client.therapistid = $1 AND "user".address IS NOT NULL'
    doFilterQuery(sql, [request.query.therapistid], request, response)
})

app.get('/getClientByUser', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query(clientSelectSQL + ' WHERE client.userid = $1', [request.query.userid])
        if (result.rows.length == 0) throw new Error('Client not found')
		else {
			response.writeHead(200, {'Content-Type': 'application/json'})
			response.end(JSON.stringify(result.rows[0]))
		}
    }
    catch (error) {
        handleError(response, error.message)
    }
    finally {
        await healthgainzClient.end()
    }
})

app.listen(3004, () => {
    console.log('Microservice \'HealthGainz:Clients\' running on port 3004')
})

module.exports = app
