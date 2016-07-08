/**
 * @class Oskari
 *
 * Oskari
 *
 * A set of methods to support loosely coupled classes and instances for the
 * mapframework
 *
 * @to-do - class instance checks against class metadata - protocol
 *        implementation validation
 *
 * 2014-09-25 additions
 * - added documentation
 * - backported cleaned up version from O2
 * - dead code elimination
 * - linted
 * - marked private functions
 * - reordered
 * - sensible/descriptive naming
 * - added type checks to arguments
 *
 * 2012-11-30 additions
 * - dropped compatibility for pre 2010-04 classes
 * - removed fixed root package requirement 'Oskari.' - implementing namespaces
 * - inheritance with extend() or extend: [] meta
 * - inheritance implemented as a brutal copy down of super clazz methods
 * - super clazz constructors applied behind the scenes in top-down order
 * - this implementation does *not* implement native js  instanceof for class hierarchies
 * - inheritance supports pushing down new method categories applied to super classes
 * - this implementation does not provide super.func() calls - may be added at a later stage
 *
 */
Oskari = (function () {
    var oskariVersion = "1.38.0";

    var isDebug = false,
        isConsole = window.console && window.console.debug,
        logMsg = function (msg) {
            if (!isDebug) {
                return;
            }

            if (!isConsole) {
                return;
            }
            window.console.debug(msg);

        };


    //mode has no effect since require loader
    var mode = 'default';

    /**
     * singleton instance of the class system
     */
    var class_singleton = new O2ClassSystem(),
        cs = class_singleton;

    /* legacy Bundle_manager */

    /**
     * @singleton @class Oskari.Bundle_manager
     */
    var Bundle_manager = function () {
        var me = this;
        me.serial = 0;
        me.bundleDefinitions = {};
        me.sources = {};
        me.bundleInstances = {};
        me.bundles = {};

        /*
         * CACHE for lookups state management
         */
        me.bundleDefinitionStates = {};

        me.bundleSourceStates = {};

        /* CACHE for statuses */
        me.bundleStates = {};

        me.loaderStateListeners = [];
    };

    Bundle_manager.prototype = {

        /**
         * @private @method _getSerial
         *
         *
         * @return {number}
         */
        _getSerial: function () {
            this.serial += 1;
            return this.serial;
        },

        /**
         * @private @method _purge
         */
        _purge: function () {
            var p,
                me = this;

            for (p in me.sources) {
                if (me.sources.hasOwnProperty(p)) {
                    delete me.sources[p];
                }
            }
            for (p in me.bundleDefinitionStates) {
                if (me.bundleDefinitionStates.hasOwnProperty(p)) {
                    delete me.bundleDefinitionStates[p].loader;
                }
            }
            for (p in me.bundleSourceStates) {
                if (me.bundleSourceStates.hasOwnProperty(p)) {
                    delete me.bundleSourceStates[p].loader;
                }
            }
        },

        /**
         * @public @method log
         * A logging and debugging function
         *
         * @param {string} message Message
         *
         */
        log: function (message) {
            logMsg(message);

        },

        /**
         * @private @method _install
         * installs bundle
         * DOES not INSTANTIATE only register bundleDefinition as function
         * declares any additional sources required
         *
         * @param {string}   biid             Bundle implementation id
         * @param {function} bundleDefinition Bundle registration function
         * @param {Object}   srcFiles         Source files
         * @param {Object}   bundleMetadata   Bundle metadata
         *
         */
        _install: function (biid, bundleDefinition, srcFiles, bundleMetadata) {
            var me = this,
                defState = me.bundleDefinitionStates[biid];

            if (defState) {
                defState.state = 1;
                me.log('SETTING STATE FOR BUNDLEDEF ' + biid +
                    ' existing state to ' + defState.state);
            } else {
                defState = {
                    state: 1
                };

                me.bundleDefinitionStates[biid] = defState;
                me.log('SETTING STATE FOR BUNDLEDEF ' + biid +
                    ' NEW state to ' + defState.state);
            }
            defState.metadata = bundleMetadata;

            me.bundleDefinitions[biid] = bundleDefinition;
            me.sources[biid] = srcFiles;
            //postChange(null, null, 'bundle_definition_loaded');
        },

        /**
         * @public @method installBundleClass
         * Installs a bundle defined as Oskari native Class.
         *
         * @param {string} biid      Bundle implementation ID
         * @param {string} className Class name
         *
         */
        installBundleClass: function (biid, className) {
            var clazz = Oskari.clazz.create(className);
            if(clazz) {
                // Oskari.bundle is the new registry for requirejs loader
                Oskari.bundle(biid, {
                    clazz : clazz,
                    metadata : cs.getMetadata(className).meta
                });
            }
        },

        /**
         * @public @method installBundleClassInfo
         * Installs a bundle defined as Oskari native Class
         *
         * @param {string} biid      Bundle implementation ID
         * @param {Object} classInfo ClassInfo
         *
         */
        installBundleClassInfo: function (biid, classInfo) {
            var bundleDefinition = cs.getBuilderFromClassInfo(classInfo),
                bundleMetadata = classInfo._metadata,
                sourceFiles = {};

            if (biid === null || biid === undefined) {
                throw new TypeError('installBundleClassInfo(): Missing biid');
            }

            if (classInfo === null || classInfo === undefined) {
                throw new TypeError(
                    'installBundleClassInfo(): Missing classInfo'
                );
            }

            this._install(
                biid,
                bundleDefinition,
                sourceFiles,
                bundleMetadata
            );
        },

        /**
         * @public @method createBundle
         * Creates a Bundle (NOTE NOT an instance of bundle)
         * implid, bundleid most likely same value
         *
         * @param  {string} biid Bundle implementation ID
         * @param  {string} bid  Bundle ID
         *
         * @return {Object}      Bundle
         */
        createBundle: function (biid, bid) {
            var bundle,
                bundleDefinition,
                me = this,
                bundleDefinitionState;

            if (biid === null || biid === undefined) {
                throw new TypeError('createBundle(): Missing biid');
            }

            if (bid === null || bid === undefined) {
                throw new TypeError('createBundle(): Missing bid');
            }

            bundleDefinitionState =
                me.bundleDefinitionStates[biid];

            if (!bundleDefinitionState) {
                throw new Error(
                    'createBundle(): Couldn\'t find a definition for' +
                        ' bundle ' + biid + '/' + bid +
                        ', check spelling and that the bundle has been' +
                        ' installed.'
                );
            }
            bundleDefinition = this.bundleDefinitions[biid];
            // FIXME no alerts please. Throw something or log something.
            if (!bundleDefinition) {
                alert('this.bundleDefinitions[' + biid + '] is null!');
                return;
            }
            bundle = bundleDefinition(bundleDefinitionState);
            this.bundles[bid] = bundle;
            this.bundleStates[bid] = {
                state: true,
                bundlImpl: biid
            };
            //postChange(bundle, null, 'bundle_created');
            return bundle;
        },

        /**
         * @public @method createInstance
         * Creates a bundle instance for previously installed and created bundle
         *
         * @param  {string} bid Bundle ID
         *
         * @return {Object}     Bundle instance
         */
        createInstance: function (bid) {
            // creates a bundle_instance
            // any configuration and setup IS BUNDLE / BUNDLE INSTANCE specific
            // create / config / start / process / stop / destroy ...
            var me = this,
                bundle,
                bundleInstance,
                bundleInstanceId;

            if (bid === null || bid === undefined) {
                throw new TypeError('createInstance(): Missing bid');
            }

            if (!me.bundleStates[bid] ||
                    !me.bundleStates[bid].state) {
                throw new Error(
                    'createInstance(): Couldn\'t find a definition for' +
                        ' bundle ' + bid + ', check spelling' +
                        ' and that the bundle has been installed.'
                );
            }

            bundle = this.bundles[bid];
            if (bundle === null || bundle === undefined) {
                // TODO find out how this could happen, offer a solution
                throw new Error(
                    'createInstance(): Couldn\'t find bundle with id' + bid
                );
            }

            bundleInstance = bundle.create();
            if (bundleInstance === null || bundleInstance === undefined) {
                throw new Error(
                    'createInstance(): Couldn\'t create bundle ' + bid +
                        ' instance. Make sure your bundle\'s create function' +
                        ' returns the instance.'
                );
            }
            bundleInstanceId = me._getSerial().toString();

            this.bundleInstances[bundleInstanceId] = bundleInstance;

            //postChange(bundle, bundleInstance, 'instance_created');
            return bundleInstance;
        },

        /**
         * @private @method _destroyInstance
         * Destroys and unregisters bundle instance
         *
         * @param {string} biid Bundle instance ID
         *
         * @return
         */
        _destroyInstance: function (biid) {
            var bundleInstance;

            if (biid === null || biid === undefined) {
                throw new TypeError('_destroyInstance(): Missing biid');
            }

            bundleInstance = this.bundleInstances[biid];
            this.bundleInstances[biid] = null;
            bundleInstance = null;

            return bundleInstance;
        }
    };

    /**
     * Singleton instance of Oskari.BundleManager manages lifecycle for bundles
     * and bundle instances.
     */
    var bm = new Bundle_manager();
    bm.clazz = cs;

    /**
     * @class Oskari.BundleFacade
     * Pluggable DOM manager. This is the no-op default implementation.
     */
    var fcd = {
        bundles : {},
        bundleInstances : {},
        getBundleInstanceConfigurationByName : function() {
            console.log('config called');
            return {};
        }
    }; //new Bundle_facade(bm);


    var ga = cs._global;

    // Oskari1API

    /**
     * @static @property Oskari
     */
    var Oskari1LegacyAPI = {
        bundle_manager: bm,
        clazz: cs,
        VERSION : oskariVersion,
        markers: [],

        /**
         * @public @method Oskari.$
         *
         *
         * @return {}
         */
        '$': function () {
            return ga.apply(cs, arguments);
        },

        /**
         * @public @static @method Oskari.setLoaderMode
         *
         * @param {string} m Loader mode
         *
         */
        setLoaderMode: function (m) {
            if (typeof m !== 'string') {
                throw new TypeError(
                    'setLoaderMode(): m is not a string'
                );
            }
            mode = m;
        },

        /**
         * @public @method Oskari.getLoaderMode
         *
         *
         * @return {string} Loader mode
         */
        getLoaderMode: function () {
            return mode;
        },

        /**
         * @public @method Oskari.setDebugMode
         *
         * @param {boolean} d Debug mode on/off
         *
         */
        setDebugMode: function (d) {
            if (typeof d !== 'boolean') {
                throw new TypeError(
                    'setDebugMode(): d is not a boolean'
                );
            }
            isDebug = d;
        },

        /**
         * @public @method Oskari.setPreloaded
         * @deprecated No longer has any effect. Remove calls to it. Will be removed in 1.38 or later.
         */
        setPreloaded: function () {
            if(window.console && typeof console.log === 'function') {
                console.log('Oskari.setPreloaded() no longer has any effect and will be removed in future release. Remove calls to it.');
            }
        },

        /**
         * @public @static @method Oskari.purge
         */
        purge: function () {
            bm.purge();
            cs.purge('Oskari');
        },

        /**
         * @public @static @method Oskari.getSandbox
         *
         * @param  {string=} sandboxName Sandbox name
         *
         * @return {Object}              Sandbox
         */
        getSandbox: function (sandboxName) {
            return ga.apply(cs, [sandboxName || 'sandbox']);
        },

        /**
         * @public @static @method Oskari.setSandbox
         *
         * @param  {string=} sandboxName Sandbox name
         * @param  {Object}  sandbox     Sandbox
         *
         * @return
         */
        setSandbox: function (sandboxName, sandbox) {
            return ga.apply(cs, [sandboxName || 'sandbox', sandbox]);
        },

        /**
         * @public @static @method Oskari.setMarkers
         * @param {Array} markers markers
         */
        setMarkers: function(markers) {
            this.markers = markers;
        },
        /**
         * @public @static @method Oskari.getMarkers
         * @return {Array} markers markers
         */
        getMarkers: function() {
            return this.markers || [];
        },
    };

    /* Oskari1BuilderAPI */

    /* Oskari1Builder class module  */

    var oskari1BuilderSerial = (function () {
        var serials = {};
        return {
            get: function (type) {
                if (!serials[type]) {
                    serials[type] = 1;
                } else {
                    serials[type] += 1;
                }
                return serials[type];
            }
        };
    }());

    /* @class Oskari.ModuleSpec
     * Helper class instance of which is returned from oskari 2.0 api
     * Returned class instance may be used to chain class definition calls.
     *
     * @param {Object} classInfo ClassInfo
     * @param {string} className Class name
     *
     */
    cs.define('Oskari.ModuleSpec', function (classInfo, className) {
        this.cs = cs;
        this.classInfo = classInfo;
        this.className = className;

    }, {

        /**
         * @private @method _slicer
         */
        _slicer: Array.prototype.slice,

        /**
         * @method category
         * Adds a set of methods to class
         *
         * @param  {Object}            prototype    Prototype
         * @param  {string}            categoryName Category name
         *
         * @return {Oskari.ModuleSpec}              this
         */
        category: function (prototype, categoryName) {
            var classInfo = cs.category(
                this.className,
                categoryName ||
                    (['__', oskari1BuilderSerial.get('Category')].join('_')),
                prototype
            );
            this.classInfo = classInfo;
            return this;
        },

        /**
         * @method methods
         * Adds a set of methods to class - alias to category
         *
         * @param  {}                  prototype    Prototype
         * @param  {string}            categoryName Category name
         *
         * @return {Oskari.ModuleSpec}              this
         */
        methods: function (prototype, categoryName) {
            var classInfo = cs.category(
                this.className,
                categoryName ||
                    (['__', oskari1BuilderSerial.get('Category')].join('_')),
                prototype
            );
            this.classInfo = classInfo;
            return this;
        },

        /**
         * @method extend
         * Adds inheritance from a base class.
         * Base class can be declared later but must be defined before
         * instantiation.
         *
         * @param  {Object|Object[]}   clazz Class or an array of classes
         *
         * @return {Oskari.ModuleSpec}       this
         */
        extend: function (clazz) {
            var classInfo;

            if (clazz === null || clazz === undefined) {
                throw new TypeError('extend(): Missing clazz');
            }

            classInfo = cs.extend(
                this.className,
                clazz.length ? clazz : [clazz]
            );
            this.classInfo = classInfo;
            return this;
        },

        /**
         * @method create
         * Creates an instance of this clazz
         *
         *
         * @return {Object} Class instance
         */
        create: function () {
            return cs.createWithClassInfo(this.classInfo, arguments);
        },

        /**
         * @method nam
         * Returns the class name
         *
         *
         * @return {string} Class name
         */
        name: function () {
            return this.className;
        },

        /**
         * @method metadata
         * Returns class metadata
         *
         *
         * @return {Object} Class metadata
         */
        metadata: function () {
            return cs.getMetadata(this.className);
        },

        /**
         * @method events
         * Adds a set of event handlers to class
         *
         * @param  {Object}            events Eventhandlers map
         *
         * @return {Oskari.ModuleSpec}        this
         */
        events: function (events) {
            var orgmodspec = this;
            orgmodspec.category({
                eventHandlers: events,
                onEvent: function (event) {
                    var handler = this.eventHandlers[event.getName()];
                    if (!handler) {
                        return;
                    }

                    return handler.apply(this, [event]);
                }
            }, '___events');
            return orgmodspec;
        },

        /**
         * @method requests
         *
         * @param  {Object}            requests Requesthandlers map
         *
         * @return {Oskari.ModuleSpec}          this
         */
        requests: function (requests) {
            var orgmodspec = this;
            orgmodspec.category({
                requestHandlers: requests,
                onRequest: function (request) {
                    var handler = this.requestHandlers[request.getName()];
                    return handler ? handler.apply(this, [request]) : undefined;
                }
            }, '___requests');
            return orgmodspec;
        },

        /**
         * @method builder
         *
         *
         * @return {function}
         */
        builder: function () {
            return cs.getBuilderFromClassInfo(this.classInfo);
        }


    });

    var Oskari1BuilderAPI = Oskari1LegacyAPI;

    /**
     * @public @method cls
     * Entry point to new class API.
     * @see Oskari.ModuleSpec above.
     *
     * @param  {string}   className   Class name
     * @param  {function} constructor Constructor
     * @param  {Object}   proto       Prototype
     * @param  {Object}   metas       Metadata
     *
     * @return {Object}               Class instance
     */
    Oskari1BuilderAPI.cls = function (className, constructor, proto, metas) {
        var classInfo;

        if (!className) {
            className = [
                'Oskari',
                '_',
                oskari1BuilderSerial.get('Class')
            ].join('.');
        } else {
            classInfo = cs.lookup(className);
        }

        if (!(classInfo && classInfo._constructor && !constructor)) {
            classInfo = cs.define(
                className,
                constructor || function () {},
                proto,
                metas || {}
            );
        }

        return cs.create('Oskari.ModuleSpec', classInfo, className);

    };

    /**
     * @public @method loc
     * Oskari1Builder helper to register localisation
     */
    Oskari1BuilderAPI.loc = function () {
        return this.registerLocalization.apply(Oskari1BuilderAPI, arguments);
    };

    /**
     * @public @static @method Oskari.eventCls
     * O2 api for event class
     *
     * @param  {string}   eventName   Event name
     * @param  {function} constructor Constructor
     * @param  {Object}   proto       Prototype
     *
     * @return
     */
    Oskari1BuilderAPI.eventCls = function (eventName, constructor, proto) {
        var className,
            rv;

        if (eventName === null || eventName === undefined) {
            throw new TypeError('eventCls(): Missing eventName');
        }

        className = 'Oskari.event.registry.' + eventName;
        rv = Oskari1BuilderAPI.cls(
            className,
            constructor,
            proto,
            {protocol: ['Oskari.mapframework.event.Event']}
        );

        rv.category({
            getName: function () {
                return eventName;
            }
        }, '___event');

        rv.eventName = eventName;

        return rv;
    };

    /**
     * @public @static @method Oskari.requestCls
     * O2 api for request class
     *
     * @param  {string}   className   Class name
     * @param  {function} constructor Constructor
     * @param  {Object}   proto       Prototype
     *
     * @return {Object}
     */
    Oskari1BuilderAPI.requestCls = function (requestName, constructor, proto) {
        var className,
            rv;

        if (requestName === null || requestName === undefined) {
            throw new TypeError('requestCls(): Missing requestName');
        }

        className = 'Oskari.request.registry.' + requestName;
        rv = Oskari1BuilderAPI.cls(
            className,
            constructor,
            proto,
            {protocol: ['Oskari.mapframework.request.Request']}
        );

        rv.category({
            getName: function () {
                return requestName;
            }
        }, '___request');

        rv.requestName = requestName;

        return rv;
    };

    Oskari1BuilderAPI._baseClassFor = {
        extension: 'Oskari.userinterface.extension.EnhancedExtension',
        bundle: 'Oskari.mapframework.bundle.extension.ExtensionBundle',
        tile: 'Oskari.userinterface.extension.EnhancedTile',
        flyout: 'Oskari.userinterface.extension.EnhancedFlyout',
        view: 'Oskari.userinterface.extension.EnhancedView'
    };

    /**
     * @public @static @method Oskari.extensionCls O2 api for extension classes
     *
     * @param  {string} className Class name
     *
     * @return
     */
    Oskari1BuilderAPI.extensionCls = function (className) {
        if (className === null || className === undefined) {
            throw new TypeError('extensionCls(): Missing className');
        }

        return Oskari1BuilderAPI.cls(className).extend(
            this._baseClassFor.extension
        );
    };

    /**
     * @public @static @method Oskari.bundleCls O2 api for bundle classes
     *
     * @param  {string} bundleId  Bundle ID
     * @param  {string} className Class name
     *
     * @return {Object}           Bundle instance
     */
    Oskari1BuilderAPI.bundleCls = function (bundleId, className) {
        var rv;

        if (className === null || className === undefined) {
            throw new TypeError('bundleCls(): Missing className');
        }

        if (!bundleId) {
            bundleId = (['__', oskari1BuilderSerial.get('Bundle')].join('_'));
        }

        rv = Oskari1BuilderAPI.cls(className, function () {}, {
            update: function () {}
        }, {
            protocol: ['Oskari.bundle.Bundle', this._baseClassFor.bundle],
            manifest: {
                'Bundle-Identifier': bundleId
            }
        });
        bm.installBundleClassInfo(bundleId, rv.classInfo);

        rv.___bundleIdentifier = bundleId;

        rv.loc = function (properties) {
            properties.key = this.___bundleIdentifier;
            Oskari1BuilderAPI.registerLocalization(properties);
            return rv;
        };

        // FIXME instanceId isn't used for anything?
        rv.start = function (instanceId) {
            var bid = this.___bundleIdentifier,
                bundle,
                bundleInstance,
                configProps,
                ip;

            if (!fcd.bundles[bid]) {
                bundle = bm.createBundle(bid, bid);
                fcd.bundles[bid] = bundle;
            }

            bundleInstance = bm.createInstance(bid);
            fcd.bundleInstances[bid] = bundleInstance;

            configProps = fcd.getBundleInstanceConfigurationByName(bid);
            if (configProps) {
                for (ip in configProps) {
                    if (configProps.hasOwnProperty(ip)) {
                        bundleInstance[ip] = configProps[ip];
                    }
                }
            }
            bundleInstance.start();
            return bundleInstance;
        };
        rv.stop = function () {
            var bundleInstance = fcd.bundleInstances[this.___bundleIdentifier];

            return bundleInstance.stop();
        };
        return rv;
    };

    /**
     * @static @method Oskari.flyoutCls
     *
     * @param  {string} className Class name
     *
     * @return
     */
    Oskari1BuilderAPI.flyoutCls = function (className) {
        if (className === null || className === undefined) {
            throw new TypeError('flyoutCls(): Missing className');
        }

        return Oskari1BuilderAPI.cls(className).extend(
            this._baseClassFor.flyout
        );
    };

    /**
     * @static @method Oskari.tileCls
     *
     * @param  {string} className Class name
     *
     * @return
     */
    Oskari1BuilderAPI.tileCls = function (className) {
        if (className === null || className === undefined) {
            throw new TypeError('tileCls(): Missing className');
        }

        return Oskari1BuilderAPI.cls(className).extend(this._baseClassFor.tile);
    };

    /**
     * @static @method Oskari.viewCls
     *
     * @param  {string} className Class name
     *
     * @return
     */
    Oskari1BuilderAPI.viewCls = function (className) {
        if (className === null || className === undefined) {
            throw new TypeError('viewCls(): Missing className');
        }

        return Oskari1BuilderAPI.cls(className).extend(this._baseClassFor.view);
    };

    /**
     * Let's register Oskari as a Oskari global
     */
    ga.apply(cs, ['Oskari', Oskari1LegacyAPI]);

    /*
     * window.bundle = Oskari1LegacyAPI; window.Oskari = Oskari1LegacyAPI;
     */
    return Oskari1LegacyAPI;
}());

