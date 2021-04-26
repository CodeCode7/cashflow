sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/accenture/CashFlow/model/models",
	"sap/ui/model/json/JSONModel",
	"com/accenture/CashFlow/controller/ErrorHandler"
], function (UIComponent, Device, models, JSONModel, ErrorHandler) {
	"use strict";

	return UIComponent.extend("com.accenture.CashFlow.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);
			this._oErrorHandler = new ErrorHandler(this);
			var ofvalue;

			// enable routing
			this.getRouter().initialize();
			var oModel = new JSONModel("model/data.json");
			sap.ui.getCore().setModel(oModel, "JsonModel");

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
		},
		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},
		destroy: function () {
			this._oErrorHandler.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},
	});
});