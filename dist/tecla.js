(function (window) { // start self executing function...

'use strict';

const isMacOS = /^Mac/.test(navigator.platform);

// Initial context.
const CONTEXT_NAME_DEFAULT = 'default';

// Is command key for MacOS or ctrl key for everything else.
const SHORTCUT_KEY_ROOT = isMacOS ? 'left window key' : 'ctrl';

// Keyboard event types.
const KEY_UP = 'keyup';
const KEY_DOWN = 'keydown';
const KEY_PRESS = 'keypress';
const KEY_MULTI_PRESS = 'keymultipress';

// Order in which keys have been pressed. Used to invoke
// multi-key press listeners.
const keySequence = new Set();

// All downed keys. Order does not matter.
const downedKeys = new Set();

// Keep track of how long each key is down.
const downedKeysTimeRegistry = {};

// Contexts keep track of all listeners assigned to them.
const contextRegistry = {};

// Store the latest keyboard event.
const keyEvent = {
    e: null,
    keyCode: '',
    keyName: ''
};

const duplicateKeyNamesMap = new Map();

// Shortcut key down flags.
let altKeyDown = false;
let ctrlKeyDown = false;
let metaKeyDown = false;
let shiftKeyDown = false;
let rootShortcutKeyDown = false;

// Ignore keyboard events if disabled.
let enabled = true;

// Currently set context.
let context = null;

let loggingKeyPress = false;

/**
 * @function isDisabled
 * @return {Boolean}
 * @api private
 */

function isDisabled () {
    return !enabled;
}

/**
 * @function hasKeyCode
 * @param {String} keyName
 * @return {Boolean}
 * @api private
 */

function hasKeyCode (keyName) {
    return keyCodesDict[keyName] !== undefined;
}

/**
 * @function hasContext
 * @param {String} name
 * @return {Boolean}
 * @api private
 */

function hasContext (name) {
    return contextRegistry[name] !== undefined;
}

/**
 * @function isValidContextName
 * @param {String} name
 * @return {Boolean}
 * @api private
 */

function isValidContextName (name) {
    // Context name has to be non empty string.
    return typeof name === 'string' && name.length > 0;
}

/**
 * @function isAnyShortcutKeyDown
 * @return {Boolean}
 * @api private
 */

function isAnyShortcutKeyDown () {
    return altKeyDown || ctrlKeyDown || metaKeyDown || shiftKeyDown;
}

/**
 * @function isMetaOrRootShortcutKeyDown
 * @return {Boolean}
 * @api private
 */

function isMetaOrRootShortcutKeyDown () {
    return metaKeyDown || rootShortcutKeyDown;
}

/**
 * Check if there is a focused text input element in the DOM.
 *
 * @function isTextInputFocused
 * @return {Boolean}
 * @api private
 */

function isTextInputFocused () {
    let el = document.activeElement;

    switch (el.nodeName) {
        case 'INPUT':
        case 'TEXTAREA':
            return true;

        default:
            return false;
    }
}

/**
 * @function isValidListener
 * @param {Object|Null} listener
 * @param {Function} callback
 * @return {Boolean}
 * @api private
 */

function isValidListener (listener, callback) {
    if (typeof callback !== 'function') { return false; }

    // If the listener is null the callback will be invoked directly.
    if (listener === null) {
        return true;
    } else if (!Array.isArray(listener) && typeof listener === 'object') {
        return true;
    }

    return false;
}

/**
 * @function hasDuplicateKeyNames
 * @param {Array} keyNames
 * @return {Boolean}
 * @api private
 */

function hasDuplicateKeyNames (keyNames) {
    for (let i = 0, max = keyNames.length; i < max; i++) {
        let name = keyNames[i];

        if (duplicateKeyNamesMap.has(name)) {
            duplicateKeyNamesMap.clear();

            return true;
        } else {
            duplicateKeyNamesMap.set(name, true);
        }
    }

    duplicateKeyNamesMap.clear();

    return false;
}

/**
 * Validate key names used in multi-key press events.
 *
 * @function isValidKeyNameSequence
 * @param {Array} keyNames
 * @return {Boolean}
 * @api private
 */

function isValidKeyNameSequence (keyNames) {
    let max = keyNames.length;

    // Sequences can not have less than two keys or more than six keys.
    if (max < 2 || max > 6) { return false; }

    // Allow a maximum of three keys for each type of key.
    let normalKeyCount = 0;
    let shortcutKeyCount = 0;

    // Assume first key name is a shortcut key.
    let isShortcut = true;

    for (let i = 0; i < max; i++) {
        let keyName = keyNames[i];

        // If key name doesn't exist then key code is invalid.
        if (keyCodesDict[keyName] === undefined) { return false; }

        // Shortcut key.
        if (shortcutKeyNamesDict[keyName]) {
            // If previously iterated key has been a normal key, then sequence is invalid.
            // Shortcut keys must always go before normal keys.
            if (!isShortcut) { return false; }

            shortcutKeyCount++;

            if (shortcutKeyCount > 3) { return false; }

        // Normal key.
        } else {
            // Shortcut keys are not allowed after normal keys.
            if (isShortcut) { isShortcut = false; }

            normalKeyCount++;

            if (normalKeyCount > 3) { return false; }
        }
    }

    // At least one normal key must be in key sequence.
    if (normalKeyCount === 0) {
        return false;
    // All key names must be unique.
    } else if (hasDuplicateKeyNames(keyNames)) {
        return false;
    } else {
        return true;
    }
}

/**
 * Check if key name sequence is colliding with listeners when
 * traversing multi-key path.
 *
 * @function isKeyNameSequenceCollidingWithListeners
 * @param {Array} keyNames
 * @param {String} contextName
 * @return {Boolean}
 * @api private
 */

function isKeyNameSequenceCollidingWithListeners (keyNames, contextName) {
    let max = keyNames.length;
    let last = max - 1;
    let node = contextRegistry[contextName][KEY_MULTI_PRESS];

    for (let i = 0; i < max; i++) {
        let keyName = keyNames[i];
        let keyCode = keyCodesDict[keyName];

        node = node[keyCode];

        // Path is clear.
        if (node === undefined) {
            return false;
        // If there are listeners before reaching the last node,
        // then this key sequence is colliding with another one.
        } else if (Array.isArray(node)) {
            return i < last ? true : false;
        // Listeners cannot be overwritten on top of nodes that are
        // being used as objects.
        } else if (i === last) {
            return true;
        }
    }

    return false;
}

/**
 * Revert to initial state where no key has been downed.
 *
 * @function reset
 * @api private
 */

function reset () {
    resetKeyEvent();
    resetDownedKeys();
    resetKeySequence();

    altKeyDown = false;
    ctrlKeyDown = false;
    metaKeyDown = false;
    shiftKeyDown = false;
    rootShortcutKeyDown = false;
}

/**
 * @function resetKeyEvent
 * @api private
 */

function resetKeyEvent () {
    keyEvent.e = null;
    keyEvent.keyCode = '';
    keyEvent.keyName = '';
}

/**
 * Remove all downed keys even if they are still being pressed.
 *
 * @function resetDownedKeys
 * @api private
 */

function resetDownedKeys () {
    for (let keyCode of downedKeys) {
        downedKeysTimeRegistry[keyCode] = 0;

        // Force remove sequence keys to prevent leftovers.
        removeSequenceKey(keyCode);
        invokeListeners(context[KEY_UP][keyCode]);
    }

    downedKeys.clear();
}

/**
 * @function resetKeySequence
 * @api private
 */

function resetKeySequence () {
    for (let keyCode of keySequence) {
        // Force remove downed keys to prevent leftovers.
        removeDownedKey(keyCode);
        invokeListeners(context[KEY_UP][keyCode]);
    }

    keySequence.clear();
}

/**
 * Extract relevant data from latest keyboard event.
 *
 * @function updateKeyEvent
 * @param {KeyboardEvent} e
 * @api private
 */

function updateKeyEvent (e) {
    let keyName = alterShortcutKeyName(keyNamesDict[String(e.keyCode)]);

    keyEvent.e = e;
    keyEvent.keyCode = keyCodesDict[keyName];
    keyEvent.keyName = keyName;

    altKeyDown = e.altKey;
    ctrlKeyDown = e.ctrlKey;
    metaKeyDown = e.metaKey;
    shiftKeyDown = e.shiftKey;
    rootShortcutKeyDown = isMacOS ? metaKeyDown : ctrlKeyDown;
}

/**
 * If enabled, log latest key press event in an easy to read format.
 *
 * @function logKeyPress
 * @api private
 */

function logKeyPress () {
    if (!loggingKeyPress) { return undefined; }

    console.log(`TECLA:  keyName = "${keyEvent.keyName}" keyCode = "${keyEvent.keyCode}"`);
}

/**
 * @function alterContextName
 * @param {String} name
 * @return {String}
 * @api private
 */

function alterContextName (name) {
    return name === undefined ? CONTEXT_NAME_DEFAULT : name;
}

/**
 * @function addContext
 * @param {String} name
 * @api private
 */

function addContext (name) {
    if (!isValidContextName(name) || hasContext(name)) { return undefined; }

    let context = {};

    context.name = name;
    context[KEY_UP] = {};
    context[KEY_DOWN] = {};
    context[KEY_PRESS] = {};
    context[KEY_MULTI_PRESS] = {};

    contextRegistry[name] = context;
}

/**
 * @function setContext
 * @param {String} name
 * @api private
 */

function setContext (name) {
    if (!hasContext(name)) { return undefined; }

    reset();

    context = contextRegistry[name];
}

/**
 * Add single key listener.
 *
 * @function addListener
 * @param {String} type
 * @param {Object|Null} listener
 * @param {Function} callback
 * @param {String} keyName
 * @param {Boolean} ignoreFocusedTextInput
 * @param {String} contextName
 * @api private
 */

function addListener (type, listener, callback, keyName, ignoreFocusedTextInput, contextName) {
    keyName = alterShortcutKeyName(keyName);
    contextName = alterContextName(contextName);

    if (!isValidListener(listener, callback) || !hasKeyCode(keyName)) {
        return undefined;
    } else {
        addContext(contextName);

        if (!hasContext(contextName)) { return undefined; }
    }

    let keyCode = keyCodesDict[keyName];

    if (contextRegistry[contextName][type][keyCode] === undefined) {
        contextRegistry[contextName][type][keyCode] = [];
    }

    contextRegistry[contextName][type][keyCode].push([listener, callback, Boolean(ignoreFocusedTextInput)]);
}

/**
 * Remove single key listener.
 *
 * @function removeListener
 * @param {String} type
 * @param {Object|Null} listener
 * @param {Function} callback
 * @param {String} keyName
 * @param {String} contextName
 * @api private
 */

function removeListener (type, listener, callback, keyName, contextName) {
    keyName = alterShortcutKeyName(keyName);
    contextName = alterContextName(contextName);

    if (hasContext(contextName) && hasKeyCode(keyName)) {
        let keyCode = keyCodesDict[keyName];

        removeListenerFromNode(contextRegistry[contextName][type][keyCode], listener, callback);
    }
}

/**
 * @function removeListenerFromNode
 * @param {Array} node
 * @param {Object|Null} listener
 * @param {Function} callback
 * @api private
 */

function removeListenerFromNode (node, listener, callback) {
    if (!Array.isArray(node)) { return undefined; }

    for (let i = 0, max = node.length; i < max; i++) {
        let arr = node[i];

        if (listener === arr[0] && callback === arr[1]) {
            // Cleanup.
            arr[0] = null;
            arr[1] = null;

            node.splice(i, 1);

            break;
        }
    }
}

/**
 * @function invokeListeners
 * @param {Array} node
 * @return {Boolean}
 * @api private
 */

function invokeListeners (node) {
    if (!Array.isArray(node)) { return false; }

    for (let i = 0, max = node.length; i < max; i++) {
        let arr = node[i];

        // If not allowed to ignore focused text inputs then go to next listener.
        if (!arr[2] && isTextInputFocused()) { continue; }

        let listener = arr[0];
        let callback = arr[1];

        if (listener === null) {
            callback(keyEvent.e);
        } else {
            callback.call(listener, keyEvent.e);
        }
    }

    return true;
}

/**
 * @function invokeKeyDownListeners
 * @api private
 */

function invokeKeyDownListeners () {
    // Downed shortcut keys prevent key down events.
    if (isMetaOrRootShortcutKeyDown()) { return undefined; }

    for (let keyCode of downedKeys) {
        invokeListeners(context[KEY_DOWN][keyCode]);
    }
}

/**
 * Remove key code from all collections used to access key listeners
 * before invoking key up listeners.
 *
 * @function forceKeyUp
 * @param {String} keyCode
 * @api private
 */

function forceKeyUp (keyCode) {
    removeDownedKey(keyCode);
    removeSequenceKey(keyCode);
    invokeListeners(context[KEY_UP][keyCode]);
}

/**
 * Push unique key code.
 *
 * @function addSequenceKey
 * @api private
 */

function addSequenceKey () {
    keySequence.add(keyEvent.keyCode);
}

/**
 * @function removeSequenceKey
 * @param {String} keyCode
 * @api private
 */

function removeSequenceKey (keyCode) {
    keySequence.delete(keyCode);
}

/**
 * @function addDownedKey
 * @api private
 */

function addDownedKey () {
    // Shortcut keys are not allowed in key down events.
    if (shortcutKeyNamesDict[keyEvent.keyName]) {
        return undefined;
    // Key code must be unique.
    } else if (downedKeys.has(keyEvent.keyCode)) {
        return undefined;
    }

    downedKeys.add(keyEvent.keyCode);

    downedKeysTimeRegistry[keyEvent.keyCode] = 0;
}

/**
 * @function removeDownedKey
 * @param {String} keyCode
 * @api private
 */

function removeDownedKey (keyCode) {
    downedKeys.delete(keyCode);

    downedKeysTimeRegistry[keyCode] = 0;
}

/**
 * While there are shortcut keys being pressed, remove downed keys every
 * 200 milliseconds to make it easier to chain key sequences that lead to
 * multi-key listeners.
 *
 * @function cleanupDownedKeys
 * @param {Number} delta
 * @api private
 */

function cleanupDownedKeys (delta) {
    if (!isMetaOrRootShortcutKeyDown()) { return undefined; }

    for (let keyCode of downedKeys) {
        downedKeysTimeRegistry[keyCode] += delta;

        // Force key up for downed key.
        if (downedKeysTimeRegistry[keyCode] > 200) {
            forceKeyUp(keyCode);
        }
    }
}

/**
 * Split shortcut and normal keys into two arrays.
 *
 * @function splitMultiKeyPath
 * @param {Array} keyNames
 * @return {Array}
 * @api private
 */

function splitMultiKeyPath (keyNames) {
    for (let i = 0, max = keyNames.length; i < max; i++) {
        let keyName = keyNames[i];

        if (!shortcutKeyNamesDict[keyName]) {
            return [keyNames.slice(0, i), keyNames.slice(i, max)];
        }
    }
}

/**
 * Create full string out of key names array to use as unique key
 * in multi-key hash.
 *
 * @function createUniqueID
 * @param {Array} keyNames
 * @return {Array}
 * @api private
 */

function createUniqueID (keyNames) {
    return keyNames.map((name) => keyCodesDict[name]).toString();
}

/**
 * Build all possible permutations of key names. Key name permutations
 * make it easier to find multi-key listeners by making the order of
 * keys presses not matter.
 *
 * @function createMultiKeyCombinations
 * @param {Array} keyNames
 * @api private
 */

function createMultiKeyCombinations (keyNames) {
    // One permutation.
    if (keyNames.length === 1) {
        return [keyNames];
    // Two permutations.
    } else if (keyNames.length === 2) {
        return [ keyNames,
                [keyNames[1], keyNames[0]]
        ];
    // Six permutations.
    } else if (keyNames.length === 3) {
        return [ keyNames,
                [keyNames[0], keyNames[2], keyNames[1]],
                [keyNames[1], keyNames[0], keyNames[2]],
                [keyNames[1], keyNames[2], keyNames[0]],
                [keyNames[2], keyNames[0], keyNames[1]],
                [keyNames[2], keyNames[1], keyNames[0]]
        ];
    }
}

/**
 * Create path by traversing all keys.
 *
 * @function createMultiKeyPath
 * @param {Array} shortcutKeys
 * @param {Array} normalKeys
 * @param {Array} listeners
 * @param {String} contextName
 * @api private
 */

function createMultiKeyPath (shortcutKeys, normalKeys, listeners, contextName) {
    let allKeys = shortcutKeys.concat(normalKeys);

    let max = allKeys.length;
    let last = max - 1;
    let node = contextRegistry[contextName][KEY_MULTI_PRESS];

    for (let i = 0; i < max; i++) {
        let keyName = allKeys[i];
        let keyCode = keyCodesDict[keyName];

        if (i === last) {
            node[keyCode] = listeners;
        } else if (node[keyCode] === undefined) {
            node[keyCode] = {};
        }

        node = node[keyCode];
    }
}

/**
 * @function addMultiKeyListener
 * @param {Object|Null} listener
 * @param {Function} callback
 * @param {Array} keyNames
 * @param {Boolean} ignoreFocusedTextInput
 * @param {String} contextName
 * @api private
 */

function addMultiKeyListener (listener, callback, keyNames, ignoreFocusedTextInput, contextName) {
    alterShortcutKeyNames(keyNames);

    contextName = alterContextName(contextName);

    if (!isValidListener(listener, callback) || !isValidKeyNameSequence(keyNames)) {
        return undefined;
    } else if (isKeyNameSequenceCollidingWithListeners(keyNames, contextName)) {
        return undefined;
    } else {
        addContext(contextName);

        if (!hasContext(contextName)) { return undefined; }
    }

    let uniqueID = createUniqueID(keyNames);
    let listeners = contextRegistry[contextName][KEY_MULTI_PRESS][uniqueID];

    if (listeners === undefined) {
        listeners = [];

        let split = splitMultiKeyPath(keyNames);
        let shortcutKeyCombinations = createMultiKeyCombinations(split[0]);
        let normalKeyCombinations = createMultiKeyCombinations(split[1]);

        // Create multi-key path for all permutations.
        for (let i = 0, iMax = shortcutKeyCombinations.length; i < iMax; i++) {
            for (let j = 0, jMax = normalKeyCombinations.length; j < jMax; j++) {
                createMultiKeyPath(shortcutKeyCombinations[i], normalKeyCombinations[j], listeners, contextName);
            }
        }

        contextRegistry[contextName][KEY_MULTI_PRESS][uniqueID] = listeners;
    }

    listeners.push([listener, callback, Boolean(ignoreFocusedTextInput)]);
}

/**
 * @function removeMultiKeyListener
 * @param {Object|Null} listener
 * @param {Function} callback
 * @param {Array} keyNames
 * @param {String} contextName
 * @api private
 */

function removeMultiKeyListener (listener, callback, keyNames, contextName) {
    alterShortcutKeyNames(keyNames);

    contextName = alterContextName(contextName);

    if (hasContext(contextName) && isValidKeyNameSequence(keyNames)) {
        let uniqueID = createUniqueID(keyNames);

        removeListenerFromNode(contextRegistry[contextName][KEY_MULTI_PRESS][uniqueID], listener, callback);
    }
}

/**
 * Normalize special key names to make node traversal easier.
 *
 * @function alterShortcutKeyName
 * @param {String} keyName
 * @api private
 */

function alterShortcutKeyName (keyName) {
    if (!shortcutKeyNamesDict[keyName]) { return keyName; }

    if (isMacOS) {
        // Treat both command keys as one.
        if (keyName === 'select key') {
            return 'left window key';
        }
    }

    return keyName;
}

/**
 * @function alterShortcutKeyNames
 * @param {Array} keyNames
 * @api private
 */

function alterShortcutKeyNames (keyNames) {
    for (let i = 0, max = keyNames.length; i < max; i++) {
        keyNames[i] = alterShortcutKeyName(keyNames[i]);
    }
}

/**
 * @function onBlur
 * @param {FocusEvent} e
 * @api private
 */

function onBlur (e) {
    reset();
}

/**
 * @function onKeyUp
 * @param {KeyboardEvent} e
 * @api private
 */

function onKeyUp (e) {
    updateKeyEvent(e);

    if (!isDisabled()) {
        forceKeyUp(keyEvent.keyCode);
    }

    resetKeyEvent();
}

/**
 * @function onKeyDown
 * @param {KeyboardEvent} e
 * @api private
 */

function onKeyDown (e) {
    updateKeyEvent(e);

    if (!isDisabled()) {
        addDownedKey();
        invokeKeyDownListeners();
        onKeyPress();
    }

    resetKeyEvent();
}

/**
 * @function onKeyPress
 * @api private
 */

function onKeyPress () {
    // Has key already been downed?
    if (keyEvent.e.repeat) { return undefined; }

    logKeyPress();
    invokeListeners(context[KEY_PRESS][keyEvent.keyCode]);
    addSequenceKey();
    onMultiKeyPress();
}

/**
 * Traverse multi-key press nodes with key sequence until node
 * with listeners is found.
 *
 * @function onMultiKeyPress
 * @api private
 */

function onMultiKeyPress () {
    let node = context[KEY_MULTI_PRESS];

    for (let keyCode of keySequence) {
        node = node[keyCode];

        // If key sequence leads nowhere then stop traversing.
        if (node === undefined) { return undefined; }
    }

    if (invokeListeners(node)) {
        for (let keyCode of keySequence) {
            if (!shortcutKeyCodesDict[keyCode]) {
                forceKeyUp(keyCode);
            }
        }
    }
}

window['TECLA'] = {
    'CONTEXT_NAME_DEFAULT': CONTEXT_NAME_DEFAULT,

    'KEY_UP': KEY_UP,
    'KEY_DOWN': KEY_DOWN,
    'KEY_PRESS': KEY_PRESS,
    'KEY_MULTI_PRESS': KEY_MULTI_PRESS,

    'SHORTCUT_KEY_ROOT': SHORTCUT_KEY_ROOT,

    /**
     * @function isTextInputFocused
     * @return {Boolean}
     * @api public
     */

    'isTextInputFocused': function () {
        return isTextInputFocused();
    },

    /**
     * @function isAnyShortcutKeyDown
     * @return {Boolean}
     * @api public
     */

    'isAnyShortcutKeyDown': function () {
        return isAnyShortcutKeyDown();
    },

    /**
     * @function isMetaOrRootShortcutKeyDown
     * @return {Boolean}
     * @api public
     */

    'isMetaOrRootShortcutKeyDown': function () {
        return isMetaOrRootShortcutKeyDown();
    },

    /**
     * @function isAltKeyDown
     * @return {Boolean}
     * @api public
     */

    'isAltKeyDown': function () {
        return altKeyDown;
    },

    /**
     * @function isCtrlKeyDown
     * @return {Boolean}
     * @api public
     */

    'isCtrlKeyDown': function () {
        return ctrlKeyDown;
    },

    /**
     * @function isMetaKeyDown
     * @return {Boolean}
     * @api public
     */

    'isMetaKeyDown': function () {
        return metaKeyDown;
    },

    /**
     * @function isShiftKeyDown
     * @return {Boolean}
     * @api public
     */

    'isShiftKeyDown': function () {
        return shiftKeyDown;
    },

    /**
     * @function isRootShortcutKeyDown
     * @return {Boolean}
     * @api public
     */

    'isRootShortcutKeyDown': function () {
        return rootShortcutKeyDown;
    },

    /**
     * @function isKeyPressLogging
     * @return {Boolean}
     * @api public
     */

    'isKeyPressLogging': function () {
        return loggingKeyPress;
    },

    /**
     * @function toggleKeyPressLogging
     * @api public
     */

    'toggleKeyPressLogging': function () {
        loggingKeyPress = !loggingKeyPress;
    },

    /**
     * @function enableKeyPressLogging
     * @api public
     */

    'enableKeyPressLogging': function () {
        loggingKeyPress = true;
    },

    /**
     * @function disableKeyPressLogging
     * @api public
     */

    'disableKeyPressLogging': function () {
        loggingKeyPress = false;
    },

    /**
     * @function isDisabled
     * @return {Boolean}
     * @api public
     */

    'isDisabled': function () {
        return isDisabled();
    },

    /**
     * @function toggleDisable
     * @api public
     */

    'toggleDisable': function () {
        if (this['isDisabled']()) {
            this['enable']();
        } else {
            this['disable']();
        }
    },

    /**
     * @function enable
     * @api public
     */

    'enable': function () {
        enabled = true;
    },

    /**
     * @function disable
     * @api public
     */

    'disable': function () {
        if (enabled) {
            reset();
        }

        enabled = false;
    },

    /**
     * @function hasContext
     * @param {String} name
     * @return {Boolean}
     * @api public
     */

    'hasContext': function (name) {
        return hasContext(name);
    },

    /**
     * @function addContext
     * @param {String} name
     * @api public
     */

    'addContext': function (name) {
        addContext(name);
    },

    /**
     * @function setContext
     * @param {String} name
     * @api public
     */

    'setContext': function (name) {
        setContext(name);
    },

    /**
     * @function setDefaultContext
     * @api public
     */

    'setDefaultContext': function () {
        setContext(CONTEXT_NAME_DEFAULT);
    },

    /**
     * @function getCurrentContextName
     * @return {String}
     * @api public
     */

    'getCurrentContextName': function () {
        return context.name;
    },

    /**
     * @function listenKeyUp
     * @param {Object|Null} listener
     * @param {Function} callback
     * @param {String} keyName
     * @param {Boolean} ignoreFocusedTextInput
     * @param {String} contextName
     * @api public
     */

    'listenKeyUp': function (listener, callback, keyName, ignoreFocusedTextInput, contextName) {
        addListener(KEY_UP, listener, callback, keyName, ignoreFocusedTextInput, contextName);
    },

    /**
     * @function stopListeningKeyUp
     * @param {Object|Null} listener
     * @param {Function} callback
     * @param {String} keyName
     * @param {String} contextName
     * @api public
     */

    'stopListeningKeyUp': function (listener, callback, keyName, contextName) {
        removeListener(KEY_UP, listener, callback, keyName, contextName);
    },

    /**
     * @function listenKeyDown
     * @param {Object|Null} listener
     * @param {Function} callback
     * @param {String} keyName
     * @param {Boolean} ignoreFocusedTextInput
     * @param {String} contextName
     * @api public
     */

    'listenKeyDown': function (listener, callback, keyName, ignoreFocusedTextInput, contextName) {
        addListener(KEY_DOWN, listener, callback, keyName, ignoreFocusedTextInput, contextName);
    },

    /**
     * @function stopListeningKeyDown
     * @param {Object|Null} listener
     * @param {Function} callback
     * @param {String} keyName
     * @param {String} contextName
     * @api public
     */

    'stopListeningKeyDown': function (listener, callback, keyName, contextName) {
        removeListener(KEY_DOWN, listener, callback, keyName, contextName);
    },

    /**
     * @function listenKeyPress
     * @param {Object|Null} listener
     * @param {Function} callback
     * @param {String} keyName
     * @param {Boolean} ignoreFocusedTextInput
     * @param {String} contextName
     * @api public
     */

    'listenKeyPress': function (listener, callback, keyName, ignoreFocusedTextInput, contextName) {
        addListener(KEY_PRESS, listener, callback, keyName, ignoreFocusedTextInput, contextName);
    },

    /**
     * @function stopListeningKeyPress
     * @param {Object|Null} listener
     * @param {Function} callback
     * @param {String} keyName
     * @param {String} contextName
     * @api public
     */

    'stopListeningKeyPress': function (listener, callback, keyName, contextName) {
        removeListener(KEY_PRESS, listener, callback, keyName, contextName);
    },

    /**
     * @function listenMultiKeyPress
     * @param {Object|Null} listener
     * @param {Function} callback
     * @param {Array} keyNames
     * @param {Boolean} ignoreFocusedTextInput
     * @param {String} contextName
     * @api public
     */

    'listenMultiKeyPress': function (listener, callback, keyNames, ignoreFocusedTextInput, contextName) {
        addMultiKeyListener(listener, callback, keyNames, ignoreFocusedTextInput, contextName);
    },

    /**
     * @function stopListeningMultiKeyPress
     * @param {Object|Null} listener
     * @param {Function} callback
     * @param {Array} keyNames
     * @param {String} contextName
     * @api public
     */

    'stopListeningMultiKeyPress': function (listener, callback, keyNames, contextName) {
        removeMultiKeyListener(listener, callback, keyNames, contextName);
    },

    /**
     * @function getKeyName
     * @param {Number} keyCode
     * @return {String}
     * @api public
     */

    'getKeyName': function (keyCode) {
        let keyName = keyNamesDict[String(keyCode)];

        return keyName !== undefined ? keyName : '';
    }
};

// Initialize default context.
addContext(CONTEXT_NAME_DEFAULT);
setContext(CONTEXT_NAME_DEFAULT);

window.addEventListener('blur', onBlur);

document.addEventListener(KEY_UP, onKeyUp);
document.addEventListener(KEY_DOWN, onKeyDown);

(function () {
    let prevTimeStamp = 0;

    /**
     * Perform cleanup every new frame.
     *
     * @function onAnimationFrame
     * @param {Number} timeStamp
     * @api internal
     */

    function onAnimationFrame (timeStamp) {
        cleanupDownedKeys(timeStamp - prevTimeStamp);

        prevTimeStamp = timeStamp;

        window.requestAnimationFrame(onAnimationFrame);
    }

    window.requestAnimationFrame(onAnimationFrame);
}());

// Special keys found in Windows and MacOS.
const metaKeyNamesDict = {
    'select key': true,
    'left window key': true
};

const shortcutKeyNamesDict = {
    'alt': true,
    'ctrl': true,
    'shift': true,
    'select key': true,
    'left window key': true
};

const shortcutKeyCodesDict = {
    '16': true,
    '17': true,
    '18': true,
    '91': true,
    '93': true
};

// Find key codes with key names.
const keyCodesDict = {
    'backspace'         : '8'  ,
    'tab'               : '9'  ,
    'enter'             : '13' ,
    'shift'             : '16' ,
    'ctrl'              : '17' ,
    'alt'               : '18' ,
    'pause/break'       : '19' ,
    'caps lock'         : '20' ,
    'escape'            : '27' ,
    'spacebar'          : '32' ,
    'page up'           : '33' ,
    'page down'         : '34' ,
    'end'               : '35' ,
    'home'              : '36' ,
    'left arrow'        : '37' ,
    'up arrow'          : '38' ,
    'right arrow'       : '39' ,
    'down arrow'        : '40' ,
    'insert'            : '45' ,
    'delete'            : '46' ,
    '0'                 : '48' ,
    '1'                 : '49' ,
    '2'                 : '50' ,
    '3'                 : '51' ,
    '4'                 : '52' ,
    '5'                 : '53' ,
    '6'                 : '54' ,
    '7'                 : '55' ,
    '8'                 : '56' ,
    '9'                 : '57' ,
    'a'                 : '65' ,
    'b'                 : '66' ,
    'c'                 : '67' ,
    'd'                 : '68' ,
    'e'                 : '69' ,
    'f'                 : '70' ,
    'g'                 : '71' ,
    'h'                 : '72' ,
    'i'                 : '73' ,
    'j'                 : '74' ,
    'k'                 : '75' ,
    'l'                 : '76' ,
    'm'                 : '77' ,
    'n'                 : '78' ,
    'o'                 : '79' ,
    'p'                 : '80' ,
    'q'                 : '81' ,
    'r'                 : '82' ,
    's'                 : '83' ,
    't'                 : '84' ,
    'u'                 : '85' ,
    'v'                 : '86' ,
    'w'                 : '87' ,
    'x'                 : '88' ,
    'y'                 : '89' ,
    'z'                 : '90' ,
    'left window key'   : '91' ,
    'right window key'  : '92' ,
    'select key'        : '93' ,
    'numpad 0'          : '96' ,
    'numpad 1'          : '97' ,
    'numpad 2'          : '98' ,
    'numpad 3'          : '99' ,
    'numpad 4'          : '100',
    'numpad 5'          : '101',
    'numpad 6'          : '102',
    'numpad 7'          : '103',
    'numpad 8'          : '104',
    'numpad 9'          : '105',
    'multiply'          : '106',
    'add'               : '107',
    'subtract'          : '109',
    'decimal point'     : '110',
    'divide'            : '111',
    'f1'                : '112',
    'f2'                : '113',
    'f3'                : '114',
    'f4'                : '115',
    'f5'                : '116',
    'f6'                : '117',
    'f7'                : '118',
    'f8'                : '119',
    'f9'                : '120',
    'f10'               : '121',
    'f11'               : '122',
    'f12'               : '123',
    'num lock'          : '144',
    'scroll lock'       : '145',
    'semi-colon'        : '186',
    'equal sign'        : '187',
    'comma'             : '188',
    'dash'              : '189',
    'period'            : '190',
    'forward slash'     : '191',
    'grave accent'      : '192',
    'open bracket'      : '219',
    'back slash'        : '220',
    'close bracket'     : '221',
    'single quote'      : '222'
};

// Find key names with key codes.
const keyNamesDict = {
    '8'  :      'backspace'       ,
    '9'  :      'tab'             ,
    '13' :      'enter'           ,
    '16' :      'shift'           ,
    '17' :      'ctrl'            ,
    '18' :      'alt'             ,
    '19' :      'pause/break'     ,
    '20' :      'caps lock'       ,
    '27' :      'escape'          ,
    '32' :      'spacebar'        ,
    '33' :      'page up'         ,
    '34' :      'page down'       ,
    '35' :      'end'             ,
    '36' :      'home'            ,
    '37' :      'left arrow'      ,
    '38' :      'up arrow'        ,
    '39' :      'right arrow'     ,
    '40' :      'down arrow'      ,
    '45' :      'insert'          ,
    '46' :      'delete'          ,
    '48' :      '0'               ,
    '49' :      '1'               ,
    '50' :      '2'               ,
    '51' :      '3'               ,
    '52' :      '4'               ,
    '53' :      '5'               ,
    '54' :      '6'               ,
    '55' :      '7'               ,
    '56' :      '8'               ,
    '57' :      '9'               ,
    '65' :      'a'               ,
    '66' :      'b'               ,
    '67' :      'c'               ,
    '68' :      'd'               ,
    '69' :      'e'               ,
    '70' :      'f'               ,
    '71' :      'g'               ,
    '72' :      'h'               ,
    '73' :      'i'               ,
    '74' :      'j'               ,
    '75' :      'k'               ,
    '76' :      'l'               ,
    '77' :      'm'               ,
    '78' :      'n'               ,
    '79' :      'o'               ,
    '80' :      'p'               ,
    '81' :      'q'               ,
    '82' :      'r'               ,
    '83' :      's'               ,
    '84' :      't'               ,
    '85' :      'u'               ,
    '86' :      'v'               ,
    '87' :      'w'               ,
    '88' :      'x'               ,
    '89' :      'y'               ,
    '90' :      'z'               ,
    '91' :      'left window key' ,
    '92' :      'right window key',
    '93' :      'select key'      ,
    '96' :      'numpad 0'        ,
    '97' :      'numpad 1'        ,
    '98' :      'numpad 2'        ,
    '99' :      'numpad 3'        ,
    '100':      'numpad 4'        ,
    '101':      'numpad 5'        ,
    '102':      'numpad 6'        ,
    '103':      'numpad 7'        ,
    '104':      'numpad 8'        ,
    '105':      'numpad 9'        ,
    '106':      'multiply'        ,
    '107':      'add'             ,
    '109':      'subtract'        ,
    '110':      'decimal point'   ,
    '111':      'divide'          ,
    '112':      'f1'              ,
    '113':      'f2'              ,
    '114':      'f3'              ,
    '115':      'f4'              ,
    '116':      'f5'              ,
    '117':      'f6'              ,
    '118':      'f7'              ,
    '119':      'f8'              ,
    '120':      'f9'              ,
    '121':      'f10'             ,
    '122':      'f11'             ,
    '123':      'f12'             ,
    '144':      'num lock'        ,
    '145':      'scroll lock'     ,
    '186':      'semi-colon'      ,
    '187':      'equal sign'      ,
    '188':      'comma'           ,
    '189':      'dash'            ,
    '190':      'period'          ,
    '191':      'forward slash'   ,
    '192':      'grave accent'    ,
    '219':      'open bracket'    ,
    '220':      'back slash'      ,
    '221':      'close bracket'   ,
    '222':      'single quote'
};

}(this)); // end self executing function...
