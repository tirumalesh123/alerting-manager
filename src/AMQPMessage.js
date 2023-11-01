import AMQPChannel from './AMQPChannel'

/**
 * @author Daniel Kalevski
 * @class AMQPMessage
 * Abstraction over received AMQP messages
 */
class AMQPMessage {

    /** @private */
    _content = null
    /** @private */
    _json = false
    /** @private */
    _address = null
    /** @private */
    _delivery = null
    /** @private */
    _handled = false

    /**
     * 
     * @param {AMQPChannel} channel 
     * @param {Object} delivery 
     * @param {string} content 
     */
    constructor(channel, delivery, content) {
        this._delivery = delivery
        this._address = channel.address
        try {
            this._content = JSON.parse(content)
            this._json = true
        } catch (err) {
            this._content = content
            this._json = false
        }
    }

    get content() {
        return this._content
    }

    get address() {
        return this._address
    }

    get isJson() {
        return this._json
    }

    get isHandled() {
        return this._handled
    }

    /**
     * send acknowledgements signal to queue service for this message
     */
    ack() {
        if (!this.isHandled) {
            this._delivery.accept()
            this._handled = true
        } else {
            throw new Error('this message is already handled')
        }
    }

    /**
     * send acknowledgements signal to queue service for this message
     */
    reject() {
        if (!this.isHandled) {
            this._delivery.release({
                delivery_failed: false,
                undeliverable_here: true
            })
            this._handled = true
        } else {
            throw new Error('this message is already handled')
        }
    }
}

export default AMQPMessage