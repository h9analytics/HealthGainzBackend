const fs = require('fs')

exports.key = fs.readFileSync('privkey.pem')
exports.cert = fs.readFileSync('fullchain.pem')
exports.allRoles = ['Administrator', 'ClinicManager', 'Therapist', 'StandInTherapist', 'Patient']
exports.staffRoles = ['Administrator', 'ClinicManager', 'Therapist', 'StandInTherapist']

exports.healthgainzConfig = {
    host: 'localhost',
    port: '5432',
    database: 'healthgainz',
    user: 'healthgainz',
    password: 'NlaFteSzo1'
}

exports.checkCredentials = async (request, roles, healthgainzClient) => {
	let values = request.headers.authorization.split(':')
	let result = await healthgainzClient.query('SELECT * FROM "user" WHERE emailaddress = $1 AND password = $2', values)
	if (result.rows.length == 0) throw new Error('Login is not valid')
	let userRoles = result.rows[0].roles
    let permitted = roles.some((item) => userRoles.includes(item))
	if (!permitted) throw new Error('Login does not have the required roles')
}

exports.handleError = (response, message) => {
    response.writeHead(409, {'Content-Type': 'text/plain'})
    response.end(message)
}
