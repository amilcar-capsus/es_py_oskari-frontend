goog.provide('ol.source.OskariAsyncTileImage');

goog.require('goog.events.EventType');
goog.require('ol.TileState');
goog.require('ol.proj');
goog.require('ol.source.TileImage');
goog.require('ol.TileRange');

/**
 * @classdesc
 * Base class for sources providing images divided into a tile grid.
 *
 * @constructor
 * @fires ol.source.TileEvent
 * @extends {ol.source.TileImage}
 * @param {olx.source.TileImageOptions} options Image tile options.
 * @api
 */
ol.source.OskariAsyncTileImage = function(options) {
    this.tileLayerCache = {
      /** @export */
      'tileSetIdentifier': 0,
      /** @export */
      'tileInfos': {}
    }
  goog.base(this, {
    attributions: options.attributions,
    extent: options.extent,
    logo: options.logo,
    opaque: options.opaque,
    projection: options.projection,
    state: options.state !== undefined ?
        /** @type {ol.source.State} */ (options.state) : undefined,
    tileGrid: options.tileGrid,
    tileLoadFunction: options.tileLoadFunction ? options.tileLoadFunction : function() {
      // no-op: loading is handled with transport/mediator
    },
    tilePixelRatio: options.tilePixelRatio,
    tileUrlFunction:  function (tileCoord, pixelRatio, projection) {
        var bounds = this.tileGrid.getTileCoordExtent(tileCoord);
        var bboxKey = this.bboxkeyStrip_(bounds);
        var wfsTileCache = this.getWFSTileCache_(),
            layerTileInfos = wfsTileCache.tileInfos,
            tileSetIdentifier = wfsTileCache.tileSetIdentifier;
        layerTileInfos[bboxKey] = { "tileCoord": tileCoord, bounds: bounds, tileSetIdentifier: tileSetIdentifier};
        return bboxKey;
    },
    url: options.url,
    urls: options.urls,
    wrapX: options.wrapX
  });
};
goog.inherits(ol.source.OskariAsyncTileImage, ol.source.TileImage);


/**
 * @api
 */
ol.source.OskariAsyncTileImage.prototype.getTileRangeForExtentAndResolution =  function (extent, resolution) {
    return this.tileGrid.getTileRangeForExtentAndResolution(extent, resolution);
}

/**
 * Strip bbox for unique key because of some inaccucate cases
 * OL computation (init grid in tilesizes)  is inaccurate in last decimal
 * @return {string}
 */
ol.source.OskariAsyncTileImage.prototype.bboxkeyStrip_ =  function (bbox) {
    var stripbox = [];
    if (!bbox) return '';
    for (var i = bbox.length; i--;) {
        stripbox[i] = bbox[i].toPrecision(13);
    }
    return stripbox.join(',');
};

/**
 * @return {!Object.<string, *>}
 */
ol.source.OskariAsyncTileImage.prototype.getWFSTileCache_ = function() {
    return this.tileLayerCache;
};

ol.source.OskariAsyncTileImage.prototype.purgeWFSTileCache_ = function() {
    var me = this,
        wfsTileCache = this.getWFSTileCache_(),
        layerTileInfos = wfsTileCache.tileInfos,
        lastTileSetIdentifier =  wfsTileCache.tileSetIdentifier;
        /*
    _.each(layerTileInfos,function(lti,key) {
        if( !lti.isBoundaryTile) {
            delete layerTileInfos[key];
        }
        if( lti.tileSetIdentifier < lastTileSetIdentifier-1 ) {
            delete layerTileInfos[key];
        }

    });
        */
};

/**
 * @api
 */
ol.source.OskariAsyncTileImage.prototype.getNonCachedGrid = function (grid) {
    var result = [],
        i,
        me = this,
        bboxKey,
        dataForTile;

    var wfsTileCache = me.getWFSTileCache_(),
        layerTileInfos = wfsTileCache.tileInfos,
        lastTileSetIdentifier =  wfsTileCache.tileSetIdentifier;

    this.purgeWFSTileCache_();

    wfsTileCache.tileSetIdentifier =  ++wfsTileCache.tileSetIdentifier ;
    for (i = 0; i < grid.bounds.length; i += 1) {
        bboxKey = me.bboxkeyStrip_(grid.bounds[i]);
        //at this point the tile should already been cached by the layers getTile - function.
            var tileInfo = layerTileInfos[bboxKey],
                tileCoord = tileInfo ? tileInfo.tileCoord: undefined,
                tileCoordKey = tileCoord? ol.tilecoord.getKeyZXY(tileCoord[0],tileCoord[1],tileCoord[2]) : undefined,
                tile;
            if( tileCoordKey && this.tileCache.containsKey(tileCoordKey)) {
                tile = this.tileCache.get(tileCoordKey);
            }

            if (tile ) {
                if( tile.PLACEHOLDER === true) {
                    result.push(grid.bounds[i]);
                } else if(tile.getState() !== ol.TileState.LOADED) {
                    result.push(grid.bounds[i]);
                } else if( tile.isBoundaryTile === true ) {
                    result.push(grid.bounds[i]);
                }
            } else {
                delete layerTileInfos[bboxKey];
            }
    }
    return result;
};


/**
 * Note! Same as the original function, but tilestate is initialized to LOADING
 * so tilequeue isn't blocked by the async nature of Oskari WFS
 *
 * @param {number} z Tile coordinate z.
 * @param {number} x Tile coordinate x.
 * @param {number} y Tile coordinate y.
 * @param {number} pixelRatio Pixel ratio.
 * @param {ol.proj.Projection} projection Projection.
 * @return {!ol.Tile} Tile.
 * @private
 */
ol.source.OskariAsyncTileImage.prototype.createTile_ = function(z, x, y, pixelRatio, projection) {
  var tileCoordKey = this.getKeyZXY(z, x, y);
  if (this.tileCache.containsKey(tileCoordKey)) {
    return /** @type {!ol.Tile} */ (this.tileCache.get(tileCoordKey));
  } else {
    goog.asserts.assert(projection, 'argument projection is truthy');
    var tileCoord = [z, x, y];
    var urlTileCoord = this.getTileCoordForTileUrlFunction(
        tileCoord, projection);
    var tileUrl = !urlTileCoord ? undefined :
        this.tileUrlFunction(urlTileCoord, pixelRatio, projection);
    var tile = new this.tileClass(
        tileCoord,
        // always set state as LOADING since loading is handled outside ol3
        // IDLE state will result in a call to loadTileFunction and block rendering on other sources if 
        // we don't get results because of async load errors/job cancellation etc
        ol.TileState.LOADING,
        tileUrl !== undefined ? tileUrl : '',
        this.crossOrigin,
        this.tileLoadFunction);
    goog.events.listen(tile, goog.events.EventType.CHANGE,
        this.handleTileChange, false, this);

    this.tileCache.set(tileCoordKey, tile);
    return tile;
  }
};

/**
 * Workaround for being able to access renderer's private tile range property...
 * @api
 * @return  {ol.renderer.canvas.TileLayer}     canvasRenderer to force rerendering of tiles (ugly hack)
 */
 ol.source.OskariAsyncTileImage.prototype.getCanvasRenderer = function(layer, map){
    return map.getRenderer().getLayerRenderer(layer);
 }

/**
 * Workaround for being able to access renderer's private tile range property...
 * @api
 */
 ol.renderer.canvas.TileLayer.prototype.resetRenderedCanvasTileRange = function() {
  this.renderedCanvasTileRange_ = new ol.TileRange(NaN, NaN, NaN, NaN);
 }

/**
 * Workaround for being able to set the imageTile's state manually.
 * @api
 */
ol.ImageTile.prototype.setState = function(state) {
  this.state = state;
};

/**
 * Reveal TileGrid's innermost wanted properties
 * @api
 */
 ol.tilegrid.TileGrid.prototype.getTileRangeForExtentAndResolutionWrapper = function(mapExtent, resolution) {
    var tileRange = this.getTileRangeForExtentAndResolution(mapExtent, resolution);
    //return as array to avoid the closure compiler's dirty renaming deeds without having to expose the tilerange as well... 
    return [tileRange.minX, tileRange.minY, tileRange.maxX, tileRange.maxY];
    
 }
/**
 * @param  {Array.<number>} boundsObj     tile bounds
 * @param  {string}         imageData     dataurl or actual url for image
 * @param  {ol.layer.Tile}     layer whose renderer will be fooled into thinking it's gotta redraw everything (ugly hack)
 * @param  {ol.Map}     map from which to dig up the layerrenderer to hack (ugly hack)
 * @param  {boolean}        boundaryTile  true if this an incomplete tile
 * @api
 */
ol.source.OskariAsyncTileImage.prototype.setupImageContent = function(boundsObj, imageData, layer, map, boundaryTile) {
    var me = this,
        bboxKey = this.bboxkeyStrip_(boundsObj);
    if (!bboxKey) {
      return;
    }

    var layerTileInfos = this.getWFSTileCache_().tileInfos;
    var tileInfo = layerTileInfos[bboxKey],
        tileCoord = tileInfo ? tileInfo.tileCoord: undefined,
        tileCoordKey = tileCoord? ol.tilecoord.getKeyZXY(tileCoord[0],tileCoord[1],tileCoord[2]) : undefined,
        tile;
    if( tileCoordKey && this.tileCache.containsKey (tileCoordKey)) {
        tile = this.tileCache.get(tileCoordKey);
    }
    if(!tile) {
      return;
    }
    switch(tile.getState()) {
        case ol.TileState.IDLE : // IDLE: 0,
        case ol.TileState.LOADING: //LOADING: 1,
            me.__fixTile(tile, imageData, layer, map);
            /*
            tile.PLACEHOLDER = false;
            tile.getImage().src = imageData;
            tile.setState(ol.TileState.LOADED);
            */
            //reset the renderers memory of it's tilerange as to make sure that our boundary tiles get drawn perfectly
            //me.getCanvasRenderer(layer, map).resetRenderedCanvasTileRange();
            //this.changed();
            break;
        case ol.TileState.LOADED: // LOADED: 2
        case ol.TileState.ERROR: // ERROR: 3
        case ol.TileState.EMPTY: // EMPTY: 4
            me.__fixTile(tile, imageData, layer, map);
            /*
            tile.PLACEHOLDER = false;
            tile.getImage().src = imageData;
            tile.setState(ol.TileState.LOADED);
            */
            //reset the renderers memory of it's tilerange as to make sure that our boundary tiles get drawn perfectly
            //me.getCanvasRenderer(layer, map).resetRenderedCanvasTileRange();
            //this.changed();
            break;
        default:
            tile.handleImageError_();
    }

    tile.isBoundaryTile = boundaryTile;
    tileInfo.isBoundaryTile = boundaryTile;
    if( !tile.isBoundaryTile ) {
        delete layerTileInfos[bboxKey];
    }
};

ol.source.OskariAsyncTileImage.prototype.__fixTile = function(tile, imageData, layer, map) {
    clearTimeout(this.__refreshTimer);
    tile.PLACEHOLDER = false;
    tile.getImage().src = imageData;
    tile.setState(ol.TileState.LOADED);

//    this.dispatchEvent(new ol.source.TileEvent(ol.source.TileEventType.TILELOADEND, tile));
    var me = this;
    this.__refreshTimer = setTimeout(function() {
        //reset the renderers memory of it's tilerange as to make sure that our boundary tiles get drawn perfectly
//        canvasRenderer.renderedCanvasTileRange_ = new ol.TileRange();
//        me.changed();
        me.getCanvasRenderer(layer, map).resetRenderedCanvasTileRange();
        me.changed();


    }, 500);

};
/**
 * Note! Always uses the non-projected internal tile getter
 * @inheritDoc
 */
ol.source.OskariAsyncTileImage.prototype.getTile = function(z, x, y, pixelRatio, projection) {
    return this.createTile_(z, x, y, pixelRatio, projection);
};