const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')
const https = require('https')

const { key, cert, allRoles, staffRoles, healthgainzConfig, checkCredentials, handleError } = require('./HealthGainzLibrary')

const patientSelectSQL = 'SELECT "user".name AS username, "user".address AS useraddress, patient.* FROM patient JOIN "user" ON patient.userid = "user".id'

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
        await checkCredentials(request, staffRoles, healthgainzClient)
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

app.post('/createPatient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO patient VALUES (DEFAULT, $1, $2, $3) RETURNING *', Object.values(request.body))
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

app.post('/updatePatient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        let result = await healthgainzClient.query('UPDATE patient SET userid = $2, staffmemberid = $3, dateofbirth = $4 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deletePatient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        await healthgainzClient.query('DELETE FROM patient WHERE id = $1', [request.query.id])
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

app.get('/getPatientById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        let result = await healthgainzClient.query(patientSelectSQL + ' WHERE patient.id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('Patient not found')
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

app.get('/getPatientsByStaffMember', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        let result = await healthgainzClient.query(patientSelectSQL + ' WHERE patient.staffmemberid = $1', [request.query.staffmemberid])
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

app.get('/getInitialPatientsByStaffMember', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        let result = await healthgainzClient.query(patientSelectSQL + ' WHERE patient.staffmemberid = $1 LIMIT 10', [request.query.staffmemberid])
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

app.get('/getPatientsByStaffMemberAndNameContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = patientSelectSQL + ' WHERE patient.staffmemberid = $1 AND "user".name ILIKE $2'
    doFilterQuery(sql, [query.staffmemberid, '%' + value + '%'], request, response)
})

app.get('/getPatientsByStaffMemberAndNameEmpty', (request, response) => {
    let sql = patientSelectSQL + ' WHERE patient.staffmemberid = $1 AND "user".name IS NULL'
    doFilterQuery(sql, [request.query.staffmemberid], request, response)
})

app.get('/getPatientsByStaffMemberAndNameNotEmpty', (request, response) => {
    let sql = patientSelectSQL + ' WHERE patient.staffmemberid = $1 AND "user".name IS NOT NULL'
    doFilterQuery(sql, [request.query.staffmemberid], request, response)
})

app.get('/getPatientsByStaffMemberAndAddressContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = patientSelectSQL + ' WHERE patient.staffmemberid = $1 AND "user".address ILIKE $2'
    doFilterQuery(sql, [query.staffmemberid, '%' + value + '%'], request, response)
})

app.get('/getPatientsByStaffMemberAndAddressEmpty', (request, response) => {
    let sql = patientSelectSQL + ' WHERE patient.staffmemberid = $1 AND "user".address IS NULL'
    doFilterQuery(sql, [request.query.staffmemberid], request, response)
})

app.get('/getPatientsByStaffMemberAndAddressNotEmpty', (request, response) => {
    let sql = patientSelectSQL + ' WHERE patient.staffmemberid = $1 AND "user".address IS NOT NULL'
    doFilterQuery(sql, [request.query.staffmemberid], request, response)
})

app.get('/getPatientByUser', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, allRoles, healthgainzClient)
        let result = await healthgainzClient.query(patientSelectSQL + ' WHERE patient.userid = $1', [request.query.userid])
        if (result.rows.length == 0) throw new Error('Patient not found')
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

let port = 3004
let httpsServer = https.createServer({key, cert}, app)
httpsServer.listen(port, () => {
    console.log('Microservice \'HealthGainz:Patients\' running on port ' + port)
})
