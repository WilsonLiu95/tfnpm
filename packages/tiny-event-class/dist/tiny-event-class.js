/*!
    * tiny-event-class v1.3.0
    * (c) 2019 wilsonliuxyz@gmail.com
    * @description class tiny event
    * @license MIT
    */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.tinyEventClass = factory());
}(this, (function () { 'use strict';

var TinyEventClass = function TinyEventClass() {
  this._events = {};
};
TinyEventClass.prototype.on = function on (name, callback, ctx) {
  this._events[name] = this._events[name] || [];
  this._events[name].push({
    fn: callback,
    ctx: ctx
  });
  return this;
};
TinyEventClass.prototype.once = function once (name, callback, ctx) {
  var self = this;

  function listener() {
    self.off(name, listener);
    callback.apply(ctx, arguments);
  }

  listener._ = callback;
  return this.on(name, listener, ctx);
};
TinyEventClass.prototype.emit = function emit (name) {
    var args = [], len$1 = arguments.length - 1;
    while ( len$1-- > 0 ) args[ len$1 ] = arguments[ len$1 + 1 ];

  var evtsArr = this._events[name] || [];
  var len = evtsArr.length;
  for (var i = 0; i < len; i++) {
    evtsArr[i].fn.apply(evtsArr[i].ctx, args);
  }

  return this;
};
TinyEventClass.prototype.off = function off (name, callback) {
  var evts = this._events[name];
  var liveEvents = [];

  if (evts && callback) {
    for (var i = 0, len = evts.length; i < len; i++) {
      var event = evts[i];
      if (event.fn !== callback && event.fn._ !== callback)
        { liveEvents.push(event); }
    }
  }
  if (liveEvents.length) {
    this._events[name] = liveEvents;
  } else {
    delete this._events[name];
  }
  return this;
};

return TinyEventClass;

})));
