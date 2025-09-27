import express from 'express'
import { env } from './src/config/environment.js'
import connectDB from './src/config/db.js'
import { APIs } from './src/routes/index.js'

const app = express()
app.use(express.json())
app.use('/', APIs)
connectDB()

app.get('/', (req, res) => {
    res.status(200).json({ message: 'SOA Backend API' })
})
app.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
    console.log(`Server is running on http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}`)
})
