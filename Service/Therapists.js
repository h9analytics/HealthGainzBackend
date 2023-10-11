const { Client } = require('pg')
const types = require('pg').types
const express = require('express')

const healthgainzConfig = require('./HealthGainzConfig')

const therapistSelectSQL = 'SELECT "user".name, "user".address, therapist.* FROM therapist JOIN "user" ON therapist.userid = "user".id'

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
        await checkCredentials(request, ['Administrator'], healthgainzClient)
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

app.post('/createTherapist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO therapist VALUES (DEFAULT, $1, $2) RETURNING *', Object.values(request.body))
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

app.post('/updateTherapist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE therapist SET userid = $2, clinicid = $3 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deleteTherapist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM therapist WHERE id = $1', [request.query.id])
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

app.get('/getTherapistById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        let result = await healthgainzClient.query(therapistSelectSQL + ' WHERE therapist.id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('Therapist not found')
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

app.get('/getTherapistsByClinic', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        let result = await healthgainzClient.query(therapistSelectSQL + ' WHERE therapist.clinicid = $1', [request.query.clinicId])
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

app.get('/getTherapistsByClinicAndNameContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = therapistSelectSQL + ' WHERE therapist.clinicid = $1 AND "user".name ILIKE $2'
    doFilterQuery(sql, [query.clinicId, '%' + value + '%'], request, response)
})

app.get('/getTherapistsByClinicAndNameEmpty', (request, response) => {
    let sql = therapistSelectSQL + ' WHERE therapist.clinicid = $1 AND "user".name IS NULL'
    doFilterQuery(sql, [request.query.clinicId], request, response)
})

app.get('/getTherapistsByClinicAndNameNotEmpty', (request, response) => {
    let sql = therapistSelectSQL + ' WHERE therapist.clinicid = $1 AND "user".name IS NOT NULL'
    doFilterQuery(sql, [request.query.clinicId], request, response)
})

app.get('/getTherapistsByClinicAndAddressContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = therapistSelectSQL + ' WHERE therapist.clinicid = $1 AND "user".address ILIKE $2'
    doFilterQuery(sql, [query.clinicId, '%' + value + '%'], request, response)
})

app.get('/getTherapistsByClinicAndAddressEmpty', (request, response) => {
    let sql = therapistSelectSQL + ' WHERE therapist.clinicid = $1 AND "user".address IS NULL'
    doFilterQuery(sql, [request.query.clinicId], request, response)
})

app.get('/getTherapistsByClinicAndAddressNotEmpty', (request, response) => {
    let sql = therapistSelectSQL + ' WHERE therapist.clinicid = $1 AND "user".address IS NOT NULL'
    doFilterQuery(sql, [request.query.clinicId], request, response)
})

app.get('/getTherapistByUserId', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query(therapistSelectSQL + ' WHERE therapist.userid = $1', [request.query.userId])
        if (result.rows.length == 0) throw new Error('Therapist not found')
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

app.listen(3003, () => {
    console.log('Microservice \'HealthGainz:Therapists\' running on port 3003')
})

module.exports = app
