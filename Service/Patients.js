const https = require('https')
const fs = require('fs')

const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')
const nodemailer = require('nodemailer')

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

const getWelcomeHTML = (user) => {
    return '<div>' +
        '    <div id="header" style="background-color:Navy;">' +
        '        <h3 style="color:White;padding:1em;">Subject: Thanks for registering with Health Gainz</h3>' +
        '    </div>' +
        '    <div id="content" style="padding:1em;">' +
        '        <p>Hi ' + user.name + '</p>' +
        '        <p>Thank you for creating your account with Health Gainz.</p>' +
        '        <p>To get started, please download the app from the App Store or Google Play.</p>' +
        '        <p>Your account details are as follows:</p>' +
        '        <p>Email address: ' + user.emailaddress + '<br>Password: ' + user.password + '</p>' +
        '        <p>If you have any questions regarding your account, please send us an email to support@healthgainz.com and we\'ll be happy to help.</p><br>' +
        '        <p>Claire McMullen<br>Health Gainz</p><br>' +
        '    </div>' +
        '    <div id="footer" style="background-color:Orange;">' +
        '        <h3 style="padding:1em;">Team Health Gainz</h3>' +
        '    </div>' +
        '</div>'
}

const sendWelcomeEmail = async (user) => {
    let transporter = nodemailer.createTransport({
        host: 'mail.healthgainz.com',
        port: 465,
        auth: {
            user: 'no-reply@healthgainz.com',
            pass: 'Hello.2050'
        },
        secure: true
    })
    await transporter.sendMail({
        from: 'no-reply@healthgainz.com',
        to: user.emailaddress,
        subject: 'Welcome To Health Gainz',
        html: getWelcomeHTML(user)
    })
}

const app = express()
app.use(cors())
app.use(express.json())

app.post('/createPatient', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, staffRoles, healthgainzClient)
        await healthgainzClient.query('BEGIN')
        await healthgainzClient.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')
        let result = await healthgainzClient.query('INSERT INTO patient VALUES (DEFAULT, $1, $2, $3) RETURNING *', Object.values(request.body))
		let userId = result.rows[0].userid
        let userResult = await healthgainzClient.query('SELECT * FROM "user" WHERE id = $1', [userId])
        let users = userResult.rows
        if (users.length == 0) throw new Error('User not found')
        await sendWelcomeEmail(users[0])
        await healthgainzClient.query('COMMIT')
        response.writeHead(200, {'Content-Type': 'application/json'})
        response.end(JSON.stringify(result.rows[0]))
    }
    catch (error) {
        await healthgainzClient.query('ROLLBACK')
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
