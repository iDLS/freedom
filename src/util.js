/**
 * Helper function for iterating over an array backwards. If the func
 * returns a true value, it will break out of the loop.
 */
function eachReverse(ary, func) {
  if (ary) {
    var i;
    for (i = ary.length - 1; i > -1; i -= 1) {
      if (ary[i] && func(ary[i], i, ary)) {
        break;
      }
    }
  }
}

function hasProp(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Cycles over properties in an object and calls a function for each
 * property value. If the function returns a truthy value, then the
 * iteration is stopped.
 */
function eachProp(obj, func) {
  var prop;
  for (prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      if (func(obj[prop], prop)) {
        break;
      }
    }
  }
}

/**
 * Simple function to mix in properties from source into target,
 * but only if target does not already have a property of the same name.
 * This is not robust in IE for transferring methods that match
 * Object.prototype names, but the uses of mixin here seem unlikely to
 * trigger a problem related to that.
 */
function mixin(target, source, force, deepStringMixin) {
  if (source) {
    eachProp(source, function (value, prop) {
      if (force || !hasProp(target, prop)) {
        if (deepStringMixin && typeof value !== 'string') {
          if (!target[prop]) {
            target[prop] = {};
          }
          mixin(target[prop], value, force, deepStringMixin);
        } else {
          target[prop] = value;
        }
      }
    });
  }
  return target;
}

/**
 * Add 'on' and 'emit' methods to an object, which act as a light weight
 * event handling structure.
 */
function handleEvents(obj) {
  var eventState = {
    listeners: {},
    conditional: [],
    oneshots: {},
    onceConditional: []
  };

  obj['on'] = function(type, handler) {
    if (typeof type === 'function') {
      this.conditional.push([type, handler]);
    } else if (this.listeners[type]) {
      this.listeners[type].push(handler);
    } else {
      this.listeners[type] = [handler];
    }
  }.bind(eventState);

  obj['once'] = function(type, handler) {
    if (typeof type === 'function') {
      this.onceConditional.push([type, handler]);
    } else if (this.oneshots[type]) {
      this.oneshots[type].push(handler);
    } else {
      this.oneshots[type] = [handler];
    }
  }.bind(eventState);

  obj['emit'] = function(type, data) {
    if (this.listeners[type]) {
      for (var i = 0; i < this.listeners[type].length; i++) {
        if (this.listeners[type][i](data) === false) {
          return;
        }
      }
    }
    if (this.oneshots[type]) {
      for (var i = 0; i < this.oneshots[type].length; i++) {
        this.oneshots[type][i](data);
      }
      this.oneshots[type] = [];
    }
    for (var i = 0; i < this.conditional.length; i++) {
      if (this.conditional[i][0](type, data)) {
        this.conditional[i][1](data);
      }
    }
    for (var i = this.onceConditional.length - 1; i >= 0; i--) {
      if (this.onceConditional[i][0](type, data)) {
        var cond = this.onceConditional.splice(i, 1);
        cond[0][1](data);
      }
    }
  }.bind(eventState);
}

/**
 * Determine if execution is working in a web worker,
 * Or a direct browser page.
 */
function isAppContext() {
  return (typeof window === 'undefined');
}

/**
 * Advertise the presence of an active freedom app to initiate interaction
 * with an installled / priveleged freedom context.
 */
function advertise() {
  // TODO: Firefox rejects cross site requests, so this approach will not work.
  // Figure out a new way to advertise to the addon.
  // var xhr = new XMLHttpRequest();
  // xhr.open('GET', 'http://127.3733366/advertise.js', true);
  // window.addEventListener('message', function(m) {
  //   if (m.source == window && m.data.type == 'freedomAdvertisementResponse') {
  //     console.log("Fdom advertisement response");
  //   }
  // });
  // xhr.send();
  // setTimeout(function() {
  //   xhr.abort();
  // }, 50);
  // TODO: Determine a mechanism by which to restrict responses by non-priveledged code.
  if ((location.protocol === 'chrome-extension:' || location.protocol == 'resource:')
      && typeof freedomcfg !== "undefined") {
    freedomcfg(fdom.apis.register.bind(fdom.apis));
  }
}

/**
 * Find all scripts on the given page.
 */
function scripts() {
    return document.getElementsByTagName('script');
}

/**
 * Make a relative URL absolute, based on the current location.
 */
function makeAbsolute(url) {
  var base = location.protocol + "//" + location.host + location.pathname;
  return resolvePath(url, base);
}

/**
 * Resolve a url against a defined base location.
 */
function resolvePath(url, from) {
  var protocols = ["http", "https", "chrome-extension", "resource"];
  for (var i = 0; i < protocols.length; i++) {
    if (url.indexOf(protocols[i] + "://") === 0) {
      return url;
    }
  }

  var dirname = from.substr(0, from.lastIndexOf("/"));
  var protocolIdx = dirname.indexOf("://");
  var pathIdx = protocolIdx + 3 + dirname.substr(protocolIdx + 3).indexOf("/");
  var path = dirname.substr(pathIdx);
  var base = dirname.substr(0, pathIdx);
  if (url.indexOf("/") === 0) {
    return base + url;
  } else {
    return base + path + "/" + url;
  }
}
