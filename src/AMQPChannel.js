import Logger from './Logger'
import AMQPMessage from './AMQPMessage'
import { Signal } from 'signals'

/**
 * @name amqpCallback
 * @param {AMQPMessage} message 
 */
const amqpCallback = function(message) {}

 /**
 * @author Daniel Kalevski
 * @class AMQPChannel
 */
 class AMQPChannel {
    

    onClose = new Signal()


    /** @private */
    logger = Logger.getLogger('AMQP Channel')
    /** @private */
    _context = null
    /** @private */
    _container = null
    /** @private */
    _connection = null
    /** @private */
    _subscribed = false
    /** @private */
    _unsubscribe = null
    /** @private */
    _address = null

    /**
     * @param {Context} context
     */
    constructor(context) {
        this._context = context
        this._container = context.container
        this._connection = context.connection
        
        let disconnected = (context) => {
            this._connection.close()
            this._container.off('disconnected', disconnected)
            this._container.off('connection_error', disconnected)
            this._container.off('error', disconnected)
            this.close(context.error)
            context.connection._disconnect()
        }
        this._container.on('disconnected', disconnected)
        this._container.on('connection_error', disconnected)
        this._container.on('error', disconnected)
    }

    get subscribed() {
        /**
         * @function amqpCallback
         * @param {AMQPMessage} message
         * @returns {undefined}
        */
        return this._subscribed
    }

    get address() {
        return this._address
    }

    /**
     * publish message to queue address
     * @param {string} address 
     * @param {*} data 
     */
    publish(address, data) {
        if (typeof data !== 'string') {
            data = JSON.stringify(data)
        }
        return new Promise((resolve, reject) => {
            let sender = this._context.connection.open_sender({
                target: {
                    address: address,
                    dynamic: false
                }
            })
            
            sender.once('sendable', () => {
                sender.on('accepted', accepted)
                sender.on('released', released)
                sender.on('rejected', rejected)
                sender.send({
                    body: {
                        content: Buffer.from(data)
                    }
                })
            })
            
            let accepted = (data) => answer(true, false, false, data)
            let released = (data) => answer(false, true, false, data)
            let rejected = (data) => answer(false, false, true, data)

            let answer = (isAccepted, isReleased, isRejected, data) => {
                sender.off('accepted', accepted)
                sender.off('released', released)
                sender.off('rejected', rejected)
                sender.close()
                if (isAccepted) resolve(data)
                if (isReleased) reject(new Error('The message was released by the receiver'))
                if (isRejected) reject(new Error('The message was rejected by the receiver'))
            }
            
        }).catch((error) => {
            if (!this._connection) {
                throw new Error('You must be connected to execute #publish')
            } else {
                throw new Error(error['message'])
            }
        })
    }

    /**
     * subscribe to address to receive messages
     * @param {string} address 
     * @param {amqpCallback} callback
     * @returns {Promise<undefined>}
     */
    subscribe(address, callback) {
        
        if (this.subscribed) {
            this.logger.warn(`This channel is already subscribed to: ${this._address}`)
            return
        }

        if (typeof callback !== 'function') {
            throw new Error('you need to provide callback to receive messages')
        }

        this.logger.debug(`Will try to open consumer on [${address}]`)
        
        return new Promise((resolve) => {
            let receiver = this._context.connection.open_receiver({
                source: {
                    address: address,
                    dynamic: false
                },
                autoaccept: false,
                autosettle: true,
                credit_window: 1
            })
    
            this._subscribed = true
            this._address = address
    
            let receiverOpen = () => {
                this.logger.silly(`receiver start listening on [${this._address}]`)
                this._unsubscribe = () => {
                    try {
                        this.logger.debug('receiver will close subscription to', this._address)
                        this._container.off('message', messageHandler)
                        this._container.off('receiver_open', receiverOpen)
                        receiver.close()
                        this._unsubscribe = null
                        this._subscribed = false
                        this._address = null
                    } catch (error) {
                        return Promise.reject(error)
                    }
                    return Promise.resolve()
                }
                resolve()
            }
            this._container.on('receiver_open', receiverOpen)
    
            let messageHandler = ({ delivery, message }) => {

                let content = Buffer.from(message.body.content).toString()
                let amqpMessage = new AMQPMessage(this, delivery, content)
                try {
                    callback(amqpMessage)
                } catch (error) {
                    this._unsubscribe()
                    this.close()
                    throw new Error(`'Error: something went wrong in provided callback \n ${error.stack}`)
                }
            }
    
            this._container.on('message', messageHandler)
        })
    }

    /**
     * @returns {Promise}
     */
    unsubscribe() {
        if (this.subscribed) {
            return this._unsubscribe()
        } else {
            this.logger.warn('must be subscribed to execute #unsubscribe')
            return Promise.reject()
        }
    }

    /**
     * close the connection
     * @param {Error} error 
     */
    close(error = null) {
        this._context.connection.close()
        this._context = null
        this._container = null
        this._connection = null

        this._subscribed = false
        this._unsubscribe = null
        this._address = null
        this.logger.silly('Channel closed the connection')
        this.onClose.dispatch(error)
    }
}

export default AMQPChannel