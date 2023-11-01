import { Signal } from 'signals'
import env from './env'
import fs from 'fs'
import path from 'path'

/**
 * @author Daniel Kalevski
 * @class Logger
 */

class Logger {

    /** @private */
    console = console

    /** @private */
    namespace = null

    /** @private */
    filesystemExists = null

    /** @private */
    filesystemLocation = null

    /** @private */
    typeColor = {
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[32m',
        verbose: '\x1b[36m',
        debug: '\x1b[34m',
        silly: '\x1b[35m'
    }

    constructor(namespace, filesystemExists, filesystemLocation) {
        this.namespace = namespace
        this.filesystemExists = filesystemExists
        this.filesystemLocation = filesystemLocation
    }

    error() {
        if (LEVEL < Logger.LEVEL.ERROR) return
        this._log('error', arguments)
    }

    warn() {
        if (LEVEL < Logger.LEVEL.WARNING) return
        this._log('warn', arguments)
    }

    info() {
        if (LEVEL < Logger.LEVEL.INFO) return
        this._log('info', arguments)
    }

    verbose() {
        if (LEVEL < Logger.LEVEL.VERBOSE) return
        this._log('verbose', arguments)
    }

    debug() {
        if (LEVEL < Logger.LEVEL.DEBUG) return
        this._log('debug', arguments)
    }

    silly() {
        if (LEVEL < Logger.LEVEL.SILLY) return
        this._log('silly', arguments)
    }

    /** @private */
    _log(type, args) {
        args = Array.from(args)
        let message = ''
        for (let i = 0; i < args.length; i++) {
            let prefix = ' '
            if (i == 0) prefix = ''
            if (args[i] instanceof Error) {
                message += prefix + (type === 'error' ? args[i].stack : args[i].message)
            } else if (typeof args[i] !== 'string') {
                let cache = []
                message += prefix + '\n' + JSON.stringify(args[i], (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (cache.indexOf(value) !== -1) {
                            return
                        }
                        cache.push(value)
                    }
                    return value
                }, 3);
                cache = null
            } else {
                message += prefix + args[i]
            }
        }

        if (MODE == Logger.MODE.DISPATCH) {
            Logger.onMessage.dispatch(message, type, this.formatMessage(message, type), this.namespace)
        } else if (MODE == Logger.MODE.PRINT_COLOR) {
            this.console.log(this.formatMessage(message, type, true))
        } else if (MODE == Logger.MODE.PRINT) {
            this.console.log(this.formatMessage(message, type, false))
        }

        if (this.filesystemExists && FILESYSTEM_ENABLED) {
            const filename = new Date().toLocaleDateString().replace(/\//g, '-') + '.log'
            const filepath = path.join(this.filesystemLocation, filename)
            const logMessage = this.formatMessage(message, type, false)
            fs.appendFile(filepath, logMessage, (err) => {
                if (err) {
                    this.console.log(this.formatMessage(err.toString(), 'error', false))
                }
            })
        }
    }
    
    /** @private */
    formatMessage(message, type, isColored = true) {
        let formatted = ''
        const logLevel = type.toUpperCase()
        formatted += `[${logLevel}][${this.namespace}][${new Date(Date.now()).toLocaleString()}]: `
        formatted += message
        if (isColored) {
            return this.typeColor[type] + formatted + '\x1b[37m'
        }
        return formatted
    }
}

Logger.LEVEL = {
    NONE : 0,
    ERROR : 1,
    WARNING : 2,
    INFO: 3,
    VERBOSE: 4,
    DEBUG: 5,
    SILLY: 6
}

Logger.MODE = {
    DISPATCH: 0,
    PRINT_COLOR: 1,
    PRINT: 2
}

Logger.onMessage = new Signal()

var LOGGERS = {}
var LEVEL = env('LOGGER_LEVEL') || Logger.LEVEL.INFO
var MODE = env('LOGGER_MODE') || Logger.MODE.PRINT

var FILESYSTEM_CHECK = false
var FILESYSTEM_EXISTS = false
var FILESYSTEM_ENABLED = env('LOGGER_FILESYSTEM') || false
var FILESYSTEM_LOCATION = env('LOGGER_FILESYSTEM_LOCATION') || './log'

/**
 * 
 * @param {string} namespace
 * @returns {Logger} 
 */
Logger.getLogger = (namespace = 'default') => {
    if (!FILESYSTEM_CHECK && FILESYSTEM_ENABLED) {
        FILESYSTEM_CHECK = true

        try {
            fs.accessSync(FILESYSTEM_LOCATION, fs.constants.W_OK)
            FILESYSTEM_EXISTS = true
        }
        catch (err) {
            let message = `[Logger][${new Date(Date.now()).toLocaleString()}]:`
            if (err.code === 'ENOENT') {
                message += `Directory ${FILESYSTEM_LOCATION} does not exist!`
            } else if (err.code === 'EACCES') {
                message += `Permission denied: ${FILESYSTEM_LOCATION}`
            } else {
                message += err.toString()
            }
            console.log(message)
        }
    }

    if (typeof LOGGERS[namespace] === 'undefined') {
        LOGGERS[namespace] = new Logger(namespace, FILESYSTEM_EXISTS, FILESYSTEM_LOCATION)
    }

    return LOGGERS[namespace]
}

Logger.setLevel = (newLevel = Logger.LEVEL.INFO) => {
    if (typeof newLevel === 'number' && newLevel >= 0 && newLevel <= Logger.LEVEL.SILLY) {
        LEVEL = newLevel
    }
}

Logger.setMode = (newMode = Logger.MODE.PRINT_COLOR) => {
    MODE = newMode
}

export default Logger