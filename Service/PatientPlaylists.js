// version 2

const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')

const { healthgainzConfig, checkCredentials, handleError } = require('./HealthGainzLibrary')

const patientPlaylistSelectSQL = 'SELECT playlist.name AS playlistname, patientplaylist.* FROM patientplaylist JOIN playlist ON patientplaylist.playlistid = playlist.id'

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

app.post('/createPatientPlaylist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist'], healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO patientplaylist VALUES (DEFAULT, $1, $2) RETURNING *', Object.values(request.body))
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

app.post('/updatePatientPlaylist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE patientplaylist SET patientid = $2, playlistid = $3 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deletePatientPlaylist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM patientplaylist WHERE id = $1', [request.query.id])
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

app.get('/getPatientPlaylistById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist', 'Patient'], healthgainzClient)
        let result = await healthgainzClient.query(patientPlaylistSelectSQL + ' WHERE patientplaylist.id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('PatientPlaylist not found')
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

app.get('/getPatientPlaylistsByPatient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist', 'Patient'], healthgainzClient)
        let result = await healthgainzClient.query(patientPlaylistSelectSQL + ' WHERE patientplaylist.patientid = $1', [request.query.patientid])
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

app.get('/getInitialPatientPlaylistsByPatient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'StandInTherapist', 'Patient'], healthgainzClient)
        let result = await healthgainzClient.query(patientPlaylistSelectSQL + ' WHERE patientplaylist.patientid = $1 LIMIT 10', [request.query.patientid])
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

app.get('/getPatientPlaylistsByPatientAndNameContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = patientPlaylistSelectSQL + ' WHERE patientplaylist.patientid = $1 AND playlist.name ILIKE $2'
    doFilterQuery(sql, [query.patientid, '%' + value + '%'], request, response)
})

app.get('/getPatientPlaylistsByPatientAndNameEmpty', (request, response) => {
    let sql = patientPlaylistSelectSQL + ' WHERE patientplaylist.patientid = $1 AND playlist.name IS NULL'
    doFilterQuery(sql, [request.query.patientid], request, response)
})

app.get('/getPatientPlaylistsByPatientAndNameNotEmpty', (request, response) => {
    let sql = patientPlaylistSelectSQL + ' WHERE patientplaylist.patientid = $1 AND playlist.name IS NOT NULL'
    doFilterQuery(sql, [request.query.patientid], request, response)
})

app.listen(3009, () => {
    console.log('Microservice \'HealthGainz:PatientPlaylists\' running on port 3009')
})

module.exports = app
