// version 1

const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')

const { healthgainzConfig, checkCredentials, handleError } = require('./HealthGainzLibrary')

const videoSelectSQL = 'SELECT * FROM video'

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
app.use(cors())
app.use(express.json())

app.post('/createVideo', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO video VALUES (DEFAULT, $1, $2, $3, $4) RETURNING *', Object.values(request.body))
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

app.post('/updateVideo', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE video SET clientid = $2, title = $3, datetimecreated = $4, url = $5 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deleteVideo', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM video WHERE id = $1', [request.query.id])
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

app.get('/getVideoById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query('SELECT * FROM video WHERE id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('Video not found')
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

app.get('/getVideosByClient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query(videoSelectSQL + ' WHERE clientid = $1', [request.query.clientid])
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

app.get('/getVideosByClientAndTitleContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND title ILIKE $2'
    doFilterQuery(sql, [query.clientid, '%' + value + '%'], request, response)
})

app.get('/getVideosByClientAndTitleEmpty', (request, response) => {
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND title IS NULL'
    doFilterQuery(sql, [request.query.clientid], request, response)
})

app.get('/getVideosByClientAndTitleNotEmpty', (request, response) => {
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND title IS NOT NULL'
    doFilterQuery(sql, [request.query.clientid], request, response)
})

app.get('/getVideosByClientAndDateTimeCreatedBefore', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND datetimecreated < $2'
    doFilterQuery(sql, [query.clientid, value], request, response)
})

app.get('/getVideosByClientAndDateTimeCreatedEquals', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND datetimecreated = $2'
    doFilterQuery(sql, [query.clientid, value], request, response)
})

app.get('/getVideosByClientAndDateTimeCreatedAfter', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND datetimecreated > $2'
    doFilterQuery(sql, [query.clientid, value], request, response)
})

app.get('/getVideosByClientAndDateTimeCreatedBetween', (request, response) => {
    let query = request.query
    let value1 = query.value1
    let value2 = query.value2
    if (!value1 || !value2) { handleError(response, 'Two values required'); return }
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND datetimecreated BETWEEN $2 AND $3'
    doFilterQuery(sql, [query.clientid, value1, value2], request, response)
})

app.get('/getVideosByClientAndDateTimeCreatedEmpty', (request, response) => {
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND datetimecreated IS NULL'
    doFilterQuery(sql, [request.query.clientid], request, response)
})

app.get('/getVideosByClientAndDateTimeCreatedNotEmpty', (request, response) => {
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND datetimecreated IS NOT NULL'
    doFilterQuery(sql, [request.query.clientid], request, response)
})

app.get('/getVideosByClientAndURLContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND url ILIKE $2'
    doFilterQuery(sql, [query.clientid, '%' + value + '%'], request, response)
})

app.get('/getVideosByClientAndURLEmpty', (request, response) => {
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND url IS NULL'
    doFilterQuery(sql, [request.query.clientid], request, response)
})

app.get('/getVideosByClientAndURLNotEmpty', (request, response) => {
    let sql = videoSelectSQL + ' WHERE clientid = $1 AND url IS NOT NULL'
    doFilterQuery(sql, [request.query.clientid], request, response)
})

app.listen(3010, () => {
    console.log('Microservice \'HealthGainz:Videos\' running on port 3010')
})

module.exports = app
