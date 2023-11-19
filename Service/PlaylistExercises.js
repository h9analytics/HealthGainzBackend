// version 1

const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')

const { healthgainzConfig, checkCredentials, handleError } = require('./HealthGainzLibrary')

const playlistExerciseSelectSQL = 'SELECT exercise.name AS exercisename, exercise.description AS exercisedescription, playlistexercise.* FROM playlistexercise JOIN exercise ON playlistexercise.exerciseid = exercise.id'

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
        await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist', 'Patient'], healthgainzClient)
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

app.post('/createPlaylistExercise', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist'], healthgainzClient)
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
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist'], healthgainzClient)
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
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist'], healthgainzClient)
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
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist', 'Patient'], healthgainzClient)
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
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist', 'Patient'], healthgainzClient)
        let result = await healthgainzClient.query(playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1', [request.query.playlistid])
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

app.get('/getInitialPlaylistExercisesByPlaylist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist', 'Patient'], healthgainzClient)
        let result = await healthgainzClient.query(playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 LIMIT 10', [request.query.playlistid])
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
    doFilterQuery(sql, [query.playlistid, '%' + value + '%'], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndNameEmpty', (request, response) => {
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.name IS NULL'
    doFilterQuery(sql, [request.query.playlistid], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndNameNotEmpty', (request, response) => {
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.name IS NOT NULL'
    doFilterQuery(sql, [request.query.playlistid], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndDescriptionContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.description ILIKE $2'
    doFilterQuery(sql, [query.playlistid, '%' + value + '%'], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndDescriptionEmpty', (request, response) => {
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.description IS NULL'
    doFilterQuery(sql, [request.query.playlistid], request, response)
})

app.get('/getPlaylistExercisesByPlaylistAndDescriptionNotEmpty', (request, response) => {
    let sql = playlistExerciseSelectSQL + ' WHERE playlistexercise.playlistid = $1 AND exercise.description IS NOT NULL'
    doFilterQuery(sql, [request.query.playlistid], request, response)
})

app.listen(3008, () => {
    console.log('Microservice \'HealthGainz:PlaylistExercises\' running on port 3008')
})

module.exports = app
