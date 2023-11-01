import AMQPChannel from './AMQPChannel'
import AMQPClient from './AMQPClient'
import env from './env'

class QueueFactory {

    /** @private */
    amqpClient = new AMQPClient()
    
    /**
     * get AMQP channel for queue separated by type
     * @param {QueueFactory.Type} type
     * @returns {Promise<AMQPChannel>}
     */
    resolve(type) {
        if (!this.typeList.includes(type)) {
            return Promise.reject(new Error(`Type ${type} is not valid, avaiable types: ${this.typeList.join(', ')}`))
        }
        const amqpUrl = env(type)
        if (!amqpUrl) {
            return Promise.reject(new Error(`environment variable ${type} is not set`))
        }
        return this.amqpClient.getChannel(amqpUrl)
    }

    get typeList() {
        return Object.keys(QueueFactory.Type).map(value => QueueFactory.Type[value])
    }
}

/**
 * @enum {string}
 */
QueueFactory.Type = {
    LOG: 'AMQP_LOG_QUEUE_URL',
    FUNCTION: 'AMQP_FUNCTION_QUEUE_URL',
    OUTGOING: 'AMQP_OUTGOING_QUEUE_URL'
}

export default QueueFactory