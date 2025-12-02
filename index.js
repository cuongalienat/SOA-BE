import express from 'express'
import cors from 'cors'
import { env } from './src/config/environment.js'
import { corsOptions } from './src/config/cors.js'
import connectDB from './src/config/db.js'
import { APIs_v1 } from './src/routes/v1/index.js'
import { errorHandlingMiddleware } from './src/middlewares/errorHandlingMiddleware.js'
import { morganMiddleware } from './config/morgan.js';


const app = express()

// Morgan 
app.use(morganMiddleware);

app.use(express.json())
app.use(cors(corsOptions))
app.use('/v1', APIs_v1)
connectDB()

app.get('/', (req, res) => {
    res.status(200).json({ message: 'SOA Backend API' })
})

app.use(errorHandlingMiddleware);

app.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
    console.log(`Server is running on http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}`)
})
