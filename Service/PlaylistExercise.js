const { Client } = require('pg')
const types = require('pg').types
const express = require('express')

const healthgainzConfig = require('./HealthGainzConfig')

const playlistExerciseSelectSQL = 'SELECT exercise.name, exercise.description, playlistexercise.* FROM playlistexercise JOIN exercise ON playlistexercise.exerciseid = exercise.id'

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

app.post('/createPlaylistExercise', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO playlistexercise VALUES (DEFAULT, $1, $2) RETURNING *', Object.values(request.body))
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

app.post('/updatePlaylistExercise', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE playlistexercise SET playlistid = $2, exerciseid = $3 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deletePlaylistExercise', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM playlistexercise WHERE id = $1', [request.query.id])
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

app.get('/getPlaylistExerciseById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query(playlistExerciseSelectSQL + ' WHERE playlistexercise.id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('PlaylistExercise not found')
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

app.get('/getPlaylistExercisesByPlaylist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query(playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1', [request.query.playlistId])
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

app.get('/getPlaylistExercisesByPlaylistAndNameContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.name ILIKE $2'
    doFilterQuery(sql, [query.playlistId, '%' + value + '%'], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndNameEmpty', (request, response) => {
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.name IS NULL'
    doFilterQuery(sql, [request.query.playlistId], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndNameNotEmpty', (request, response) => {
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.name IS NOT NULL'
    doFilterQuery(sql, [request.query.playlistId], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndDescriptionContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.description ILIKE $2'
    doFilterQuery(sql, [query.playlistId, '%' + value + '%'], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndDescriptionEmpty', (request, response) => {
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.description IS NULL'
    doFilterQuery(sql, [request.query.playlistId], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndDescriptionNotEmpty', (request, response) => {
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.description IS NOT NULL'
    doFilterQuery(sql, [request.query.playlistId], request, response)
})

app.listen(3008, () => {
    console.log('Microservice \'HealthGainz:PlaylistExerciseList\' running on port 3008')
})

module.exports = app
