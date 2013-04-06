/**
 * NanoDB
 * Cross-Platforms Local Database Library
 *
 * Copyright 2012 - 2013
 *
 * Gatekeeper:
 *   Will Wen Gunn (Koicos)
 *   Wiky Chen (Alibaba)
 *
 * Browsers Support:
 *   IE 8/9/10
 *   Chrome
 *   Firefox
 *   Safari
 *   Opera
 *   the modern browsers
 *
 * MIT Licensed
 * 
 */
(function(name, def) {
  var hasDefine  = 'undefined' !== typeof define;
  var hasExports = 'undefined' !== typeof exports;

  if (hasDefine) {
    // CommonJS: SeaJS, RequireJS etc.
    define(name, def);
  } else if (hasExports) {
    // Node.js Module
    exports = def(require, exports, module);
  } else {
    // Normal
    this[key] = def();
  }
})('nano', function(require, exports, module) {
  'use strict';

  var nano = ('undefined' !== typeof exports ? exports : {});

  var jP = JSON.parse;
  var jS = JSON.stringify;

  // Util
  if ('undefined' !== typeof window && 'undefined' !== typeof document) {
    var addEvent = (function(){if(document.addEventListener){return function(el,type,fn){if(el&&el.nodeName||el===window){el.addEventListener(type,fn,false)}else if(el&&el.length){for(var i=0;i<el.length;i++){addEvent(el[i],type,fn)}}}}else{return function(el,type,fn){if(el&&el.nodeName||el===window){el.attachEvent('on'+type,function(){return fn.call(el,window.event)})}else if(el&&el.length){for(var i=0;i<el.length;i++){addEvent(el[i],type,fn)}}}}})();
  }
  function isArray(ar){return Array.isArray(ar)||(typeof ar==='object'&&ar.toLocalString()==='[object Array]');}

  // Navite Store Interface
  function memStore () {}
  memStore.prototype.get = function(key) {
    if (sS) {
      return sS.getItem(key);
    } else {
      return false;
    }
  };
  memStore.prototype.set = function(key, value) {
    if (sS) {
      return sS.setItem(key, value);
    } else {
      return false;
    }
  };
  memStore.prototype.remove = function(key) {
    if (sS) {
      return sS.removeItem(key);
    } else {
      return false;
    }
  };

  function localStore () {}
  localStore.prototype.get = function(key) {
    if (lS) {
      return lS.getItem(key);
    } else {
      return false;
    }
  };
  localStore.prototype.set = function(key, value) {
    if (lS) {
      return lS.setItem(key, value);
    } else {
      return false;
    }
  };
  localStore.prototype.remove = function(key) {
    if (lS) {
      return lS.removeItem(key);
    } else {
      return false;
    }
  };

  var lS = ('undefined' !== typeof localStorage ? localStorage : null);
  var sS = ('undefined' !== typeof sessionStorage ? sessionStorage : null);
  var cP = escape;
  var uCP = unescape;

  var btoa = ('undefined' !== typeof btoa ? btoa : function(str) {
    try {
      return (new Buffer(str)).toString('base64');
    } catch(err) {
      return '';
    }
  });
  var atob = ('undefined' !== typeof atob ? atob : function(str) {
    try {
      return (new Buffer(str, 'base64')).toString();
    } catch(err) {
      return '';
    }
  });

  nano.memStore = memStore;
  nano.localStore = localStore;
  nano.dbs = {};

  /**
   * Fetch a new or existing nano database
   * @param  {String} dbName the name of the database you wanted to fetch
   * @return {nanoDB}        the database
   *
   * var myapp = nano.db('myapp');
   * 
   */
  nano.db = function(dbName, option) {
    option = option || { store: new localStore };
    var db = new nanoDB(dbName, option);
    nano.dbs[dbName] = db;
    return db;
  };

  /**
   * Nano Database Class
   * @param {String} dbName the name of the database you wanted to fetch
   *
   * var myapp = new nanoDB('myapp');
   * 
   */
  function nanoDB(dbName, option) {
    this.name = dbName;
    this.option = option;
  }

  nanoDB.prototype.on = function(event, fn) {
    if (!this._events) this._events = {};
    if (!this._events[event]) return this._events[event] = [fn];
    this._events[event].push(event);

    return this;
  };

  nanoDB.prototype.emit = function() {
    var event = arguments[0];
    if (!this._events) return false;
    var handler = this._events[event];
    if (!handler) return false;

    if (isArray(handler)) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) {
        args[i - 1] = arguments[i];
      }
      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
      return true;
    } else {
      return false;
    }
  };

  /**
   * Fetch a new or existing nano collection of the database.
   * @param {String} collName the name of the collection you wanted to fetch
   * @return {nanoCollection} the collection
   *
   * var items = myapp.collection('items');
   * 
   */
  nanoDB.prototype.collection = function(collName) {
    var collection = new nanoCollection(collName, this.name);
    if (!this.collections) this.collections = {};
    this.collections[collName] = collection;
    return collection;
  };

  /**
   * Nano Collection Class
   * @param  {String} collName the name of the collection you wanted to fetch
   * @param {String} dbName the parent database of the collection you wanted to fetch
   *
   * var items = new nanoCollection('items', 'myapp');
   * 
   */
  function nanoCollection (collName, dbName) {
    var self = this;

    self.name = collName;
    self.parent = dbName;
    var store = nano.dbs[dbName].option.store;

    if (store.async) {
      store.get('nano-' + dbName + '-' + collName, function(err, value) {
        if (err || !value) {
          store.set('nano-' + dbName + '-' + collName, btoa(cP('{}')), function(err) {
            if (err)
              return;

            self.collection = {};
            store.set('nano-' + dbName + '-' + collName + '-indexes', btoa(cP('[]')), function(err) {
              if (err)
                return;

              self.indexes = [];
              self.emit('ready');
            });
          });
        } else {
          self.collection = JSON.parse(uCP(atob(value)));
          store.get('nano-' + dbName + '-' + collName + '-indexes', function(err, value) {
            if (err)
              return;

            self.indexes = JSON.parse(uCP(atob(value)));
            self.emit('ready');
          });
        }
      });
    } else {
      if (store.get('nano-' + dbName + '-' + collName)) {
        self.collection = jP(uCP(atob(store.get('nano-' + dbName + '-' + collName))));
        self.indexes    = jP(uCP(atob(store.get('nano-' + dbName + '-' + collName + '-indexes'))));
      } else {
        self.collection = {};
        self.indexes    = [];
        store.set('nano-' + dbName + '-' + collName, btoa(cP('{}')));
        store.set('nano-' + dbName + '-' + collName + '-indexes', btoa(cP('[]')));
      }
    }
  }

  /**
   * Find items in the collection
   * @param {Object} selector the items selector
   * @param {Object} options the query option
   * @param {Function} callback the query callback
   *
   * //Callback
   * items.find({ foo: "bar" }, function(err, resItems) {
   *     if (err) return console.log('Not found!');
   *     console.log(resItems);
   * });
   *
   * //Cursor
   * items.find({ foo: "bar" }).sort(...).skip(...).limit(...).toArray(function(err, resItems) {
   *     if (err) return console.log('Not found!');
   *     console.log(resItems);
   * });
   * 
   */
  nanoCollection.prototype.find = function() {
    var callback = typeof arguments[arguments.length - 1] == 'function' ? arguments[arguments.length - 1] : false;
    var selector = typeof arguments[0] == 'object' ? arguments[0] : {};
    var options = arguments.length > 2 ? arguments[1] : {};

    var results = [];
    var resultIndexs = [];

    function check (item, _id) {
      if (jS(selector) === '{}') return true;
      if (selector._id === _id) return true;
      for (var key in selector) {
        if (item[key] !== selector[key]) return false;
      }
      return true;
    }

    for (var i = 0; i < this.indexes.length; i++) {
      if (check(this.collection[this.indexes[i]], this.indexes[i])) {
        results.push(this.collection[this.indexes[i]]);
        resultIndexs.push(this.indexes[i]);
      }
    }

    if (callback) {
      if (results.length !== 0) {
        for (var i = 0; i < results.length; i++) {
          results[i]._id = resultIndexs[i];
        }
        callback(null, results);
      } else {
        callback(new Error('Not item found.'));
      }
    } else {
      if (results.length !== 0) {
        for (var i = 0; i < results.length; i++) {
          results[i]._id = resultIndexs[i];
        }
        return new nanoCursor(results, this.name);
      } else {
        return new nanoCursor([], this.name);
      }
    }
  };

  nanoCollection.prototype.findOne = function() {
    var selector = typeof arguments[0] == 'object' ? arguments[0] : {};
    var options = arguments.length > 2 ? arguments[1] : {};
    var callback = arguments[arguments.length - 1];

    var result = null;

    function check (item, _id) {
      if (jS(selector) === '{}') return true;
      if (selector._id === _id) return true;
      for (var key in selector) {
        if (item[key] !== selector[key]) return false;
      }
      return true;
    }

    for (var i = 0; i < this.indexes.length; i++) {
      if (check(this.collection[this.indexes[i]], this.indexes[i])) {
        result = this.collection[this.indexes[i]];
        result._id = this.indexed[i];
        break;
      }
    }

    if (result) {
      callback(null, result);
    } else {
      callback(new Error('Not item found.'));
    }

    return this;
  };

  nanoCollection.prototype.findById = function(_id, callback) {
    if (this.indexes.indexOf(_id) !== -1) {
      var doc = this.collection[_id];
      doc._id = _id;
      return callback(null, doc);
    } else {
      callback(new Error('Not item found.'));
    }

    return this;
  };

  nanoCollection.prototype.insert = function(doc, callback) {
    var self = this;
    var store = nano.dbs[this.parent].option.store;
    var last = this.indexes[this.indexes.length - 1];
    if (last) {
      var theNew = last.substr(0, last.length - 1) + (Number(last.substr(last.length - 1)) + 1);
    } else {
      var theNew = btoa('nano' + this.name) + Math.random().toString().substr(2) + '0';
    }

    self.indexes.push(theNew);
    self.collection[theNew] = doc;

    if (store.async) {
      store.set('nano-' + self.parent + '-' + self.name, btoa(cP(jS(self.collection))), function(err) {
        if (err)
          return self.emit('error', err);

        store.set('nano-' + self.parent + '-' + self.name + '-indexes', btoa(cP(jS(self.indexes))), function(err) {
          if (err)
            return self.emit('error', err);

          callback();
        });
      });
    } else {
      store.set('nano-' + self.parent + '-' + self.name, btoa(cP(jS(self.collection))));
      store.set('nano-' + self.parent + '-' + self.name + '-indexes', btoa(cP(jS(self.indexes))));
      callback();
    }
    self.emit('insert', doc);
    return self;
  };

  nanoCollection.prototype.update = function() {
    var self = this;
    var store = nano.dbs[this.parent].option.store;
    var spec = arguments[0];
    var doc = arguments[1];
    var callback = arguments[arguments.length - 1];
    var options = (arguments.length === 4 ? arguments[2] : {});
    
    self.findOne(spec, function (err, item) {
      if (err) return callback(err);
      for (var key in doc) {
        item[key] = doc[key];
      }
      self.collection[item._id] = item;

      if (store.async) {
        store.set('nano-' + self.parent + '-' + self.name, btoa(cP(jS(self.collection))), function(err) {
          if (err)
            return self.emit('error', err);

          store.set('nano-' + self.parent + '-' + self.name + '-indexes', btoa(cP(jS(self.indexes))), function(err) {
            if (err)
              return self.emit('error', err);

            callback(null, item);
          });
        });
      } else {
        store.set('nano-' + self.parent + '-' + self.name, btoa(cP(jS(self.collection))));
        store.set('nano-' + self.parent + '-' + self.name + '-indexes', btoa(cP(jS(self.indexes))));
        callback(null, item);
      }
      self.emit('update', item);
    });

    return self;
  };

  // TODO
  // nanoCollection.prototype.findAndModify = function() {
  //   var query = arguments[0];
  //   var sort = arguments[1];
  //   var update = arguments[2];
  //   var callback = arguments[arguments.length - 1];
  //   var options = (arguments.length === 5 ? arguments[3] : {});
  //   var self = this;

  //   this.find().sort(sort).toArray(function(err, collection) {
  //     if (err) return callback(err);

  //     var indexes = [];
  //     for (var i = 0; i < collection.length; i++) {
  //       indexes.push(collection[i]._id);
  //     }
  //     var newCollection = new nanoCollection(collection, indexes);

  //     newCollection.findOne(query, function (err, item) {
  //       if (err) return callback(err);

  //       self.update(item, update, options, callback);
  //     });
  //   });

  //   return this;
  // };

  nanoCollection.prototype.remove = function(selector) {
    var callback = typeof arguments[arguments.length - 1] == 'function' ? arguments[arguments.length - 1] : noop;
    selector = selector || {};

    var store = nano.dbs[this.parent].option.store;

    function check (item) {
      if (jS(selector) === '{}') return true;
      for (var key in selector) {
        if (item[key] !== selector[key]) return false;
      }
      return true;
    }

    var res = [];

    var i = 0;
    var f = this.indexes.length;
    for (var i = f - 1; i >= 0; i--) {
      if (check(this.collection[this.indexes[i]])) {
        var t = this.collection[this.indexes[i]];
        t._id = this.indexes[i];
        res.push(t);
        t = null;
        delete this.collection[this.indexes[i]];
        this.indexes.splice(i, 1);
      }
    }
    if (i == 0) return callback(new Error('Not items matched'));

    if (store.async) {
      store.set('nano-' + this.parent + '-' + this.name, btoa(cP(jS(this.collection))), function(err) {
        if (err)
          return self.emit('error', err);

        store.set('nano-' + this.parent + '-' + this.name + '-indexes', btoa(cP(jS(this.indexes))), function(err) {
          if (err)
            return self.emit('error', err);

          callback(null, item);
        });
      });
    } else {
      store.set('nano-' + this.parent + '-' + this.name, btoa(cP(jS(this.collection))));
      store.set('nano-' + this.parent + '-' + this.name + '-indexes', btoa(cP(jS(this.indexes))));
      if (callback) callback(null, res);
    }
    this.emit('remove', res);

    return this;
  };

  nanoCollection.prototype.on = function(event, fn) {
    if (!this._events) this._events = {};
    if (!this._events[event]) return this._events[event] = [fn];
    this._events[event].push(event);

    return this;
  };

  nanoCollection.prototype.emit = function() {
    var event = arguments[0];
    if (!this._events) return false;
    var handler = this._events[event];
    if (!handler) return false;

    if (isArray(handler)) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) {
        args[i - 1] = arguments[i];
      }
      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
      return true;
    } else {
      return false;
    }
  };


  nanoCollection.prototype.toJSON = function() {
    var json = [];
    for (var i = 0; i < this.indexes.length; i++) {
      var tmp = this.collection(this.indexes[i]);
      tmp.id = this.indexes[i];
      json.push(tmp);
    }
    return json;
  };

/*  if ('undefined' !== typeof window && 'undefined' !== typeof document) {
    addEvent(window, 'storage', function(evt) {
      if (!/^nano/.test(evt.key)) {
        return;
      } else if (/^nano-([\w]+)-([\w]+)-indexes$/.test(evt.key)) {
        var foo = evt.key.match(/nano-([\w]+)-([\w]+)/);
        var dbName = foo[1];
        var collname = foo[2];
        var collection = jP(uCP(atob(store.get('nano-' + dbName + '-' + collName))));
        var indexes = jP(uCP(atob(store.get('nano-' + dbName + '-' + collName + '-indexes'))));
        var theNew = collection[indexes[indexes.length - 1]];
        theNew._id = indexes[indexes.length - 1];
        nano.dbs[dbName].collections[collname].emit('storage', theNew);
      } else {
        return;
      }
    });
  }*/


  function nanoCursor (collection, collName) {
    this.collection = collection;
    this.parent = collName;
  }

  nanoCursor.prototype.toArray = function(callback) {
    if (this.collection.length !== 0) {
      callback(null, this.collection);
    } else {
      callback(new Error('Not item found.'));
    }

    return this;
  };
  nanoCursor.prototype.limit = function(count) {
    this.collection = this.collection.slice(0, count);

    return this;
  };
  nanoCursor.prototype.sort = function(option) {
    for (var key in option) {
      this.collection.sort(function(a, b) {
        if (option[key] == -1) {
          return a[key] < b[key] ? 1 : -1;
        } else {
          return a[key] > b[key] ? 1 : -1;
        }
      });
    }

    return this;
  };
  nanoCursor.prototype.skip = function(count) {
    this.collection = this.collection.splice(conunt);

    return this;
  };
  nanoCursor.prototype.each = function(fn) {
    this.collection.forEach(fn);

    return this;
  };

  nano.on = function(event, fn) {
    if (!this._events) this._events = {};
    if (!this._events[event]) return this._events[event] = [fn];
    this._events[event].push(event);

    return this;
  };

  nano.emit = function() {
    var event = arguments[0];
    if (!this._events) return false;
    var handler = this._events[event];
    if (!handler) return false;

    if (isArray(handler)) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) {
        args[i - 1] = arguments[i];
      }
      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
      return true;
    } else {
      return false;
    }
  };


  nano.store = new nano.localStore();

  nano.set = function(key, value, callback) {
    if ('undefined' == typeof callback) {
      callback = noop;
    }
    var store = this.store;

    if (store.async) {
      store.set(key, btoa(cP(jS(value))), function(err) {
        if (err)
          return callback(err);

        callback(null, key, value);
      });
    } else {
      store.set(key, btoa(cP(jS(value))));
      callback(null, key, value);
    }

    return this.emit('set', key, value);
  };

  nano.get = function(key, callback) {
    var store = this.store;

    if (store.async) {
      this.store.get(key, function(err, value) {
        if (err)
          return callback(err);

        callback(null, jP(uCP(atob(value))));
      });
    } else {
      var value = jP(uCP(atob(this.store.get(key))));
      callback(null, value);
    }
  };

  nano.del = function(key, callback) {
    var store = this.store;

    if (store.async) {
      store.remove(key, function(err) {
        if (err)
          return callback(err);

        callback(null, key);
      });
    } else {
      store.remove(key);
      callback(null, key);
    }

    return this.emit('del', key);
  };

  nano.exists = function(key, callback) {
    try {
      this.get(key, function(err, value) {
        if (err || 'undefined' == typeof value) {
          err = err || new Error('This key is not exists.');

          return callback(err, false);
        } else {
          return callback(null, true);
        }
      });
    } catch(err) {
      return callback(err);
    }
  };

  nano.rename = function(key, newKey, callback) {
    try {
      this.exists(key, function(err, exists) {
        if (err || !exists) {
          err = err || new Error('This key is not exists.');

          return callback(err);
        } else {
          this.get(key, function(err, value) {
            if (err)
              return callback(err);

            this.del(key, function(err) {
              if (err)
                return callback(err);

              this.set(newKey, value, callback);
            });
          });
        }
      });
    } catch(err) {
      return callback(err);
    }

    return this.emit('rename', key, newKey);
  };

  function noop() {
    return false;
  }

  return nano;
});