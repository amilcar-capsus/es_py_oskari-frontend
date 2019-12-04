import { LayerEditorFlyout } from './view/Flyout';
import { ShowLayerEditorRequest } from './request/ShowLayerEditorRequest';
import { ShowLayerEditorRequestHandler } from './request/ShowLayerEditorRequestHandler';

const BasicBundle = Oskari.clazz.get('Oskari.BasicBundle');

Oskari.clazz.defineES('Oskari.admin.admin-layereditor.instance',
    class AdminLayerEditor extends BasicBundle {
        constructor () {
            super();
            this.loc = Oskari.getMsg.bind(null, 'admin-layereditor');
            this.eventHandlers = {
                'MapLayerEvent': (event) => {
                    if (event.getOperation() !== 'add') {
                        // only handle add layer
                        return;
                    }
                    if (event.getLayerId()) {
                        this._addTool(event.getLayerId());
                    } else { // initial layer load
                        this._setupLayerTools();
                    }
                }
            };
            this.dataProviders = [];
        }
        _startImpl () {
            this._setupLayerTools();
            this._loadDataProviders();
            this.sandbox.requestHandler(ShowLayerEditorRequest.NAME, new ShowLayerEditorRequestHandler(this));
        }

        _setDataProviders (dataProviders) {
            this.dataProviders = dataProviders;
        }
        _getDataProviders () {
            return this.dataProviders;
        }
        /**
         * Fetches reference to the map layer service
         * @return {Oskari.mapframework.service.MapLayerService}
         */
        _getLayerService () {
            return this.sandbox.getService('Oskari.mapframework.service.MapLayerService');
        }

        /**
         * Adds tools for all layers
         */
        _setupLayerTools () {
            // add tools for feature data layers
            const layers = this._getLayerService().getAllLayers();
            layers.forEach(layer => {
                this._addTool(layer, true);
            });
            // update all layers at once since we suppressed individual events
            const event = Oskari.eventBuilder('MapLayerEvent')(null, 'tool');
            this.sandbox.notifyAll(event);

            // add admin tool for adding new layers
            const adminToolService = this.sandbox.getService('Oskari.mapframework.service.LayerAdminToolService');
            if (adminToolService) {
                const tool = Oskari.clazz.create('Oskari.mapframework.domain.Tool');
                tool.setName('layer-editor-add-layer');
                tool.setTitle('Add new Layer');
                tool.setTooltip('Add new Layer');
                tool.setCallback(() => Oskari.getSandbox().postRequestByName('ShowLayerEditorRequest', []));
                tool.setTypes([adminToolService.TYPE_CREATE]);
                adminToolService.addTool(tool);
            }
        }

        /**
         * Adds the layer edit tool for layer
         * @method  @private _addTool
         * @param  {String| Number} layerId layer to process
         * @param  {Boolean} suppressEvent true to not send event about updated layer (optional)
         */
        _addTool (layer, suppressEvent) {
            const service = this._getLayerService();
            if (typeof layer !== 'object') {
                // detect layerId and replace with the corresponding layerModel
                layer = service.findMapLayer(layer);
            }
            if (!layer || layer.getLayerType() !== 'wfs' || layer.getVersion() !== '1.1.0') {
                return;
            }

            // add feature data tool for layer
            const tool = Oskari.clazz.create('Oskari.mapframework.domain.Tool');
            tool.setName('layer-editor');
            tool.setIconCls('edit-layer');
            tool.setTooltip(this.loc('editor-tool'));
            tool.setTypes(['layerList']);

            tool.setCallback(() => {
                this.showEditor(layer.getId());
            });

            service.addToolForLayer(layer, tool, suppressEvent);
        }
        /**
         * @method _showEditor
         * Opens flyout with layer editor for given layerId
         * @param {Number} layerId
         */
        showEditor (layerId) {
            const flyout = this._getFlyout();
            const layerService = this._getLayerService();
            flyout.setLocale(this.loc);
            flyout.setDataProviders(this._getDataProviders());
            flyout.setMapLayerGroups(layerService.getAllLayerGroups());
            flyout.setLayer(layerService.findMapLayer(layerId));
            if (flyout.isVisible()) {
                flyout.bringToTop();
            } else {
                flyout.show();
            }
        }

        /**
         * @private @method _loadDataProviders
         * Loads data provider list
         */
        _loadDataProviders () {
            const me = this;
            jQuery.ajax({
                type: 'GET',
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                url: Oskari.urls.getRoute('GetMapLayerGroups'),
                error: function () {
                    var errorDialog = Oskari.clazz.create('Oskari.userinterface.component.Popup');
                    errorDialog.show(me.locale('errors.dataProvider.title'), me.locale('errors.dataProvider.message'));
                    errorDialog.fadeout();
                },
                success: function (response) {
                    const dataProviders = [];
                    response.organization.forEach(function (org) {
                        dataProviders.push({
                            id: org.id,
                            name: Oskari.getLocalized(org.name)
                        });
                    });

                    dataProviders.sort(function (a, b) {
                        return Oskari.util.naturalSort(a.name, b.name);
                    });
                    me._setDataProviders(dataProviders);
                }
            });
        }
        /**
         * @private @method _getFlyout
         * Ensure flyout exists and return it
         * @return {LayerEditorFlyout}
         */
        _getFlyout () {
            if (!this.flyout) {
                const xPosition = jQuery('#mapdiv').position().left;
                const offset = 150;

                this.flyout = new LayerEditorFlyout(this.loc('flyout-title'));
                this.flyout.move(xPosition + offset, 15, true);
                this.flyout.makeDraggable({
                    handle: '.oskari-flyouttoolbar',
                    scroll: false
                });
            }
            return this.flyout;
        }
    }
);
