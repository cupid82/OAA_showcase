'use strict';

/**
 * Stands in for the `depd` package in the Cloudflare Worker bundle only — see
 * `alias` in wrangler.jsonc. Node keeps using the real one.
 *
 * The real `depd` builds each deprecated-function wrapper with `new Function`,
 * which the Workers runtime forbids, and Express 4, body-parser and send create
 * those wrappers as they load. This keeps depd's API and behaviour — the
 * deprecated function still works, and its first use logs a warning — without
 * generating code from a string.
 */
module.exports = function depd(namespace) {
  const warned = new Set();

  function deprecate(message) {
    if (warned.has(message)) return;
    warned.add(message);
    console.warn(`${namespace} deprecated ${message}`);
  }

  deprecate.function = function wrapfunction(fn, message) {
    if (typeof fn !== 'function') throw new TypeError('argument fn must be a function');

    const wrapped = function (...args) {
      deprecate(message || fn.name || '<anonymous>');
      return fn.apply(this, args);
    };
    // Express reads a middleware's arity, so the wrapper keeps the original's.
    Object.defineProperty(wrapped, 'length', { value: fn.length });
    Object.defineProperty(wrapped, 'name', { value: fn.name });
    return wrapped;
  };

  deprecate.property = function wrapproperty(obj, prop) {
    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
      throw new TypeError('argument obj must be object');
    }
    if (!Object.getOwnPropertyDescriptor(obj, prop)) {
      throw new TypeError('must call property on owner object');
    }
    // Left untouched: the property keeps working, it just isn't flagged on use.
  };

  return deprecate;
};
