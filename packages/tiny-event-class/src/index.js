export default class TinyEventClass {
  constructor() {
    this._events = {};
  }
  on(name, callback, ctx) {
    this._events[name] = this._events[name] || [];
    this._events[name].push({
      fn: callback,
      ctx: ctx
    })
    return this;
  }
  once(name, callback, ctx) {
    var self = this;

    function listener() {
      self.off(name, listener);
      callback.apply(ctx, arguments);
    }

    listener._ = callback
    return this.on(name, listener, ctx);
  }
  emit(name, ...args) {
    const evtsArr = this._events[name] || [];
    const len = evtsArr.length;
    for (let i = 0; i < len; i++) {
      evtsArr[i].fn.apply(evtsArr[i].ctx, args);
    }

    return this;
  }
  off(name, callback) {
    const evts = this._events[name];
    var liveEvents = [];

    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        const event = evts[i];
        if (event.fn !== callback && event.fn._ !== callback)
          liveEvents.push(event);
      }
    }
    if (liveEvents.length) {
      this._events[name] = liveEvents
    } else {
      delete this._events[name]
    }
    return this;
  }
}
