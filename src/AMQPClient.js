import { create_container } from 'rhea'
import Logger from './Logger'
import AMQPChannel from './AMQPChannel'

/**
 * @author Daniel Kalevski
 * @class AMQPClient
 */
class AMQPClient {

    /** @private */
    logger = Logger.getLogger('AMQP Client')

    reconnect = {
        interval: 1000,
        limit: 5
    }

    /**
     * get connection and channel from amqp url
     * @param {string} amqpUrl
     * @returns {Promise<AMQPChannel>}
     */
    getChannel(amqpUrl) {
        let failed = false
        return new Promise((resolve, reject) => {
            let options = this.tokenizeUrl(amqpUrl)
            let container = create_container()
            container.sasl_server_mechanisms.enable_anonymous()
            container.options.username = options.username
            container.options.password = options.password
            let connectOptions = {
                host: options.host,
                port: options.port || undefined,
                reconnect: this.reconnect.interval,
                initial_reconnect_delay: this.reconnect.interval,
                max_reconnect_delay: this.reconnect.interval * 2,
                reconnect_limit: this.reconnect.limit
            }

            let tempReconnectLimit = this.reconnect.limit
            container.connect(connectOptions)
            let disconnected = ({ error, connection }) => {
                
                if (tempReconnectLimit === 0) {
                    
                    container.off('disconnected', disconnected)
                    this.logger.debug('[disconnected] debug the AMQP client using env [DEBUG=rhea*]')
                    connection._disconnect()
                    if (error) {
                        reject(new Error(error['message']))
                    } else {
                        reject(new Error('Unhandled exception'))
                    }
                    failed = true
                } else {
                    tempReconnectLimit--
                }
            }

            let connectionError = ({ error, connection }) => {
                if (tempReconnectLimit === 0) {
                    container.off('connection_error', connectionError)
                    this.logger.debug('[error] debug the AMQP client using env [DEBUG=rhea*]')
                    connection._disconnect()
                    reject(new Error(error['message']))
                    failed = true
                }
            }

            let errorListener = (error) => {
                this.logger.error(`Something went wrong while trying to establish the connection :: ${error.message}`)
                process.exit(1)
            }
            let connectionOpen = (context) => {
                
                container.off('connection_open', connectionOpen)
                container.off('connection_error', connectionError)
                container.off('disconnected', disconnected)
                
                setTimeout(() => {
                    if (context.connection.is_open()) {
                        if (failed) {
                            context.connection.close()
                            return
                        }
                        this.logger.verbose('Connection with AMQP server sucessfully established', `[${amqpUrl}]`)
                        resolve(new AMQPChannel(context))
                    } else {
                        this.logger.warn('Connection details:', options, 'URL:', amqpUrl)
                        this.logger.debug('[open] debug the AMQP client using env [DEBUG=rhea*]')
                        context.connection._disconnect()
                        reject(new Error('Unhandled exception'))
                    }
                }, 1000)
            }
            container.on('connection_open' ,connectionOpen)
            container.on('disconnected', disconnected)
            container.on('connection_error', connectionError)
            container.on('error', errorListener)
        })
    }

    /**
     * test connection
     * @param {string} amqpUrl
     * @returns {Promise<boolean>}
     */
    test(amqpUrl) {
        return this.getChannel(amqpUrl).then((channel) => {
            return channel.close()
        }).then(() => true).catch(() => false)
    }

    /**
     * build AMQP url from parameters
     * @param {string} hostname 
     * @param {number} port 
     * @param {string} username 
     * @param {string} password 
     * @param {object} options 
     * @returns {string} url
     */
    buildUrl(hostname = null, port = null, username = null, password = null, options = {}) {
        let vhost = options['vhost'] ? options['vhost'] : null

        let url = 'amqp://'
        if (username || password) {
            url += `${username}:${password}@`
        }
        url += hostname
        if (port) {
            url += `:${port}`
        }
        if (vhost) {
            url += `/${vhost}`
        }
        return url
    }

    /**
     * Tokenize amqpUrl
     * @param {string} amqpUrl 
     * @returns {Object | Error} { username, password, host, port, secure }
     */
    tokenizeUrl(amqpUrl) {
        let tokenized = {
            secure: false,
            username: undefined,
            password: undefined,
            host: undefined,
            port: undefined
        }
    
        if (typeof amqpUrl !== 'string') {
            throw Error('must be a string')
        }
    
        
        let clean = null
        if (amqpUrl.split('amqp://').length === 2 && amqpUrl.split('amqp://')[0] === '') {
            clean = amqpUrl.split('amqp://')
        } else if (amqpUrl.split('amqps://').length === 2 && amqpUrl.split('amqps://')[0] === '') {
            clean = amqpUrl.split('amqps://')
            tokenized.secure = true
        } else {
            throw Error('Invalid AMQP connection url')
        }
    
        clean = clean[1]
        let separated = clean.split('@')
        let hostinfo = null
        let user = null
        if (separated.length === 1) hostinfo = separated[0].split(':') 
        else if (separated.length === 2) {
            user = separated[0].split(":")
            hostinfo = separated[1].split(":")
        }    
        else throw Error('Invalid')
        
        tokenized.host = hostinfo[0]
        if (typeof hostinfo[1] !== 'undefined') {
            tokenized.port = parseInt(hostinfo[1], 10)
        }
        if (user) {
            try {
                tokenized.username = user[0]
                tokenized.password = user[1]
            } catch(e) {
                throw Error('Invalid')
            }
        }
    
        return tokenized
    }
}
export default AMQPClient