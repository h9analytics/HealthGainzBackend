const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')
const https = require('https')

const { key, cert, staffRoles, healthgainzConfig, checkCredentials, handleError } = require('./HealthGainzLibrary')

const staffMembersByClinicSQL = 'SELECT "user".name AS username, "user".address AS useraddress, staffmember.* FROM staffmember JOIN "user" ON staffmember.userid = "user".id'
const staffMembersByUserSQL = 'SELECT clinic.name AS clinicname, clinic.address AS clinicaddress, staffmember.* FROM staffmember JOIN clinic ON staffmember.clinicid = clinic.id'

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
        await checkCredentials(request, ['Administrator', 'ClinicManager', 'StandInTherapist'], healthgainzClient)
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

app.post('/createStaffMember', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'ClinicManager'], healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO staffmember VALUES (DEFAULT, $1, $2) RETURNING *', Object.values(request.body))
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

app.post('/updateStaffMember', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'ClinicManager'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE staffmember SET userid = $2, clinicid = $3 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deleteStaffMember', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'ClinicManager'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM staffmember WHERE id = $1', [request.query.id])
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

app.get('/getStaffMemberById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'ClinicManager', 'StandInTherapist'], healthgainzClient)
        let result = await healthgainzClient.query('SELECT * FROM staffmember WHERE id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('StaffMember not found')
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

app.get('/getStaffMembersByClinic', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'ClinicManager', 'StandInTherapist'], healthgainzClient)
        let result = await healthgainzClient.query(staffMembersByClinicSQL + ' WHERE staffmember.clinicid = $1', [request.query.clinicid])
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

app.get('/getStaffMembersByUser', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'ClinicManager', 'StandInTherapist'], healthgainzClient)
        let result = await healthgainzClient.query(staffMembersByUserSQL + ' WHERE staffmember.userid = $1', [request.query.userid])
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

app.get('/getInitialStaffMembersByClinic', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'ClinicManager', 'StandInTherapist'], healthgainzClient)
        let result = await healthgainzClient.query(staffMembersByClinicSQL + ' WHERE staffmember.clinicid = $1 LIMIT 10', [request.query.clinicid])
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

app.get('/getStaffMembersByClinicAndUserNameContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = staffMembersByClinicSQL + ' WHERE staffmember.clinicid = $1 AND "user".name ILIKE $2'
    doFilterQuery(sql, [query.clinicid, '%' + value + '%'], request, response)
})

app.get('/getStaffMembersByClinicAndUserNameEmpty', (request, response) => {
    let sql = staffMembersByClinicSQL + ' WHERE staffmember.clinicid = $1 AND "user".name IS NULL'
    doFilterQuery(sql, [request.query.clinicid], request, response)
})

app.get('/getStaffMembersByClinicAndUserNameNotEmpty', (request, response) => {
    let sql = staffMembersByClinicSQL + ' WHERE staffmember.clinicid = $1 AND "user".name IS NOT NULL'
    doFilterQuery(sql, [request.query.clinicid], request, response)
})

app.get('/getStaffMembersByClinicAndUserAddressContains', (request, response) => {
    let query = request.query
    let value = query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = staffMembersByClinicSQL + ' WHERE staffmember.clinicid = $1 AND "user".address ILIKE $2'
    doFilterQuery(sql, [query.clinicid, '%' + value + '%'], request, response)
})

app.get('/getStaffMembersByClinicAndUserAddressEmpty', (request, response) => {
    let sql = staffMembersByClinicSQL + ' WHERE staffmember.clinicid = $1 AND "user".address IS NULL'
    doFilterQuery(sql, [request.query.clinicid], request, response)
})

app.get('/getStaffMembersByClinicAndUserAddressNotEmpty', (request, response) => {
    let sql = staffMembersByClinicSQL + ' WHERE staffmember.clinicid = $1 AND "user".address IS NOT NULL'
    doFilterQuery(sql, [request.query.clinicid], request, response)
})

app.get('/getStaffMemberByUser', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        let result = await healthgainzClient.query(staffMembersByClinicSQL + ' WHERE staffmember.userid = $1', [request.query.userid])
        if (result.rows.length == 0) throw new Error('StaffMember not found')
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

let port = 3003
let httpsServer = https.createServer({key, cert}, app)
httpsServer.listen(port, () => {
    console.log('Microservice \'HealthGainz:StaffMembers\' running on port ' + port)
})
