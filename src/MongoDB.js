import Logger from './Logger'
import env from './env'
import { MongoClient, ObjectID, Collection, MongoClientOptions } from 'mongodb'

class MongoDB {

    /** @private */
    logger = Logger.getLogger('Mongo Client')
    
    /** @private */
    database = null

    /** @type {MongoClient} */
    client = null
    
    /**
     * @param {MongoClientOptions} options 
     */
    constructor(options, url, databaseName) {
        

        if (url === null) {
            url = env('MONGODB_URL') || 'mongodb://localhost:27017'
        }
        
        if (databaseName === null) {
            databaseName = env('MONGODB_DATABASE') || 'default'
        }

        this.logger.debug(`trying to establish the connection to mongodb database using URI: ${url} & database name: ${databaseName}`)

        MongoClient.connect(url, options, (error, client) => {
            if (error) {
                this.logger.warn('MongoDB server unavailable at this moment!', error)
            } else {
                this.logger.info(`MongoDB connection established using ${url}!`)
                this.client = client
                this.database = client.db(databaseName)
            }
        })
    }

    /**
     * 
     * @param {string} collection
     * @returns {Collection<any>} collection
     */
    get(collection) {
        return this.database.collection(collection)
    }
}


let defaultOptions = { 
    useUnifiedTopology: true,
    connectTimeoutMS: 6000,
    socketTimeoutMS: 6000,
    serverSelectionTimeoutMS: 6000,
    useNewUrlParser: true
}

/** 
 * @type {MongoDB}
 * @private
 */
let instance = null

/**
 * 
 * @param {MongoClientOptions} options optional
 * @param {string} url
 * @param {string} databaseName
 */
MongoDB.initialize = (options = null, url = null, databaseName = null) => {
    if (options === null) {
        options = defaultOptions
    }
    instance = new MongoDB(options, url, databaseName)
}

/**
 * @returns {MongoDB}
 */
MongoDB.getConnection = () => {
    if (instance === null) {
        throw new Error('MongoDB is not initialized, invoke static initialize [MongoDB.initialize()]')
    }
    return instance
}

/**
 * @type {ObjectID}
 */
MongoDB.ID = ObjectID

export default MongoDB