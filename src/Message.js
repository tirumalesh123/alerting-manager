import { v4 as uuid } from 'uuid'
import PipelineStep from './PipelineStep'

class Message {
    
    /** @type {string} */
    uid = null

    /** @type {Object} */
    data = {}
    
    /** @type {Object} */
    payload = {}
    
    /** @type {string} */
    pipelineId = ''
    
    /**@type {Status} */
    status = Message.Status.PENDING
    
    /** @type {Array.<PipelineStep>} */
    steps = []
    
    /** @type {Error} */
    error = null
    
    /** @type {number} */
    createdOn = null
    
    /**
     * 
     * @param {Message} data 
     */
    constructor(data = {}) {
        this.uid = data.uid || uuid()
        this.data = data.data || this.data
        this.payload = data.payload || this.payload
        this.pipelineId = data.pipelineId || this.pipelineId
        this.status = data.status || this.status
        if (Array.isArray(data.steps)) {
            this.steps = []
            for (let step of data.steps) {
                this.steps.push(step)
            }
        }
        this.error = data.error || this.error
        this.createdOn = data.createdOn || new Date().toISOString()
    }


    /**
     * 
     * @param {PipelineStep} step 
     */
    addStep(step) {
        if (step instanceof PipelineStep) {
            this.steps.push(step)
        } else {
            throw new Error('step is not instance of PipelineStep')
        }
    }

    /**
     * 
     * @param {Object} filter filter steps by value of member
     * @returns {Array.<PipelineStep>} 
     */
    getSteps(filter = {}) {
        const steps = []
        const filterKeys = Object.keys(filter)
        for (let step of this.steps) {
            let pass = true
            for (const filterKey of filterKeys) {
                if (step[filterKey] !== filter[filterKey]) {
                    pass = false
                    break
                }
            }
            if (pass) {
                const data = { ...step }
                steps.push(new PipelineStep(data))
            }
        }
        return steps
    }

    /**
     * 
     * @param {string} id step id
     * @param {Object} data step output
     * @param {number} latency time elapsed from starting executing the step to the end in ms
     * @param {boolean} markExecuted
     */
    setOutput(id, data = {}, latency = 0, markExecuted = true) {
        let found = false
        for (let step of this.steps) {
            if (step.id === id) {
                found = true
                step.output = data
                if (markExecuted) {
                    step.executed = true
                    step.executedOn = new Date().toISOString()
                    step.latency = latency
                }
                return new PipelineStep({ ...step })
            }
        }
        if (!found) {
            throw new Error(`step with id ${id} can not be find`)
        }
    }

    getOutput() {
        let output = { ...this.payload }
        for (let step of this.steps) {
            output = Object.assign(output, step.output)
        }
        return output
    }
}

/**
 * @readonly
 * @enum {string}
 */
Message.Status = {
    /** Message failed at any step */
    FAIL: 'fail',
    /** Message succes execution */
    SUCCESS: 'success',
    /** Message in progress */
    PENDING: 'pending'
}

export default Message