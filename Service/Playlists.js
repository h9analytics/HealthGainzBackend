const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')
const https = require('https')

const { key, cert, allRoles, staffRoles, healthgainzConfig, checkCredentials, handleError } = require('./HealthGainzLibrary')

const playlistSelectSQL = 'SELECT * FROM playlist'

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

app.post('/createPlaylist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO playlist VALUES (DEFAULT, $1) RETURNING *', Object.values(request.body))
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

app.post('/updatePlaylist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        let result = await healthgainzClient.query('UPDATE playlist SET name = $2 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deletePlaylist', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        await healthgainzClient.query('DELETE FROM playlist WHERE id = $1', [request.query.id])
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

app.get('/getPlaylistById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, allRoles, healthgainzClient)
        let result = await healthgainzClient.query(playlistSelectSQL + ' WHERE id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('Playlist not found')
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

app.get('/getPlaylists', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, allRoles, healthgainzClient)
        let result = await healthgainzClient.query(playlistSelectSQL)
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

app.get('/getInitialPlaylists', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, allRoles, healthgainzClient)
        let result = await healthgainzClient.query(playlistSelectSQL + ' LIMIT 10')
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

app.get('/getPlaylistsByNameContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = playlistSelectSQL + ' WHERE name ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getPlaylistsByNameEmpty', (request, response) => {
    let sql = playlistSelectSQL + ' WHERE name IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getPlaylistsByNameNotEmpty', (request, response) => {
    let sql = playlistSelectSQL + ' WHERE name IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

let port = 3007
let httpsServer = https.createServer({key, cert}, app)
httpsServer.listen(port, () => {
    console.log('Microservice \'HealthGainz:Playlists\' running on port ' + port)
})
