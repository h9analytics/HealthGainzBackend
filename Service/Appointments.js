const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')
const https = require('https')

const { key, cert, allRoles, staffRoles, healthgainzConfig, checkCredentials, handleError } = require('./HealthGainzLibrary')

const appointmentSelectSQL = 'SELECT * FROM appointment'

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
        await checkCredentials(request, allRoles, healthgainzClient)
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
app.use(cors())
app.use(express.json())

app.post('/createAppointment', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
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
		await checkCredentials(request, staffRoles, healthgainzClient)
        let result = await healthgainzClient.query('UPDATE appointment SET patientid = $2, datetime = $3 WHERE id = $1 RETURNING *', Object.values(request.body))
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
		await checkCredentials(request, staffRoles, healthgainzClient)
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
		await checkCredentials(request, allRoles, healthgainzClient)
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

app.get('/getAppointmentsByPatient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, allRoles, healthgainzClient)
        let result = await healthgainzClient.query(appointmentSelectSQL + ' WHERE patientid = $1', [request.query.patientid])
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

app.get('/getInitialAppointmentsByPatient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, allRoles, healthgainzClient)
        let result = await healthgainzClient.query(appointmentSelectSQL + ' WHERE patientid = $1 LIMIT 10', [request.query.patientid])
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

app.get('/getAppointmentsByPatientAndDateTimeBefore', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = appointmentSelectSQL + ' WHERE patientid = $1 AND datetime < $2'
    doFilterQuery(sql, [query.patientid, value], request, response)
})

app.get('/getAppointmentsByPatientAndDateTimeEquals', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = appointmentSelectSQL + ' WHERE patientid = $1 AND datetime = $2'
    doFilterQuery(sql, [query.patientid, value], request, response)
})

app.get('/getAppointmentsByPatientAndDateTimeAfter', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = appointmentSelectSQL + ' WHERE patientid = $1 AND datetime > $2'
    doFilterQuery(sql, [query.patientid, value], request, response)
})

app.get('/getAppointmentsByPatientAndDateTimeBetween', (request, response) => {
    let query = request.query
    let value1 = query.value1
    let value2 = query.value2
    if (!value1 || !value2) { handleError(response, 'Two values required'); return }
    let sql = appointmentSelectSQL + ' WHERE patientid = $1 AND datetime BETWEEN $2 AND $3'
    doFilterQuery(sql, [query.patientid, value1, value2], request, response)
})

app.get('/getAppointmentsByPatientAndDateTimeEmpty', (request, response) => {
    let sql = appointmentSelectSQL + ' WHERE patientid = $1 AND datetime IS NULL'
    doFilterQuery(sql, [request.query.patientid], request, response)
})

app.get('/getAppointmentsByPatientAndDateTimeNotEmpty', (request, response) => {
    let sql = appointmentSelectSQL + ' WHERE patientid = $1 AND datetime IS NOT NULL'
    doFilterQuery(sql, [request.query.patientid], request, response)
})

let port = 3005
let httpsServer = https.createServer({key, cert}, app)
httpsServer.listen(port, () => {
    console.log('Microservice \'HealthGainz:Appointments\' running on port ' + port)
})
