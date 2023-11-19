// version 1

const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')

const { healthgainzConfig, checkCredentials, handleError } = require('./HealthGainzLibrary')

const clinicSelectSQL = 'SELECT * FROM clinic'

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
app.use(cors())
app.use(express.json())

app.post('/createClinic', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO clinic VALUES (DEFAULT, $1, $2, $3, $4) RETURNING *', Object.values(request.body))
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

app.post('/updateClinic', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE clinic SET name = $2, address = $3, phonenumber = $4, emailaddress = $5 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deleteClinic', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM clinic WHERE id = $1', [request.query.id])
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

app.get('/getClinicById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        let result = await healthgainzClient.query(clinicSelectSQL + ' WHERE id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('Clinic not found')
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

app.get('/getClinics', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        let result = await healthgainzClient.query(clinicSelectSQL)
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

app.get('/getInitialClinics', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator'], healthgainzClient)
        let result = await healthgainzClient.query(clinicSelectSQL + ' LIMIT 10')
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

app.get('/getClinicsByNameContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = clinicSelectSQL + ' WHERE name ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getClinicsByNameEmpty', (request, response) => {
    let sql = clinicSelectSQL + ' WHERE name IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getClinicsByNameNotEmpty', (request, response) => {
    let sql = clinicSelectSQL + ' WHERE name IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getClinicsByAddressContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = clinicSelectSQL + ' WHERE address ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getClinicsByAddressEmpty', (request, response) => {
    let sql = clinicSelectSQL + ' WHERE address IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getClinicsByAddressNotEmpty', (request, response) => {
    let sql = clinicSelectSQL + ' WHERE address IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getClinicsByPhoneNumberContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = clinicSelectSQL + ' WHERE phonenumber ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getClinicsByPhoneNumberEmpty', (request, response) => {
    let sql = clinicSelectSQL + ' WHERE phonenumber IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getClinicsByPhoneNumberNotEmpty', (request, response) => {
    let sql = clinicSelectSQL + ' WHERE phonenumber IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getClinicsByEmailAddressContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = clinicSelectSQL + ' WHERE emailaddress ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getClinicsByEmailAddressEmpty', (request, response) => {
    let sql = clinicSelectSQL + ' WHERE emailaddress IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getClinicsByEmailAddressNotEmpty', (request, response) => {
    let sql = clinicSelectSQL + ' WHERE emailaddress IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.listen(3002, () => {
    console.log('Microservice \'HealthGainz:Clinics\' running on port 3002')
})

module.exports = app
