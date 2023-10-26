// version 1

const { Client } = require('pg')
const types = require('pg').types
const express = require('express')
const cors = require('cors')

const { healthgainzConfig, checkCredentials, handleError } = require('./HealthGainzLibrary')

const exerciseSelectSQL = 'SELECT * FROM exercise'

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

app.post('/createExercise', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query('INSERT INTO exercise VALUES (DEFAULT, $1, $2, $3, $4, $5, $6) RETURNING *', Object.values(request.body))
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

app.post('/updateExercise', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        let result = await healthgainzClient.query('UPDATE exercise SET name = $2, description = $3, sets = $4, reps = $5, hold = $6, videourl = $7 WHERE id = $1 RETURNING *', Object.values(request.body))
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

app.get('/deleteExercise', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist'], healthgainzClient)
        await healthgainzClient.query('DELETE FROM exercise WHERE id = $1', [request.query.id])
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

app.get('/getExerciseById', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query(exerciseSelectSQL + ' WHERE id = $1', [request.query.id])
        if (result.rows.length == 0) throw new Error('Exercise not found')
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

app.get('/getExercises', async (request, response) => {
    let healthgainzClient = new Client(healthgainzConfig)
    try {
        await healthgainzClient.connect()
		await checkCredentials(request, ['Administrator', 'Therapist', 'Client'], healthgainzClient)
        let result = await healthgainzClient.query(exerciseSelectSQL)
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

app.get('/getExercisesByNameContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE name ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getExercisesByNameEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE name IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesByNameNotEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE name IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesByDescriptionContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE description ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getExercisesByDescriptionEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE description IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesByDescriptionNotEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE description IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesBySetsLessThan', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE sets < $1'
    doFilterQuery(sql, [value], request, response)
})

app.get('/getExercisesBySetsEquals', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE sets = $1'
    doFilterQuery(sql, [value], request, response)
})

app.get('/getExercisesBySetsGreaterThan', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE sets > $1'
    doFilterQuery(sql, [value], request, response)
})

app.get('/getExercisesBySetsBetween', (request, response) => {
    let query = request.query
    let value1 = query.value1
    let value2 = query.value2
    if (!value1 || !value2) { handleError(response, 'Two values required'); return }
    let sql = exerciseSelectSQL + ' WHERE sets BETWEEN $1 AND $2'
    doFilterQuery(sql, [value1, value2], request, response)
})

app.get('/getExercisesBySetsEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE sets IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesBySetsNotEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE sets IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesByRepsLessThan', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE reps < $1'
    doFilterQuery(sql, [value], request, response)
})

app.get('/getExercisesByRepsEquals', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE reps = $1'
    doFilterQuery(sql, [value], request, response)
})

app.get('/getExercisesByRepsGreaterThan', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE reps > $1'
    doFilterQuery(sql, [value], request, response)
})

app.get('/getExercisesByRepsBetween', (request, response) => {
    let query = request.query
    let value1 = query.value1
    let value2 = query.value2
    if (!value1 || !value2) { handleError(response, 'Two values required'); return }
    let sql = exerciseSelectSQL + ' WHERE reps BETWEEN $1 AND $2'
    doFilterQuery(sql, [value1, value2], request, response)
})

app.get('/getExercisesByRepsEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE reps IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesByRepsNotEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE reps IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesByHoldLessThan', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE hold < $1'
    doFilterQuery(sql, [value], request, response)
})

app.get('/getExercisesByHoldEquals', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE hold = $1'
    doFilterQuery(sql, [value], request, response)
})

app.get('/getExercisesByHoldGreaterThan', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE hold > $1'
    doFilterQuery(sql, [value], request, response)
})

app.get('/getExercisesByHoldBetween', (request, response) => {
    let query = request.query
    let value1 = query.value1
    let value2 = query.value2
    if (!value1 || !value2) { handleError(response, 'Two values required'); return }
    let sql = exerciseSelectSQL + ' WHERE hold BETWEEN $1 AND $2'
    doFilterQuery(sql, [value1, value2], request, response)
})

app.get('/getExercisesByHoldEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE hold IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesByHoldNotEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE hold IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesByVideoURLContains', (request, response) => {
    let value = request.query.value
    if (!value) { handleError(response, 'Value required'); return }
    let sql = exerciseSelectSQL + ' WHERE videourl ILIKE $1'
    doFilterQuery(sql, ['%' + value + '%'], request, response)
})

app.get('/getExercisesByVideoURLEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE videourl IS NULL'
    doFilterQuery(sql, [], request, response)
})

app.get('/getExercisesByVideoURLNotEmpty', (request, response) => {
    let sql = exerciseSelectSQL + ' WHERE videourl IS NOT NULL'
    doFilterQuery(sql, [], request, response)
})

app.listen(3006, () => {
    console.log('Microservice \'HealthGainz:Exercises\' running on port 3006')
})

module.exports = app
