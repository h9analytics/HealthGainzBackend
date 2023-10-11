// Version 1

const { Client } = require('pg')
const types = require('pg').types
const express = require('express')

const healthgainzConfig = require('./HealthGainzConfig')

const appointmentSelectSQL = 'SELECT * FROM appointment'

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

const handleError = (response, message) => {
    response.writeHead(409, {'Content-Type': 'text/plain'})
    response.end(message)
}

const checkCredentials = async (request, roles, healthgainzClient) => {
	let values = request.headers.authorization.split(':')
	let result = await healthgainzClient.query('SELECT * FROM "user" WHERE emailaddress = $1 AND password = $2', values)
	if (result.rows.length == 0) throw new Error('Login is not valid')
	let userRoles = result.rows[0].roles
    let permitted = roles.some((item) => userRoles.includes(item))
	if (!permitted) throw new Error('Login does not have the required roles')
}

const doFilterQuery = async (sql, values, request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
        await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
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

app.post('/createAppointment', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO appointment VALUES (DEFAULT, $1, $2) RETURNING *', Object.values(request.body))
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

app.post('/updateAppointment', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE appointment SET clientid = $2, datetime = $3 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deleteAppointment', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM appointment WHERE id = $1', [request.query.id])
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

app.get('/getAppointmentById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query(appointmentSelectSQL + ' WHERE id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('Appointment not found')
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

app.get('/getAppointmentsByClient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query(appointmentSelectSQL + ' WHERE clientid = $1', [request.query.clientId])
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

app.get('/getAppointmentsByClientAndDateTimeBefore', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = appointmentSelectSQL + ' WHERE clientid = $1 AND datetime < $2'
    doFilterQuery(sql, [query.clientId, value], request, response)
})

app.get('/getAppointmentsByClientAndDateTimeEquals', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = appointmentSelectSQL + ' WHERE clientid = $1 AND datetime = $2'
    doFilterQuery(sql, [query.clientId, value], request, response)
})

app.get('/getAppointmentsByClientAndDateTimeAfter', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = appointmentSelectSQL + ' WHERE clientid = $1 AND datetime > $2'
    doFilterQuery(sql, [query.clientId, value], request, response)
})

app.get('/getAppointmentsByClientAndDateTimeBetween', (request, response) => {
    let query = request.query
    let value1 = query.value1
    let value2 = query.value2
    if (!value1 || !value2) { handleError(response, 'Two values required'); return }
    let sql = appointmentSelectSQL + ' WHERE clientid = $1 AND datetime BETWEEN $2 AND $3'
    doFilterQuery(sql, [query.clientId, value1, value2], request, response)
})

app.get('/getAppointmentsByClientAndDateTimeEmpty', (request, response) => {
    let sql = appointmentSelectSQL + ' WHERE clientid = $1 AND datetime IS NULL'
    doFilterQuery(sql, [request.query.clientId], request, response)
})

app.get('/getAppointmentsByClientAndDateTimeNotEmpty', (request, response) => {
    let sql = appointmentSelectSQL + ' WHERE clientid = $1 AND datetime IS NOT NULL'
    doFilterQuery(sql, [request.query.clientId], request, response)
})

app.listen(3005, () => {
    console.log('Microservice \'HealthGainz:Appointments\' running on port 3005')
})

module.exports = app
