
/**
 * @name env
 * Get environment variable or default value
 */
export default (key, defaultValue = null) => {
    if (typeof process.env[key] === 'undefined') {
        return defaultValue
    } else {
        return process.env[key]
    }
}