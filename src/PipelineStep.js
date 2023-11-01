class PipelineStep {
    /** @type {number} */
    id = null
    /** @type {string} */
    type = null
    /** @type {Object} */
    data = {}
    /** @type {string} */
    queue = null
    /** @type {String} */
    executedOn = null
    /** @type {Boolean} */
    executed = false
    /** @type {number} */
    latency = null
    /** @type {Object} */
    output = {}

    /**
     * 
     * @param {PipelineStep} data 
     */
    constructor(data = {}) {
        this.id = data.id || this.id
        this.type = data.type || this.type
        this.data = data.data || this.data
        this.queue = data.queue || this.queue
        this.executedOn = data.executedOn || this.executedOn
        this.executed = typeof data.executed === 'boolean' ? data.executed : this.executed
        this.latency = typeof data.latency === 'number' ? data.latency : this.latency
        this.output = data.output || this.output
    }
}

export default PipelineStep