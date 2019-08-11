> # tecla
> Keyboard Helper for the Web

&nbsp;

tecla is a small library that mimics desktop shortcut APIs in the browser.

&nbsp;

## API


### Example

```js
// Default context.

// Ommit function bodies for brevity.
function onUpArrowKeyDown (e : KeyboardEvent) {}
function onDownArrowKeyDown (e : KeyboardEvent) {}
function onLeftArrowKeyDown (e : KeyboardEvent) {}
function onRightArrowKeyDown (e : KeyboardEvent) {}

// Unlike other events, multiple downed key listeners can be
// invoked at the same time.
TECLA.listenKeyDown(null, onUpArrowKeyDown, 'up arrow');
TECLA.listenKeyDown(null, onDownArrowKeyDown, 'down arrow');
TECLA.listenKeyDown(null, onLeftArrowKeyDown, 'left arrow');
TECLA.listenKeyDown(null, onRightArrowKeyDown, 'right arrow');

// Using the SHORTCUT_KEY_ROOT constant keeps the sequence compatible
// with multiple platforms.

// Zoom even if the user is typing in a text field by declaring
// ignoreFocusedTextInput true.

TECLA.listenMultiKeyPress(null, onZoom, [TECLA.SHORTCUT_KEY_ROOT, 'equal sign'], true);

// Overlay context.

let overlayPanel = {
    hide: function () {},

    // Latest keyboard event will be the only argument passed in all callbacks.
    onEscapeKeyPress: function (e : KeyboardEvent) {
    	e.preventDefault();

    	this.hide();
    }
};

// By passing the listener as an object instead of null, the callback
// will be invoked with the listeners scope.

// When context name is declared as an non-empty string, method will
// add context if it does not exist and is non-empty string.

TECLA.listenKeyPress(overlayPanel, overlayPanel.onEscapeKeyPress, 'escape', false, 'overlay');

// Only listeners in overlay context will be invoked.
TECLA.setContext('overlay');
```

&nbsp;

### Constants

```js
// Initial context.
TECLA.CONTEXT_NAME_DEFAULT : String

// Keyboard event types.
TECLA.KEY_UP : String
TECLA.KEY_DOWN : String
TECLA.KEY_PRESS : String
TECLA.KEY_MULTI_PRESS : String

// Is command key for MacOS or ctrl key for everything else.
TECLA.SHORTCUT_KEY_ROOT : String
```

&nbsp;

### Methods

__isTextInputFocused__

Check if there is a focused text input element in the DOM. Useful when trying to determine if a keyboard event should not be invoked when user is typing in an text input field.

```js
TECLA.isTextInputFocused () : Boolean
```

__isAnyShortcutKeyDown__

```js
TECLA.isAnyShortcutKeyDown () : Boolean
```

__isMetaOrRootShortcutKeyDown__

```js
TECLA.isMetaOrRootShortcutKeyDown () : Boolean
```

__isAltKeyDown__

```js
TECLA.isAltKeyDown () : Boolean
```

__isCtrlKeyDown__

```js
TECLA.isCtrlKeyDown () : Boolean
```

__isMetaKeyDown__

```js
TECLA.isMetaKeyDown () : Boolean
```

__isShiftKeyDown__

```js
TECLA.isShiftKeyDown () : Boolean
```

__isRootShortcutKeyDown__

```js
TECLA.isRootShortcutKeyDown () : Boolean
```

__isKeyPressLogging__

If enabled, log latest key press event in an easy to read format.

```js
TECLA.isKeyPressLogging () : Boolean
```

__toggleKeyPressLogging__

```js
TECLA.toggleKeyPressLogging ()
```

__enableKeyPressLogging__

```js
TECLA.enableKeyPressLogging ()
```

__disableKeyPressLogging__

```js
TECLA.disableKeyPressLogging ()
```

__isDisabled__

If disabled, listeners will not be invoked.

```js
TECLA.isDisabled () : Boolean
```

__toggleDisable__

```js
TECLA.toggleDisable ()
```

__enable__

```js
TECLA.enable ()
```

__disable__

```js
TECLA.disable ()
```

__hasContext__

```js
TECLA.hasContext (name: String) : Boolean
```

__addContext__

```js
TECLA.addContext (name: String)
```

__setContext__

```js
TECLA.setContext (name: String)
```

__setDefaultContext__

```js
TECLA.setDefaultContext ()
```

__getCurrentContextName__

```js
TECLA.getCurrentContextName () : String
```

__listenKeyUp__

```js
TECLA.listenKeyUp(listener: Object|Null, callback: Function, keyName: String, ignoreFocusedTextInput: Boolean = false, contextName: String = 'default')
```

__stopListeningKeyUp__

```js
TECLA.stopListeningKeyUp(listener: Object|Null, callback: Function, keyName: String, contextName: String = 'default')
```

__listenKeyDown__

```js
TECLA.listenKeyDown(listener: Object|Null, callback: Function, keyName: String, ignoreFocusedTextInput: Boolean = false, contextName: String = 'default')
```

__stopListeningKeyDown__

```js
TECLA.stopListeningKeyDown(listener: Object|Null, callback: Function, keyName: String, contextName: String = 'default')
```

__listenKeyPress__

```js
TECLA.listenKeyPress(listener: Object|Null, callback: Function, keyName: String, ignoreFocusedTextInput: Boolean = false, contextName: String = 'default')
```

__stopListeningKeyPress__

```js
TECLA.stopListeningKeyPress(listener: Object|Null, callback: Function, keyName: String, contextName: String = 'default')
```

__listenMultiKeyPress__

```js
TECLA.listenKeyPress(listener: Object|Null, callback: Function, keyNames: String[], ignoreFocusedTextInput: Boolean = false, contextName: String = 'default')
```

__stopListeningMultiKeyPress__

```js
TECLA.stopListeningKeyPress(listener: Object|Null, callback: Function, keyNames: String[], contextName: String = 'default')
```

__getKeyName__

```js
TECLA.getKeyName (keyCode: Number) : String
```

&nbsp;

### Key Names

All key names and codes used internally.

```js
{
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
}
```
