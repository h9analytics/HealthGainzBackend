const { Client } = require('pg')
const types = require('pg').types
const express = require('express')

const healthgainzConfig = require('./HealthGainzConfig')

const userSelectSQL = 'SELECT * FROM "user"'

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
        await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
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

app.post('/createUser', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
		let result = await healthgainzClient.query('INSERT INTO "user" VALUES (DEFAULT, $1, $2, $3, $4, $5, $6) RETURNING *', Object.values(request.body))
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

app.post('/updateUser', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE "user" SET name = $2, address = $3, phonenumber = $4, emailaddress = $5, password = $6, roles = $7 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deleteUser', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM "user" WHERE id = $1', [request.query.id])
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

app.get('/getUserById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query(userSelectSQL + ' WHERE id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('User not found')
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

app.get('/getUsers', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query(userSelectSQL)
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

app.get('/getUsersByNameContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = userSelectSQL + ' WHERE name ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getUsersByNameEmpty', (request, response) => {
    let sql = userSelectSQL + ' WHERE name IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getUsersByNameNotEmpty', (request, response) => {
    let sql = userSelectSQL + ' WHERE name IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getUsersByAddressContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = userSelectSQL + ' WHERE address ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getUsersByAddressEmpty', (request, response) => {
    let sql = userSelectSQL + ' WHERE address IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getUsersByAddressNotEmpty', (request, response) => {
    let sql = userSelectSQL + ' WHERE address IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getUsersByPhoneNumberContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = userSelectSQL + ' WHERE phonenumber ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getUsersByPhoneNumberEmpty', (request, response) => {
    let sql = userSelectSQL + ' WHERE phonenumber IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getUsersByPhoneNumberNotEmpty', (request, response) => {
    let sql = userSelectSQL + ' WHERE phonenumber IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getUsersByEmailAddressContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = userSelectSQL + ' WHERE emailaddress ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getUsersByEmailAddressEmpty', (request, response) => {
    let sql = userSelectSQL + ' WHERE emailaddress IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getUsersByEmailAddressNotEmpty', (request, response) => {
    let sql = userSelectSQL + ' WHERE emailaddress IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.post('/getUserByEmailAddressAndPassword', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
        let result = await healthgainzClient.query(userSelectSQL + ' WHERE emailaddress = $1 AND password = $2', Object.values(request.body))
        if (result.rows.length == 0) throw new Error('User not found')
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

app.listen(3001, () => {
    console.log('Microservice \'HealthGainz:UserList\' running on port 3001')
})

module.exports = app
