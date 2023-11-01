import { CronJob, CronTime } from 'cron'
import { Signal } from 'signals'

class Task {

    /**
     * 
     * @returns {any|Promise.<any>}
     */
    run() {}
}

/**
 * @typedef TaskResult
 * @property {string} taskName
 * @property {any} output 
 * @property {Error} error
 */

class TaskRunner {

    /**
     * 
     * @private
     * @type {Map.<string, Task>}
     */
    taskMap = new Map()

    /**
     * @private
     * @type {Map.<string, CronJob>}
     */
    jobMap = new Map()

    /**
     * 
     * @type {Signal.<TaskResult>}
     */
    onTick = new Signal()

    /**
     * register a new task
     * @param {string} name 
     * @param {Task} task 
     * @returns {TaskRunner}
     */
    add(name, task = null) {
        
        if (this.taskMap.has(name)) {
            throw new Error(`task with name=(${name}) already exist`)
        }

        if (typeof task !== 'object') {
            throw new Error('task must be provided as second parameter')
        }
        
        if (typeof task.run !== 'function') {
            throw new Error('task must extends from Task class')
        }

        this.taskMap.set(name, task)
        return this
    }

    /**
     * removes already registered task
     * @param {string} name 
     * @param {boolean} force force stop before removing
     * @returns {TaskRunner}
     */
    remove(name, force = false) {
        if (!this.taskMap.has(name)) {
            throw new Error(`task [${name}] can not be removed, doesn't exist`)
        }

        if (this.jobMap.has(name) && force) {
            this.stop(name)
        } else if (this.jobMap.has(name) && !force) {
            throw new Error(`task [${name}] has running scheduler, you need to stop before removing the task`)
        }
        this.taskMap.delete(name)
        return this
    }


    /**
     * Schedule cron like execution
     * @param {string} name 
     * @param {string} cronTime 
     * @returns {TaskRunner}
     */
    schedule(name, cronTime) {
        if (!this.taskMap.has(name)) {
            throw new Error(`there is no task registered with name=(${name})`)
        }

        if (this.jobMap.has(name)) {
            throw new Error(`task [${name}] already has a scheduled job`)
        }

        let time = null

        try {
            time = new CronTime(cronTime)
        } catch (error) {
            throw new Error(`Invalid cron time Error: ${error.message} cronTime=(${cronTime})`)
        }

        let job = new CronJob(cronTime)
        job.addCallback(() => this.runTask(name))
        this.jobMap.set(name, job)
        job.start()
        return this
    }

    /**
     * Stop already scheduled cron
     * @param {string} name 
     * @returns {TaskRunner}
     */
    stop(name) {
        if (!this.jobMap.has(name)) {
            throw new Error(`there is not scheduled job on task [${name}]`)
        }
        this.jobMap.get(name).stop()
        this.jobMap.delete(name)
        return this
    }

    /**
     * invoke already registered job manualy
     * @param {string} name 
     * @returns {TaskRunner}
     */
    invoke(name) {
        if (!this.taskMap.has(name)) {
            throw new Error(`there is not task registered with name ${name}`)
        }
        this.runTask(name)
        return this
    }

    /**
     * 
     * @private
     * @param {string} name 
     */
    runTask(name) {
        const triggerTick = (output, error = null) => {
            this.onTick.dispatch({
                taskName: name,
                output,
                error
            })
        }
        
        let output = null
        try {
            output = this.taskMap.get(name).run()
        } catch (error) {
            triggerTick(null, error)
        }

        if (output instanceof Promise) {
            output.then(output => {
                triggerTick(output)
            }).catch(error => {
                triggerTick(null, error)
            })
        } else {
            triggerTick(output)
        }
        
    }
    

}


TaskRunner.Task = Task

export default TaskRunner