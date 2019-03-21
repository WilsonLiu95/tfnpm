# @tencent/tinyevent

灵感来自于 [@tencent/tinyevent](https://www.npmjs.com/package/@tencent/tinyevent)，利用 `ES6` 语法重写了该模块，以方便复用。

压缩文件不到 1KB，gzip后不到 0.5KB

## Install

### tnpm

```shell
tnpm install @tencent/tinyevent --save
```

## Usage

```js
var Emitter = require('@tencent/tinyevent');
var emitter = new Emitter();

emitter.on('some-event', function (arg1, arg2, arg3) {
 //
});

emitter.emit('some-event', 'arg1 value', 'arg2 value', 'arg3 value');
```

## Instance Methods

### on(event, callback[, context])

Subscribe to an event

* `event` - the name of the event to subscribe to
* `callback` - the function to call when event is emitted
* `context` - (OPTIONAL) - the context to bind the event callback to

### once(event, callback[, context])

Subscribe to an event only **once**

* `event` - the name of the event to subscribe to
* `callback` - the function to call when event is emitted
* `context` - (OPTIONAL) - the context to bind the event callback to

### off(event[, callback])

Unsubscribe from an event or all events. If no callback is provided, it unsubscribes you from all events.

* `event` - the name of the event to unsubscribe from
* `callback` - the function used when binding to the event

### emit(event[, arguments...])

Trigger a named event

* `event` - the event name to emit
* `arguments...` - any number of arguments to pass to the event subscribers

## Test and Build

Build (Tests, Browserifies, and minifies)

```
npm install
npm run build
```

Test

```
npm install
npm test
```

## License

[MIT](https://github.com/scottcorgan/@tencent/tinyevent/blob/master/LICENSE)
