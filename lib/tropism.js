/*
Dependencies:
- bus
- sower
-someway to get to graft. This can cause a circular ref in the require world, but not in the namespace world. Not sure what to do about that
 */

define(['bus'],function(bus){
    var behaviorCache = {};

    function aquire(behaviorName, el, model, callback) {
        if(!behaviorCache[behaviorName]) callback('No such behavior');
        var behaviorClass = behaviorCache[behaviorName];
        var behavior = new behaviorClass(el, model);
        //TODO catch errors and return them to the callback.
        callback(undefined, behavior);
    }

    //TODO A system of providing behaviors should be supported that does not require all behaviors to be loaded. They should register by name or something.

    function has(behaviorName, template) {
        var behavior = Behavior.sub(template);
        behaviorCache[behaviorName] = behavior;
    }


    var __indexOf = [].indexOf || function(item) {
        for (var i = 0, l = this.length; i < l; i++) {
            if (i in this && this[i] === item) return i;
        }
        return -1;
    }

    var __slice = [].slice;
    var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
    var __hasProp = {}.hasOwnProperty
    var __extends = function(child, parent) {
        for (var key in parent)
        {
            if (__hasProp.call(parent, key)) child[key] = parent[key];
        }

        function ctor() { this.constructor = child; }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
    }

    var Events = {
        bind: function(ev, callback) {
            var calls, evs, name, _i, _len;
            evs = ev.split(' ');
            calls = this.hasOwnProperty('_callbacks') && this._callbacks || (this._callbacks = {});
            for (_i = 0, _len = evs.length; _i < _len; _i++) {
                name = evs[_i];
                calls[name] || (calls[name] = []);
                calls[name].push(callback);
            }
            return this;
        },
        one: function(ev, callback) {
            return this.bind(ev, function() {
                this.unbind(ev, arguments.callee);
                return callback.apply(this, arguments);
            });
        },
        trigger: function() {
            var args, callback, ev, list, _i, _len, _ref;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            ev = args.shift();
            list = this.hasOwnProperty('_callbacks') && ((_ref = this._callbacks) != null ? _ref[ev] : void 0);
            if (!list) {
                return;
            }
            for (_i = 0, _len = list.length; _i < _len; _i++) {
                callback = list[_i];
                if (callback.apply(this, args) === false) {
                    break;
                }
            }
            return true;
        },
        unbind: function(ev, callback) {
            var cb, i, list, _i, _len, _ref;
            if (!ev) {
                this._callbacks = {};
                return this;
            }
            list = (_ref = this._callbacks) != null ? _ref[ev] : void 0;
            if (!list) {
                return this;
            }
            if (!callback) {
                delete this._callbacks[ev];
                return this;
            }
            for (i = _i = 0, _len = list.length; _i < _len; i = ++_i) {
                cb = list[i];
                if (!(cb === callback)) {
                    continue;
                }
                list = list.slice();
                list.splice(i, 1);
                this._callbacks[ev] = list;
                break;
            }
            return this;
        }
    };

    var Log = {
        trace: true,
        logPrefix: '(App)',
        log: function() {
            var args;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            if (!this.trace) {
                return;
            }
            if (this.logPrefix) {
                args.unshift(this.logPrefix);
            }
            if (typeof console !== "undefined" && console !== null) {
                if (typeof console.log === "function") {
                    console.log.apply(console, args);
                }
            }
            return this;
        }
    };

    var moduleKeywords = ['included', 'extended'];
    var Module = (function() {

        Module.include = function(obj) {
            var key, value, _ref;
            if (!obj) {
                throw new Error('include(obj) requires obj');
            }
            for (key in obj) {
                value = obj[key];
                if (__indexOf.call(moduleKeywords, key) < 0) {
                    this.prototype[key] = value;
                }
            }
            if ((_ref = obj.included) != null) {
                _ref.apply(this);
            }
            return this;
        };

        Module.extend = function(obj) {
            var key, value, _ref;
            if (!obj) {
                throw new Error('extend(obj) requires obj');
            }
            for (key in obj) {
                value = obj[key];
                if (__indexOf.call(moduleKeywords, key) < 0) {
                    this[key] = value;
                }
            }
            if ((_ref = obj.extended) != null) {
                _ref.apply(this);
            }
            return this;
        };

        Module.proxy = function(func) {
            var _this = this;
            return function() {
                return func.apply(_this, arguments);
            };
        };

        Module.prototype.proxy = function(func) {
            var _this = this;
            return function() {
                return func.apply(_this, arguments);
            };
        };

        function Module() {
            if (typeof this.init === "function") {
                this.init.apply(this, arguments);
            }
        }
        return Module;
    })();

    /*
     TODO:
     -Register busevents
     -place
     -rerender
     -remove
     */
    var Behavior = (function(_super) {

        __extends(Behavior, _super);

        Behavior.include(Events);

        Behavior.include(Log);

        Behavior.prototype.eventSplitter = /^(\S+)\s*(.*)$/;

        function Behavior(el, model, options) {
            this.release = __bind(this.release, this);
            var key, value, _ref;
            this.options = options;
            _ref = this.options;
            for (key in _ref) {
                value = _ref[key];
                this[key] = value;
            }
            if (!el) {
                throw "Behaviors must have an element to be instantiated"
            }
            this.el = el;
            this.el = $(this.el);
            this.$el = this.el;

            this.model = model;

            //Defaults. If we're not going to expose hierarchies, we don't need this
            if (!this.domevents) {
                this.domevents = this.constructor.domevents;
            }
            if (!this.elements) {
                this.elements = this.constructor.elements;
            }

            //Setup
            this.delegateDomEvents();
            this.registerBusEvents();
            this.refreshElements();
            //Not sure why this comes after everything else, rather than before, like you'd expect with a super constructor ref
            Behavior.__super__.constructor.apply(this, arguments);
        }

        Behavior.prototype.rerender = function() {
            var _this = this;
            var seedName = this.seed;
            var seed = sower.aquire(seedName).create(this.model);
            sower.materialize(seed).done(function(out){
                var newElement = $(out);
                _this.el.replaceWith(newElement);

                //Switch to the new element
                if(_this.el && _this.el.remove) _this.el.remove();
                _this.el = newElement;
                _this.$el = newElement;
                _this.delegateDomEvents();
                _this.refreshElements();
                graft.scan(newElement); //Currently scan does not scan the root object passed in, so we're safe from double-rendering. Graft double-render protection should fix this anyway.
            });
        },

            /*
             Place will spin up the seed into a dom element (with the given seedName and data) and then
             hand the element to you in a callback that will allow you to place it in the HTML. Place will
             then graft the new element into behaviors.
             */
            Behavior.prototype.place = function(seedName, data, callback) {
                var _this = this;
                sower.materialize(sower.aquire(seedName).create(data)).done(function(out){
                    var el = $(out);
                    callback(el);
                    graft.scan(el)
                    graft.graft(el)  //Also attempt to attach this object itself. TODO: Maybe this should be part of scan. If so, it may break re-render
                }).fail(function(err){
                        //TODO Log the error
                        console.log(err);
                    });
            },

            //Do we still want behaviors to be event sources? Or allow release?
            Behavior.prototype.release = function() {
                this.trigger('release');
                this.el.remove();
                return this.unbind();
            };

        // This is giving us a special jQuery shortcut that is scoped to the current element. :)
        Behavior.prototype.$ = function(selector) {
            return $(selector, this.el);
        };

        Behavior.prototype.byid = function(p1) {
            if(_.isObject(p1)) return p1.id == this.model.id;
            return this.model.id == p1;
        }

        Behavior.prototype.registerBusEvents = function() {
            if(!this.busevents) return;
            var _this = this;
            for(key in this.busevents) {
                var method = this.busevents[key];
                if (typeof method !== 'function') {
                    var filters = _(method.split(' ')).map(function(filter){
                        if(!_this[filter]) { throw new Error("" + filter + " doesn't exist"); }
                        if(typeof _this[filter] !== 'function') { throw new Error("" + filter + " isn't a function"); }
                        return _this[filter];
                    });
                    //Call each indivdual handler, unless one in the chain returns false
                    method = (function(filters){ //Scoping the closure (so it doesn't change after iteration)
                        return function(){
                            var params = arguments;
                            return _(filters).all(function(filter){
                                return filter.apply(_this, params);  //Todo. It's likely that the handler will also want this.event. Pass that along too.
                            });
                        }
                    })(filters);
                }
                bus.on(key,method);
            }
        },

            Behavior.prototype.delegateDomEvents = function() {
                if(!this.domevents) return;
                var eventName, key, match, method, selector, _this = this;
                //_: Use each
                for (key in this.domevents) {
                    method = this.domevents[key];
                    //First, pull out a this-preserving version of the function
                    if (typeof method === 'function') { //_:isFunction
                        method = (function(method) {  //_:bind
                            return function() {
                                method.apply(_this, arguments);
                                return true;
                            };
                        })(method);
                    } else {
                        if (!this[method]) {
                            throw new Error("" + method + " doesn't exist");
                        }
                        method = (function(method) { //_:bind
                            return function() {
                                _this[method].apply(_this, arguments);
                                return true;
                            };
                        })(method);
                    }
                    //Parse the key to get the event name, and the selector
                    match = key.match(this.eventSplitter);
                    eventName = match[1];
                    selector = match[2];
                    if (selector === '') {
                        this.el.bind(eventName, method)
                    } else {
                        this.el.delegate(selector, eventName, method) //$:Use the new delegation syntax
                    }
                }
            };

        Behavior.prototype.refreshElements = function() {
            if(!this.elements) return;
            var key, value, _ref;
            _ref = this.elements;
            for (key in _ref) {
                value = _ref[key];
                this[key] = this.$(value);
            }
        };

        return Behavior;

    })(Module);

    Module.create = Module.sub = Behavior.create = Behavior.sub = function(instances, statics) {
        var result;
        result = (function(_super) {

            __extends(result, _super);

            function result() {
                return result.__super__.constructor.apply(this, arguments);
            }

            return result;

        })(this);
        if (instances) {
            result.include(instances);
        }
        if (statics) {
            result.extend(statics);
        }
        if (typeof result.unbind === "function") {
            result.unbind();
        }
        return result;
    };

    return {
        has: has,
        aquire: aquire
    };
});

