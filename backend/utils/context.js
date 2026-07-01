const { AsyncLocalStorage } = require('async_hooks');

const contextStorage = new AsyncLocalStorage();

/**
 * Initializes a new execution context for the request.
 * Should be called by the middleware.
 */
function runWithContext(initialState, callback) {
    contextStorage.run(initialState, callback);
}

/**
 * Gets the current context object.
 * @returns {Object|null}
 */
function getContext() {
    return contextStorage.getStore() || null;
}

/**
 * Retrieves a specific key from the current context.
 * @param {string} key 
 */
function get(key) {
    const store = getContext();
    return store ? store[key] : undefined;
}

module.exports = {
    runWithContext,
    getContext,
    get
};
