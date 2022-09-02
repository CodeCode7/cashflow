
var noDoc;
var CustomAttrSet = [];
var CustomAttrSetAll = [];
var prNumber;
var progressFlag;
var tecDocId = [];
var exitFlag;
var rfqStatus, DisFlag;
var deleteScroll;
var iLimit;
var custCount;
var unitGlobal;
var phaseGlobal;
sap.ui.define([
	"ptp/sourcing/cbe/controller/BaseController",
	"sap/m/MessageBox",
	"sap/m/Dialog",
	"sap/ui/model/json/JSONModel",
	"ptp/sourcing/cbe/model/formatter",
	"sap/ui/core/format/NumberFormat"//separator change 
], function(BaseController, MessageBox, Dialog, JSONModel, formatter, NumberFormat) {
	"use strict";
	var rfq_number;
	var fieldEnabled = true;
	var descrEnabled = false;
	var thisVal;
	var columnNo;
	var Plant;
	var saveFlag;
	var errorFlag = "";
	var deleteArray = [];
	var attachmentFlag;
	var DelFlag = "";
	var oTableModel = new sap.ui.model.json.JSONModel();
	var i, _self;

	return BaseController.extend("ptp.sourcing.cbe.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var sServiceUrl1 = "/sap/opu/odata/sap/ZPTP_CBE_COMPARISON_SCREEN_SRV"; //Deepthi FETR0013312
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl1); //Deepthi FETR0013312
			this.oMod = oMod; //Deepthi FETR0013312
			var oViewModel = new JSONModel({
				busy: false,
				delay: 4000
			});

			var obuttonModel = {
				"status": {
					"change": false
				}
			};
			var oModel1 = new sap.ui.model.json.JSONModel(obuttonModel);
			this.getView().setModel(oModel1, "vmodel");

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

			jQuery.sap.require("jquery.sap.resources");
			var sLangu = this.getOwnerComponent().getModel("i18n").getResourceBundle().sLocale;
			this.oLangu = new sap.ui.model.resource.ResourceModel({
				bundleName: "ptp.sourcing.cbe.i18n.i18n",
				bundleLocale: sLangu
			});
			this.setModel(this.oLangu, "i18n");
			
			var oFloatFormat = NumberFormat.getFloatInstance(); //separator change  
		},
		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.rfqStatus = oEvent.getParameter("arguments").rfqStatus;
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("MasterPageSet", {
					Banfn: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
			prNumber = sObjectId;
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function(sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		/**
		 *function name : _onBindingChange
		 *Reason :  To bind a proper view when no element is there in master list
		 *If its there then bind detail view with the current selection
		 *headerModel is binded with the header and lineModel is binded wth the line item Table 
		 *input parameters: null
		 *return: null
		 */

		_onBindingChange: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();
			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}
			var sPath = oElementBinding.getPath(),
				oObject = oView.getModel().getObject(sPath),
				Manager = oObject.DispOnly,
				documentType = oObject.PRDocTyp,
				sObjectId = oObject.Banfn;
			Plant = oObject.Werks;
			deleteArray = [];
			if (this.getView().getModel("deleteModel") !== undefined) {
				var deleteModel = new JSONModel({
					mData: []
				});
				this.getView().setModel(deleteModel, "deleteModel");
			}
			if (documentType === "ZWRN") {
				this.getView().byId("iconTabBarFilter0").setVisible(true);
			} else {
				this.getView().byId("iconTabBarFilter0").setVisible(false);
			}
			this.getOwnerComponent().oListSelector.selectAListItem(sPath);
			rfq_number = sObjectId;
			this._getAttachments(sObjectId);
			this._getVendorComparison(sObjectId, Manager, documentType);
			this._getApproverList(sObjectId);
			this._getDeclinedVendorList(sObjectId);
			this.getView().byId("documentNoId").setValueState(sap.ui.core.ValueState.None);
			this.getView().byId("unitId").setValueState(sap.ui.core.ValueState.None);
			this.getView().byId("phaseId").setValueState(sap.ui.core.ValueState.None);
			this.getView().byId("totalQuotedPriceAfterTechnicalQueryConfirmId").setValue(""); /*Added by Deepthi  FETR0013312*/
			this.getView().byId("Currencyid").setEnabled(true); /*Added by Deepthi  FETR0013312*/
			this.getView().byId("EstCurrencyid").setEnabled(true); /*Added by Deepthi  FETR0013312*/
			this.getView().byId("totalBudgetAvailableId").setValue("");
			this.getView().byId("deliveryFloatDaysId").setValue("");
			this.getView().byId("buyerRecommendationId").setValue("");
			this.getView().byId("estimatePoValueId").setValue("");
			this.getView().byId("estimatedPoDateId").setValue("");
			this.getView().byId("estdTimeForShippingId").setValue("");
			this.getView().byId("estdDelLeadTimeId").setValue("");
			this.getView().byId("potentialSavingsId").setValue(""); /*Added by Deepthi  FETR0013312*/
			this.getView().byId("balanceId").setValue("");
			// start of changes by nagesh FETR0013312
			this.getView().byId("balanceId1").setValue("");
			this.getView().byId("estimatePoValueId1").setValue("");
			this.getView().byId("totalBudgetAvailableId1").setValue("");
			// end of changes
			this.getView().byId("documentNoId").attachBrowserEvent('keydown', function(e) {
				var key = e.keyCode ? e.keyCode : e.which;
				if (!([8, 9, 13, 27, 46, 110].indexOf(key) !== -1 ||
						(key === 65 && (e.ctrlKey || e.metaKey)) ||
						(key >= 35 && key <= 40) ||
						(key >= 48 && key <= 57 && !(e.shiftKey || e.altKey)) ||
						(key >= 96 && key <= 105)
					)) {
					e.preventDefault();
				}
			});
			this.getView().byId("estdTimeForShippingId").attachBrowserEvent('keydown', function(e) {
				var key = e.keyCode ? e.keyCode : e.which;
				if (!([8, 9, 13, 27, 46, 110].indexOf(key) !== -1 ||
						(key === 65 && (e.ctrlKey || e.metaKey)) ||
						(key >= 35 && key <= 40) ||
						(key >= 48 && key <= 57 && !(e.shiftKey || e.altKey)) ||
						(key >= 96 && key <= 105)
					)) {
					e.preventDefault();
				}
			});
			this.getView().byId("estdDelLeadTimeId").attachBrowserEvent('keydown', function(e) {
				var key = e.keyCode ? e.keyCode : e.which;
				if (!([8, 9, 13, 27, 46, 110].indexOf(key) !== -1 ||
						(key === 65 && (e.ctrlKey || e.metaKey)) ||
						(key >= 35 && key <= 40) ||
						(key >= 48 && key <= 57 && !(e.shiftKey || e.altKey)) ||
						(key >= 96 && key <= 105)
					)) {
					e.preventDefault();
				}
			});
			/*Strat of Changes by Deepthi FETR0013312*/
			this.getView().byId("totalQuotedPriceAfterTechnicalQueryConfirmId").attachBrowserEvent('keydown', function(e) {
				var key = e.keyCode ? e.keyCode : e.which;
				if (!([8, 9, 13, 27, 46, 110].indexOf(key) !== -1 ||
						(key === 65 && (e.ctrlKey || e.metaKey)) ||
						(key >= 35 && key <= 40) ||
						(key >= 48 && key <= 57 && !(e.shiftKey || e.altKey)) ||
						(key >= 96 && key <= 105)
					)) {
					e.preventDefault();
				}
			});
			/*End of Changes by Deepthi FETR0013312*/
			this.getView().byId("totalBudgetAvailableId").attachBrowserEvent('keydown', function(e) {
				var key = e.keyCode ? e.keyCode : e.which;
				if (!([8, 9, 13, 27, 46, 110].indexOf(key) !== -1 ||
						(key === 65 && (e.ctrlKey || e.metaKey)) ||
						(key >= 35 && key <= 40) ||
						(key >= 48 && key <= 57 && !(e.shiftKey || e.altKey)) ||
						(key >= 96 && key <= 105)
					)) {
					e.preventDefault();
				}
			});
			this.getView().byId("estimatePoValueId").attachBrowserEvent('keydown', function(e) {
				var key = e.keyCode ? e.keyCode : e.which;
				if (!([8, 9, 13, 27, 46, 110].indexOf(key) !== -1 ||
						(key === 65 && (e.ctrlKey || e.metaKey)) ||
						(key >= 35 && key <= 40) ||
						(key >= 48 && key <= 57 && !(e.shiftKey || e.altKey)) ||
						(key >= 96 && key <= 105)
					)) {
					e.preventDefault();
				}
			});
		},

		/**
		 *function name : _getVendorComparison
		 *Reason :  To create a table at runtime with dynamic rows & columns and bind the table with Vendor details and compare different Vendors 
		 *input parameters: sObjectId 
		 *return: null*/
		_getVendorComparison: function(sObjectId, Manager, documentType) {
			var self = this;
			thisVal = self;
			var readRequestURL = "/MasterPageSet('" + sObjectId + "')/NavLine";
			this.getView().getModel().read(readRequestURL, {
				success: function(data) {
					var oJSONModel = new JSONModel();
					oJSONModel.setData(data);
					sap.ui.getCore().masterPageData = data;
					var oFilters = [
						new sap.ui.model.Filter("Banfn", sap.ui.model.FilterOperator.EQ, sObjectId)
					];
					var vendorRowURL = "/ComparisonSet";
					self.getView().getModel().read(vendorRowURL, {
						filters: oFilters,
						urlParameters: {
							$expand: "NavCVen,NavHeaderInfo,NavClaim,NavBidAttach_Attr"
						},
						success: function(OData) {
							var HeaderModel = new JSONModel();
							var tab1HeaderModel = new JSONModel();
							tab1HeaderModel.setData(OData.results[0]);
							//var attachmentModel = new JSONModel();
							// attachmentModel.setData(OData.results[0].NavBidAttach_Attr.results[0]);
							// self.getView().setModel(attachmentModel,"attachmentModel");
							if (OData.results[0].NavBidAttach_Attr.results.length > 0) {
								self.getView().byId("documentNoId").setValue(OData.results[0].NavBidAttach_Attr.results[0].DocNo);
								self.getView().byId("unitId").setValue(OData.results[0].NavBidAttach_Attr.results[0].Unit);
								unitGlobal = self.getView().byId("unitId").getValue();
								self.getView().byId("phaseId").setValue(OData.results[0].NavBidAttach_Attr.results[0].Phase);
								phaseGlobal = self.getView().byId("phaseId").getValue();
								self.getDownloadAttachmentList(prNumber);

							} else {
								self.getView().byId("documentNoId").setValue("");
								self.getView().byId("unitId").setValue("");
								unitGlobal = self.getView().byId("unitId").getValue();
								self.getView().byId("phaseId").setValue("");
								phaseGlobal = self.getView().byId("phaseId").getValue();
							}
							if (OData.results[0].NavBidAttach_Attr.results.length > 0) {
								if (OData.results[0].NavBidAttach_Attr.results[0].DocRep === "ZE") {
									self.getView().byId("phaseId").setVisible(false);
								} else {
									self.getView().byId("phaseId").setVisible(true);
								}
							} else {
								self.getView().byId("phaseId").setVisible(false);
							}
							if (OData.results[0].NavBidAttach_Attr.results.length > 0) {
								if (OData.results[0].NavBidAttach_Attr.results[0].DocRep === "ZH") {
									self.getView().byId("unitId").setVisible(false);
								} else {
									self.getView().byId("unitId").setVisible(true);
								}
							} else {
								self.getView().byId("unitId").setVisible(false);
							}
							var HeaderModelArray = [];
							for (var i = 0; i < OData.results.length; i++) {
								HeaderModelArray.push(OData.results[i].NavHeaderInfo.results[0]);
							}
							HeaderModel.setData(HeaderModelArray);
							// start of changes by nagesh  FETR0013312
							var costSavingsFlag = OData.results[0].NavHeaderInfo.results[0].Flag;
							if (costSavingsFlag === "X") {
								HeaderModel.setProperty("/costSavingsFlag", true);
								HeaderModel.setProperty("/budgetBalanceFlag", false);
							} else {
								HeaderModel.setProperty("/costSavingsFlag", false);
								HeaderModel.setProperty("/budgetBalanceFlag", true);
							}
							// end of changes
							var vendorRowModel = new JSONModel();
							vendorRowModel.setData(OData);
							sap.ui.getCore().priceComparison = OData;
							self.getView().setModel(vendorRowModel, "vendorRowModel");
							var aColumnData = [{
								column: "",
								columnId: "Item",
								columnId2: "Item No."
							}, {
								column: "",
								columnId: "Mat No",
								columnId2: "Material No."
							}, {
								column: "",
								columnId: "Mat Desc",
								columnId2: "Description"
							}, {
								column: "",
								columnId: "Tag No",
								columnId2: "MODEC Tag No"
							}, {
								columnId: "SupplierTagnumber",
								columnId2: "Supplier Tag number",
								column: ""
							}, {
								columnId: "WarrantyModelNo",
								columnId2: "Warranty Model No",
								column: ""
							}, {
								columnId: "ManufacturerName",
								columnId2: "Manufacturer Name",
								column: ""
							}, {
								columnId: "ManufacturerSerialNo",
								columnId2: "Manufacturer Serial No.",
								column: ""
							}, {
								column: "",
								columnId: "Mat Long Txt",
								columnId2: "Material Long Text"
							}, {
								column: "",
								columnId: "PR Req Qty",
								columnId2: "PR Req Qty"
							}, {
								column: "",
								columnId: "UOM",
								columnId2: "UOM"
							}];
							if (documentType !== "ZWRN") {
								aColumnData.splice(4, 4);
							}
							for (var j = 0; j < OData.results.length; j++) {
								aColumnData.push({
									column: OData.results[j].Name1,
									columnId: "VConfQty" + j,
									columnId2: "Vend Conf Qty"
								});
								aColumnData.push({
									column: OData.results[j].Name1,
									columnId: "TechTxt" + j,
									columnId2: "Technical Response"
								});
								aColumnData.push({
									column: OData.results[j].Name1,
									columnId: "Unit Price" + j,
									columnId2: "Unit Price (USD)"
								});
								aColumnData.push({
									column: OData.results[j].Name1,
									columnId: "Total Price" + j,
									columnId2: "Total Price (USD)"
								});
								aColumnData.push({
									column: OData.results[j].Name1,
									columnId: "Optional" + j,
									columnId2: "Opt."
								});
							}
							var aData = [];
							for (var k = 0; k < data.results.length; k++) {
								var item = {};
								item["Item"] = formatter.ItemNoFormatter(data.results[k].Ebelp);
								item["Mat Desc"] = data.results[k].Maktx;
								for (var m = 0; m < OData.results.length; m++) {
									for (var n = 0; n < OData.results[m].NavCVen.results.length; n++) {
										if (data.results[k].Ebelp === OData.results[m].NavCVen.results[n].Ebelp && data.results[k].Maktx === OData.results[
												m].NavCVen.results[n].Maktx) {
											item["Mat No"] = OData.results[m].NavCVen.results[n].Matnr;
											item["Mat Long Txt"] = formatter.HeaderText(OData.results[m].NavCVen.results[n].MatLongtxt);
											item["PR Req Qty"] = formatter.floatFormatter(OData.results[m].NavCVen.results[n].Menge);
											item["UOM"] = OData.results[m].NavCVen.results[n].Meins;
											if (documentType === "ZWRN") {
												item["ManufacturerName"] = OData.results[m].NavCVen.results[n].ManufactName;
												item["ManufacturerSerialNo"] = OData.results[m].NavCVen.results[n].ManufactNo;
												item["WarrantyModelNo"] = OData.results[m].NavCVen.results[n].ModelNo;
												item["SupplierTagnumber"] = OData.results[m].NavCVen.results[n].SuplTagNo;
											}
											item["Tag No"] = OData.results[m].NavCVen.results[n].ModecTagNo;
											item["VConfQty" + m] = formatter.floatFormatter(OData.results[m].NavCVen.results[n].MengeVend);
											item["TechTxt" + m] = OData.results[m].NavCVen.results[n].Zshrttxt;
											item["Unit Price" + m] = OData.results[m].NavCVen.results[n].Netpr;
											item["Total Price" + m] = OData.results[m].NavCVen.results[n].TotPrice;
											item["Optional" + m] = OData.results[m].NavCVen.results[n].Zoptional;
										}
									}
								}
								aData.push(item);
							}

							oTableModel.setSizeLimit(2000);
							oTableModel.setData({
								columns: aColumnData,
								rows: aData
							});
							self.getView().byId("cbecompTable").setModel(oTableModel);
							self.getView().byId("cbecompTable").setFixedColumnCount(3);
							if (oTableModel.getData().rows.length < 10) {
								self.byId("cbecompTable").setVisibleRowCount(oTableModel.getData().rows.length);
							} else {
								self.byId("cbecompTable").setVisibleRowCount(10);
							}
							//self.byId("cbecompTable").setVisibleRowCount(oTableModel.getData().rows.length);
							self.getView().byId("cbecompTable").bindAggregation("columns", "/columns", function(index, context) {
								switch (context.getObject().columnId2) {
									case "Item No.":
										return new sap.ui.table.Column({
											width: "4rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												}).addStyleClass("headertable")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Material No.":
										return new sap.ui.table.Column({
											width: "8rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												}).addStyleClass("headertable headertablematerialno")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Description":
										return new sap.ui.table.Column({
											width: "10rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												}).addStyleClass("headertable headertabledescr")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}).addStyleClass("Defaulttable"),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "MODEC Tag No":
										return new sap.ui.table.Column({
											width: "13rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												}).addStyleClass("headertable headertabletagno")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}",
												maxLines: 3,
												textAlign: "Left"
											}).addStyleClass("tagNoCss"),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Supplier Tag number":
										return new sap.ui.table.Column({
											width: "6rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2

												}).addStyleClass("headertable headertabletagno")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Warranty Model No":
										return new sap.ui.table.Column({
											width: "6rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												}).addStyleClass("headertable headertabletagno")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Manufacturer Name":
										return new sap.ui.table.Column({
											width: "8rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												}).addStyleClass("headertable headertabletagno")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Manufacturer Serial No.":
										return new sap.ui.table.Column({
											width: "8rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												}).addStyleClass("headertable headertabletagno")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Material Long Text":
										return new sap.ui.table.Column({
											width: "10rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												}).addStyleClass("headertable")
											],
											template: new sap.m.Text({
												maxLines: 3,
												text: "{" + context.getObject().columnId + "}",
												tooltip: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "PR Req Qty":
										return new sap.ui.table.Column({
											width: "5rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												}).addStyleClass("headertable")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "UOM":
										return new sap.ui.table.Column({
											width: "4rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",

													text: context.getObject().columnId2
												}).addStyleClass("headertable")
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Vend Conf Qty":
										return new sap.ui.table.Column({
											width: "5rem",
											headerSpan: [5, 1],
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												})
											],
											template: new sap.m.Text({
												textAlign: "Right",
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Technical Response":
										return new sap.ui.table.Column({
											width: "10rem",
											headerSpan: [5, 1],
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												})
											],
											template: new sap.m.Text({
												textAlign: "Right",
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Unit Price":
										return new sap.ui.table.Column({
											width: "8rem",
											headerSpan: [5, 1],
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												})
											],
											template: new sap.m.Text({
												textAlign: "Right",
												text: "{" + context.getObject().columnId + "}"
											}).addStyleClass("priceCss"),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Total Price":
										return new sap.ui.table.Column({
											width: "8rem",
											headerSpan: [5, 1],
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												})
											],
											template: new sap.m.Text({
												textAlign: "Right",
												text: "{" + context.getObject().columnId + "}"
											}).addStyleClass("priceCss"),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
									case "Opt.":
										return new sap.ui.table.Column({
											width: "4rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												})
											],
											template: new sap.m.CheckBox({
												selected: "{" + context.getObject().columnId + "}",
												enabled: false
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId,
											filterType: new sap.ui.model.type.Boolean()
										});
									default:
										return new sap.ui.table.Column({
											width: "7rem",
											multiLabels: [new sap.m.Link({
													textAlign: "Center",
													text: context.getObject().column,
													press: self.handleLinkPress
												}),
												new sap.m.Label({
													textAlign: "Center",
													text: context.getObject().columnId2
												})
											],
											template: new sap.m.Text({
												text: "{" + context.getObject().columnId + "}"
											}),
											sortProperty: context.getObject().columnId,
											filterProperty: context.getObject().columnId
										});
								}
							});
							self.getView().byId("cbecompTable").bindAggregation("rows", "/rows");
							self.getView().setModel(tab1HeaderModel, "tab1HeaderModel");
							self.estdTimeForShippingChange();
							self.estimatePoValueChange();
							self.getView().setModel(HeaderModel, "HeaderModel");
							var comRfqFlag = "";
							var rfqStatusTechnical = OData.results[0].Zrfqst;
							var bidTermComparsionEnable;
							var cbeRecommendationEanble;
							for (var comRfqVal = 0; comRfqVal < OData.results.length; comRfqVal++) {
								var rfqStatus = OData.results[comRfqVal].ZrfqstCom;
								if (rfqStatus < "12" || rfqStatus === "97" || rfqStatus === "13" || rfqStatus === "98" || rfqStatus === "99") {
									self._enableScreen();
									// self._getrankingComparison(OData, oFilters);    FETR0012948 role based access changes
									bidTermComparsionEnable = true;
									cbeRecommendationEanble = true;
									self.getView().byId("saveButtonId").setVisible(true);
									self.getView().byId("routeForApprovalButton").setVisible(true);
									if (Manager === "X") {
										self._getrankingComparisonDisable(OData, oFilters); //FETR0012948 role based access changes
										self._disableScreen();
										bidTermComparsionEnable = false;
										cbeRecommendationEanble = false;
										self.getView().byId("saveButtonId").setVisible(false);
										self.getView().byId("routeForApprovalButton").setVisible(false);
										break;
									} else {
										self._getrankingComparison(OData, oFilters); //FETR0012948 role based access changes
									}
								} else {
									self.getView().byId("saveButtonId").setVisible(true);
									self.getView().byId("routeForApprovalButton").setVisible(true);
									self._getrankingComparisonDisable(OData, oFilters);
									self._disableScreen();
									bidTermComparsionEnable = false;
									cbeRecommendationEanble = false;
									if (Manager === "X") {
										self.getView().byId("saveButtonId").setVisible(false);
										self.getView().byId("routeForApprovalButton").setVisible(false);
										break;
									}
									break;
								}
							}
							for (var comRfqValRankEnable = 0; comRfqValRankEnable < OData.results.length; comRfqValRankEnable++) {
								var rfqStatusRankEnable = OData.results[comRfqValRankEnable].ZrfqstCom;
								if (rfqStatusRankEnable === "09" || rfqStatusRankEnable === "97" || rfqStatusRankEnable === "13" || rfqStatusRankEnable ===
									"98" || rfqStatusRankEnable === "99") {
									comRfqFlag = "X";
								} else {
									comRfqFlag = "";
									break;
								}
							}
							if (rfqStatusTechnical === "11" && comRfqFlag === "X") {
								self.getView().byId("routeForApprovalButton").setEnabled(true);
								self.getView().byId("alertID").setVisible(false);
							} else {
								self.getView().byId("routeForApprovalButton").setEnabled(false);
								if (Manager === "X") {
									self.getView().byId("alertID").setVisible(false);
								} else {
									self.getView().byId("alertID").setVisible(true);
									self.getView().byId("AlertId").setText("Current RFQ status doesn't allow to Route For Approval");
								}
							}
							self._getHeaderInfo(OData, bidTermComparsionEnable);
							// 			var oFilters = [
							// 	new sap.ui.model.Filter("Banfn", sap.ui.model.FilterOperator.EQ, sObjectId)
							// ];
							self.getView().getModel().read("/CBERecommendationSet", {
								filters: oFilters,
								success: function(oCBERecommendationData) {
									self._getCbeRecommendation(OData, data, oCBERecommendationData, cbeRecommendationEanble);
								}
							});

							if (documentType === "ZWRN") {
								self._getWarrantyForm(OData);
							}
						}
					});
				}
			});
		},
		/**
		 *function name : _enableScreen
		 *Reason : Depending upon rfqstatus screen is enabled
		 *input parameters: null 
		 *return: null*/
		_enableScreen: function() {
			var self = this;
			descrEnabled = false;
			self.getView().byId("btnToAddRows").setEnabled(true);
			self.getView().byId("saveButtonId").setEnabled(true);
			self.getView().byId("totalQuotedPriceAfterTechnicalQueryConfirmId").setEnabled(true); /*Added by Deepthi FETR0013312*/
			self.getView().byId("Currencyid").setEnabled(true);
			self.getView().byId("totalBudgetAvailableId").setEnabled(true);
			self.getView().byId("buyerRecommendationId").setEnabled(true);
			self.getView().byId("estimatePoValueId").setEnabled(true);
			self.getView().byId("estimatedPoDateId").setEnabled(true);
			self.getView().byId("estdTimeForShippingId").setEnabled(true);
			self.getView().byId("estdDelLeadTimeId").setEnabled(true);
			self.getView().byId("documentNoId").setEnabled(true);
			self.getView().byId("unitId").setEnabled(true);
			self.getView().byId("phaseId").setEnabled(true);
			self.getView().byId("addComDocButton").setEnabled(true);
			self.getView().byId("addComDocButton").setTooltip("Add Commercial Document");
			self.getView().getModel("vmodel").getData().status.change = true;
			self.getView().getModel("vmodel").refresh(true);
			self.getView().byId("estimatePoValueId1").setEnabled(true); //added by nagesh FETR0013312
			self.getView().byId("totalBudgetAvailableId1").setEnabled(true);
			self.getView().byId("EstCurrencyid").setEnabled(true);
			self.getView().byId("costSavingsRemarksId").setEnabled(true);
			self.getView().byId("costSavingCalculate").setEnabled(true);
		},
		/**
		 *function name : _disableScreen
		 *Reason :  Depending upon rfqstatus screen is disabled
		 *input parameters: null 
		 *return: null*/
		_disableScreen: function() {
			var self = this;
			// fieldEnabled = false;
			// descrEnabled = false;
			self.getView().byId("btnToAddRows").setEnabled(false);
			self.getView().byId("saveButtonId").setEnabled(false);
			self.getView().byId("totalQuotedPriceAfterTechnicalQueryConfirmId").setEnabled(false); /*Added by Deepthi FETR0013312*/
			self.getView().byId("totalBudgetAvailableId").setEnabled(false);
			self.getView().byId("buyerRecommendationId").setEnabled(false);
			self.getView().byId("estimatePoValueId").setEnabled(false);
			self.getView().byId("Currencyid").setEnabled(false); /*Added by Deepthi FETR0013312*/
			self.getView().byId("estimatedPoDateId").setEnabled(false);
			self.getView().byId("estdTimeForShippingId").setEnabled(false);
			self.getView().byId("estdDelLeadTimeId").setEnabled(false);
			self.getView().byId("documentNoId").setEnabled(false);
			self.getView().byId("unitId").setEnabled(false);
			self.getView().byId("phaseId").setEnabled(false);
			self.getView().byId("addComDocButton").setEnabled(false);
			self.getView().byId("addComDocButton").setTooltip("Add Commercial Document");
			self.getView().getModel("vmodel").getData().status.change = false;
			self.getView().getModel("vmodel").refresh(true);
			self.getView().byId("estimatePoValueId1").setEnabled(false); //added by nagesh FETR0013312
			self.getView().byId("totalBudgetAvailableId1").setEnabled(false);
			self.getView().byId("EstCurrencyid").setEnabled(false);
			self.getView().byId("costSavingsRemarksId").setEnabled(false);
			self.getView().byId("costSavingCalculate").setEnabled(false);
		},

		/**
		 *function name : _getHeaderInfo
		 *Reason :  To create a table at runtime with dynamic rows and columns & bind the table with Bid details with different vendors 
		 *input parameters: OData 
		 *return: null*/
		_getHeaderInfo: function(OData, bidTermComparsionEnable) {
			var self = this;
			var oHeaderTable = this.getView().byId("headerInfoTable");
			var headerInfoArray = [];
			headerInfoArray.push({
				id: "VendorBidRef",
				desc: "Vendor Bid Reference No",
				type: "Text"
			}, {
				id: "RevisionNo",
				desc: "Revision No",
				type: "RevInput"
			}, {
				id: "BidSubmiDate",
				desc: "Bid Submission Date",
				type: "Text"
			}, {
				id: "BidValidtyDate",
				desc: "Bid Validity Date",
				type: "Text"
			}, {
				id: "DelLeadTime",
				desc: "Quoted Lead Time",
				type: "Text"
			}, {
				id: "PaymentTerm",
				desc: "Payment Terms",
				type: "PaymentTermInput"
			}, {
				id: "ShippinTerm",
				desc: "Shipping Terms",
				type: "Text"
			}, {
				id: "ShippinPoint",
				desc: "Shipping  Point",
				type: "Text"
			}, {
				id: "CountryOrigin",
				desc: "Country of Origin",
				type: "Text"
			}, {
				id: "Currency",
				desc: "Currency",
				type: "Text"
			}, {
				id: "Warranty",
				desc: "Warranty",
				type: "Input20"
			}, {
				id: "MeetsTechSpec",
				desc: "Meets Technical Specification",
				type: "MeetsTechSpecInputPopup"
			}, {
				id: "MeetsComReq",
				desc: "Meets Commercial Requirement",
				type: "MeetsComReqInputPopup"
			}, {
				id: "AccptModecTc",
				desc: "Accept MODEC T/C ",
				type: "AccptModecTcInputPopup"
			}, {
				id: "CommisionSpares",
				desc: "Commissioning Spares List Provided",
				type: "CommisionSparesInputPopup"
			}, {
				id: "YrsSpares",
				desc: "2 Years Spares List Provided",
				type: "YrsSparesInputPopup"
			}, {
				id: "ServRateAgreed",
				desc: "Service Rates Agreed",
				type: "ServRateAgreedInputPopup"
			}, {
				id: "LocalContent",
				desc: "Local Content (%)",
				type: "Input"
			}, {
				id: "TotalCost",
				desc: "Total Cost in Quoted Currency",
				type: "Text"
			}, {
				id: "FreigtMode",
				desc: "Freight Mode",
				type: "FreigtModeInput"
			}, {
				id: "ExchangeRate",
				desc: "Exchange Rate",
				type: "Text"
			}, {
				id: "TotalinUSD",
				desc: "Total in USD",
				type: "Text"
			}, {
				id: "Totalafternormalization",
				desc: "Total after normalization (USD)",
				type: "Text"
			});
			var aColumnData = [{
				columnId: "No.",
				columnId2: "No."
			}, {
				columnId: "Description",
				columnId2: "Description"
			}];
			for (var j = 0; j < OData.results.length; j++) {
				aColumnData.push({
					columnId: "VName" + j,
					columnId2: OData.results[j].Name1
				});
			}
			var aData = [];
			for (var arr1 = 0; arr1 < headerInfoArray.length; arr1++) {
				var item = {};
				item["No."] = arr1 + 1;
				item["Description"] = headerInfoArray[arr1].desc;
				for (var val = 0; val < OData.results.length; val++) {
					for (var val1 = 0; val1 < OData.results[val].NavHeaderInfo.results.length; val1++) {
						if (OData.results[val].Name1 === OData.results[val].NavHeaderInfo.results[val1].VendorName) {
							if (headerInfoArray[arr1].id === "AccptModecTc") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].AccptModecTc;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "BidSubmiDate") {
								if (OData.results[val].NavHeaderInfo.results[val1].BidSubmiDate === null) {
									item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].BidSubmiDate;
									item["type"] = headerInfoArray[arr1].type;
								} else {
									var submiDate = formatter.datechange(OData.results[val].NavHeaderInfo.results[val1].BidSubmiDate);
									item["VName" + val] = submiDate;
									item["type"] = headerInfoArray[arr1].type;
								}
							} else if (headerInfoArray[arr1].id === "BidValidtyDate") {
								if (OData.results[val].NavHeaderInfo.results[val1].BidValidtyDate === null) {
									item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].BidValidtyDate;
									item["type"] = headerInfoArray[arr1].type;
								} else {
									var validtyDate = formatter.datechange(OData.results[val].NavHeaderInfo.results[val1].BidSubmiDate);
									item["VName" + val] = validtyDate;
									item["type"] = headerInfoArray[arr1].type;
								}
							} else if (headerInfoArray[arr1].id === "CommisionSpares") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].CommisionSpares;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "CountryOrigin") {
								item["VName" + val] = formatter.HeaderText(OData.results[val].NavHeaderInfo.results[val1].CountryOrigin);
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "Currency") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].Currency;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "DelLeadTime") {
								if (OData.results[val].NavHeaderInfo.results[val1].VendDelLead === " -") {
									item["VName" + val] = " ";
									item["type"] = headerInfoArray[arr1].type;
								} else {
									item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].VendDelLead;
									item["type"] = headerInfoArray[arr1].type;
								}
							} else if (headerInfoArray[arr1].id === "ExchangeRate") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].ExchangeRate;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "FreigtMode") {
								if (OData.results[val].NavHeaderInfo.results[val1].FreigtMode === "") {
									item["VName" + val] = " ";
									item["type"] = headerInfoArray[arr1].type;
								} else {
									item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].FreigtMode + " - " + OData.results[val].NavHeaderInfo.results[
										val1].FreigtModeDesc;
									item["type"] = headerInfoArray[arr1].type;
								}
							} else if (headerInfoArray[arr1].id === "LocalContent") {
								item["VName" + val] = formatter.floatFormatter(OData.results[val].NavHeaderInfo.results[val1].LocalContent);
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "MeetsComReq") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].MeetsComReq;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "MeetsTechSpec") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].MeetsTechSpec;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "PaymentTerm") {
								if (OData.results[val].NavHeaderInfo.results[val1].PaymentTerm === "") {
									item["VName" + val] = " ",
										item["type"] = headerInfoArray[arr1].type;
								} else {
									item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].PaymentTerm + " - " + OData.results[val].NavHeaderInfo.results[
										val1].PaymentTermDesc;
									item["type"] = headerInfoArray[arr1].type;
								}
							} else if (headerInfoArray[arr1].id === "RevisionNo") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].RevisionNo;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "ServRateAgreed") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].ServRateAgreed;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "ShippinPoint") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].ShippinPoint;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "ShippinTerm") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].ShippinTerm;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "TotalCost") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].TotalCost;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "VendorBidRef") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].VendorBidRef;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "Warranty") {
								item["VName" + val] = formatter.HeaderText(OData.results[val].NavHeaderInfo.results[val1].Warranty);
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "YrsSpares") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].YrsSpares;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "TotalinUSD") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].TotalCostUsd;
								item["type"] = headerInfoArray[arr1].type;
							} else if (headerInfoArray[arr1].id === "Totalafternormalization") {
								item["VName" + val] = OData.results[val].NavHeaderInfo.results[val1].NormCost;
								item["type"] = headerInfoArray[arr1].type;
							}
						}
					}
				}
				aData.push(item);
			}
			var headerInfoModel = new JSONModel();
			headerInfoModel.setData({
				columns: aColumnData,
				rows: aData
			});
			oHeaderTable.setModel(headerInfoModel);
			oHeaderTable.setVisibleRowCount(23);
			oHeaderTable.setFixedColumnCount(2);
			oHeaderTable.bindAggregation("columns", "/columns", function(index, context) {
				switch (context.getObject().columnId2) {
					case "No.":
						return new sap.ui.table.Column({
							width: "5rem",
							label: [
								new sap.m.Label({
									textAlign: "Center",
									width: "100%",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							})
						});
					case "Description":
						return new sap.ui.table.Column({
							width: "15rem",
							label: [
								new sap.m.Label({
									textAlign: "Center",
									width: "100%",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							})
						});
					default:
						if (bidTermComparsionEnable === true) {
							return new sap.ui.table.Column({
								width: "15rem",
								label: [
									new sap.m.Label({
										textAlign: "Center",
										width: "100%",
										text: context.getObject().columnId2
									})
								],
								template: self._getTemp(context.getObject().columnId, context)
							});
						} else {
							return new sap.ui.table.Column({
								width: "15rem",
								label: [
									new sap.m.Label({
										textAlign: "Center",
										width: "100%",
										text: context.getObject().columnId2
									})
								],
								template: self._getTempDisable(context.getObject().columnId, context)
							});
						}
				}
			});
			oHeaderTable.bindAggregation("rows", "/rows");
			this.getView().setModel(headerInfoModel, "headerInfoModel");
		},
		_getCbeRecommendation: function(OData, data, oCBERecommendationData, cbeRecommendationEanble) {
			var self = this;
			var oCbeRecommendationTable = this.getView().byId("cbeRecomdationTable");
			if (cbeRecommendationEanble === true) {
				var aColumnData = [{
					columnId: "Description",
					columnId2: "Description",
					type: "Enabled"
				}];
				for (var j = 0; j < OData.results.length; j++) {
					aColumnData.push({
						columnId: "VName" + j,
						columnId2: OData.results[j].Name1,
						Lifnr: OData.results[j].Lifnr,
						type: true
					});
				}
				aColumnData.push({
					columnId: "Delete",
					columnId2: "Delete",
					type: true
				});
			} else {
				var aColumnData = [{
					columnId: "Description",
					columnId2: "Description",
					type: "Enabled"
				}];
				for (var j = 0; j < OData.results.length; j++) {
					aColumnData.push({
						columnId: "VName" + j,
						columnId2: OData.results[j].Name1,
						Lifnr: OData.results[j].Lifnr,
						type: false
					});
				}
				aColumnData.push({
					columnId: "Delete",
					columnId2: "Delete",
					type: false
				});
			}
			var duplicateDescriptionArray = [];
			var l = oCBERecommendationData.results.length;
			for (var i = 0; i < l; i++) {
				for (var j = i + 1; j < l; j++) {
					// If a[i] is found later in the array
					if (oCBERecommendationData.results[i].Descr === oCBERecommendationData.results[j].Descr) {
						j = ++i;
					}
				}
				duplicateDescriptionArray.push({
					Descr: oCBERecommendationData.results[i].Descr,
					Banfn: oCBERecommendationData.results[i].Banfn,
					DelInd: oCBERecommendationData.results[i].DelInd,
					SrNo: oCBERecommendationData.results[i].SrNo,
					discanabled: false
				});
			}
			var aData = [];
			for (var arr1 = 0; arr1 < duplicateDescriptionArray.length; arr1++) {
				var item = {};
				item["Description"] = duplicateDescriptionArray[arr1].Descr;
				item["SrNo"] = duplicateDescriptionArray[arr1].SrNo;
				item["DelInd"] = duplicateDescriptionArray[arr1].DelInd;
				item["Banfn"] = duplicateDescriptionArray[arr1].Banfn;
				item["Enabled"] = false;

				for (var val = 0; val < OData.results.length; val++) {
					for (var val1 = 0; val1 < oCBERecommendationData.results.length; val1++) {
						if (duplicateDescriptionArray[arr1].SrNo === oCBERecommendationData.results[val1].SrNo && OData.results[val].Lifnr ===
							oCBERecommendationData.results[val1].Lifnr) {
							item["VName" + val] = oCBERecommendationData.results[val1].VendResp;
						}
					}
				}
				aData.push(item);
			}
			var cbeRecommendationModel = new JSONModel();
			cbeRecommendationModel.setData({
				columns: aColumnData,
				rows: aData
			});
			oCbeRecommendationTable.setModel(cbeRecommendationModel);
			oCbeRecommendationTable.setFixedColumnCount(1);
			oCbeRecommendationTable.bindAggregation("columns", "/columns", function(index, context) {
				switch (context.getObject().columnId2) {
					case "Description":
						return new sap.ui.table.Column({
							width: "20rem",
							label: [
								new sap.m.Label({
									textAlign: "Center",
									width: "100%",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Input({
								tooltip: "{" + context.getObject().columnId + "}",
								//	change: jQuery.proxy(this.onChangeDesc, this),
								change: function(oEvent) {
									var rowNo = oEvent.getSource().getBindingContext().sPath.split("/")[2];
									self.getView().getModel("cbeRecommendationModel").setProperty("/" + rowNo + "/Description", oEvent.getParameters().value);
									if (self.getView().getModel("cbeRecommendationModel").getData().rows[rowNo].SrNo !== 0) {
										self.getView().getModel("cbeRecommendationModel").getData().rows[rowNo].DelInd = "U";
									}
								},
								textAlign: "Left",
								// enabled: context.getModel().getData().rows[context.sPath.split("/")[2]].Enabled,
								enabled: "{" + context.getObject().type + "}",
								maxLength: 255,
								value: "{" + context.getObject().columnId + "}"
							})
						});
					case "Delete":
						return new sap.ui.table.Column({
							width: "10%",
							label: [
								new sap.m.Label({
									textAlign: "Center",
									width: "100%",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Button({
								icon: "sap-icon://delete",
								press: jQuery.proxy(self.onPressDelete, self),
								enabled: context.getObject().type
							})

						});
					default:
						return new sap.ui.table.Column({
							label: [
								new sap.m.Label({
									textAlign: "Center",
									width: "100%",
									text: context.getObject().columnId2 + " (USD)"
								})
							],
							template: new sap.m.Input({
								tooltip: "Numeric field",
								change: function(oEvent) {
									var rowNo = oEvent.getSource().getBindingContext().sPath.split("/")[2];
									if (self.getView().getModel("cbeRecommendationModel").getData().rows[rowNo].SrNo !== 0) {
										self.getView().getModel("cbeRecommendationModel").getData().rows[rowNo].DelInd = "U";
									}
								},
								enabled: context.getObject().type,
								textAlign: "Left",
								maxLength: 11,
								value: "{" + context.getObject().columnId + "}"
							}).attachBrowserEvent('keydown', function(e) {
								var key = e.keyCode ? e.keyCode : e.which;
								if (!([8, 9, 13, 27, 46, 110].indexOf(key) !== -1 ||
										(key === 65 && (e.ctrlKey || e.metaKey)) ||
										(key >= 35 && key <= 40) || (key === 189) || (key === 109) ||
										(key >= 48 && key <= 57 && !(e.shiftKey || e.altKey)) ||
										(key >= 96 && key <= 105)
									)) {
									e.preventDefault();
								}
							})
						});
				}
			});
			oCbeRecommendationTable.bindAggregation("rows", "/rows");
			this.getView().byId("cbeRecomdationTable").setVisibleRowCount(duplicateDescriptionArray.length);
			this.getView().setModel(cbeRecommendationModel, "cbeRecommendationModel");
		},

		onPressAdd: function() {
			fieldEnabled = true;
			descrEnabled = true;
			var oModel = this.getView().byId("cbeRecomdationTable").getModel("cbeRecommendationModel");
			var Data = oModel.getData().rows;
			var selectedRowIndex = Data.length;
			var EmptyData = {
				Description: "",
				Banfn: rfq_number,
				DelInd: "",
				Enabled: true,
				SrNo: 0
					//	discanabled: true
			};
			for (var i = 0; i < oModel.getData().columns.length - 2; i++) {
				EmptyData["VName" + i] = "";
				EmptyData["Lifnr"] = oModel.getData().columns[i + 1].Lifnr;
			}
			Data.splice(selectedRowIndex + 1, 0, EmptyData);
			oModel.refresh();
			oModel.getData().columns[0].type = true;
			oModel.setData({
				columns: oModel.getData().columns,
				rows: Data
			});
			this.getView().byId("cbeRecomdationTable").setModel(oModel);
			this.getView().byId("cbeRecomdationTable").bindAggregation("rows", "/rows");
			this.getView().byId("cbeRecomdationTable").setVisibleRowCount(Data.length);
			this.getView().byId("cbeRecomdationTable").updateBindings(true);
		},

		onPressDelete: function(oEvent) {
			var oModel = this.getView().byId("cbeRecomdationTable").getModel("cbeRecommendationModel");
			var Data = oModel.getData().rows;
			var index = oEvent.getSource().getBindingContext().sPath.split("/")[2];
			this.getView().getModel("cbeRecommendationModel").getData().rows[index].DelInd = "D";
			//	var deleteArray = [];
			// if(this.getView().getModel("cbeRecommendationModel").getData().rows[index].SrNo === "")
			// {
			deleteArray.push(Data[index]);
			//}
			var deleteModel = new JSONModel();
			deleteModel.setData(deleteArray);
			this.getView().setModel(deleteModel, "deleteModel");

			Data.splice(index, 1);
			oModel.setData({
				columns: oModel.getData().columns,
				rows: Data
			});
			this.getView().byId("cbeRecomdationTable").setModel(oModel);
			this.getView().byId("cbeRecomdationTable").bindAggregation("rows", "/rows");
			this.getView().byId("cbeRecomdationTable").setVisibleRowCount(Data.length);
			this.getView().byId("cbeRecomdationTable").updateBindings(true);
		},
		/**
		 *function name : _getTempDisable
		 *Reason :  To create a different row template for oHeaderTable depending upon the input type and it is non editable
		 *input parameters: colmId 
		 *return: null*/
		_getTempDisable: function(colmId, context) {
			var self = this;
			var value = "{" + colmId + "}";
			var MeetsTechSpeckey = formatter.comboBox(context.oModel.getData().rows[11][colmId]);
			var MeetsComReqkey = formatter.comboBox(context.oModel.getData().rows[12][colmId]);
			var AccptModecTckey = formatter.comboBox(context.oModel.getData().rows[13][colmId]);
			var CommisionSpareskey = formatter.comboBox(context.oModel.getData().rows[14][colmId]);
			var YrsSpareskey = formatter.comboBox(context.oModel.getData().rows[15][colmId]);
			var ServRateAgreedkey = formatter.comboBox(context.oModel.getData().rows[16][colmId]);
			var template = new sap.m.VBox({
				items: [
					new sap.m.Text({
						text: value,
						visible: '{= ${type} === "Text" ? true : false }'
					}),
					new sap.m.Text({
						text: value,
						visible: '{= ${type} === "PaymentTermInput" ? true : false }'
					}),
					new sap.m.Text({
						text: value,
						visible: '{= ${type} === "FreigtModeInput" ? true : false }'
					}),
					new sap.m.Text({
						text: value,
						visible: '{= ${type} === "Input20" ? true : false }'
					}),
					new sap.m.Text({
						text: value,
						visible: '{= ${type} === "Input" ? true : false }'
					}),
					new sap.m.Text({
						text: value,
						visible: '{= ${type} === "RevInput" ? true : false }'
					}),
					new sap.m.Text({
						text: MeetsComReqkey,
						visible: '{= ${type} === "MeetsComReqInputPopup" ? true : false }'
					}),
					new sap.m.Text({
						text: AccptModecTckey,
						visible: '{= ${type} === "AccptModecTcInputPopup" ? true : false }'
					}),
					new sap.m.Text({
						text: MeetsTechSpeckey,
						visible: '{= ${type} === "MeetsTechSpecInputPopup" ? true : false }'
					}),
					new sap.m.Text({
						text: CommisionSpareskey,
						visible: '{= ${type} === "CommisionSparesInputPopup" ? true : false }'
					}),
					new sap.m.Text({
						text: YrsSpareskey,
						visible: '{= ${type} === "YrsSparesInputPopup" ? true : false }'
					}),
					new sap.m.Text({
						text: ServRateAgreedkey,
						visible: '{= ${type} === "ServRateAgreedInputPopup" ? true : false }'
					})

				]
			});
			return template;
		},

		/*function name : _getWarrantyForm*/
		/*Reason :  To create a table at runtime with dynamic rows and columns & bind the table with Warranty details of different vendors */
		/*input parameters: OData1, OData */
		/*return: null*/

		_getWarrantyForm: function(OData, bidTermComparsionEnable) {
			var self = this;
			var oWarrantyHeaderTable = this.getView().byId("warrantyTable");
			var warrantyArray = [];
			warrantyArray.push({
				id: "WarrantyClaimNo",
				desc: "Warranty Claim No",
				type: "Text"
			}, {
				id: "WarrantyPONo",
				desc: "PO Old No ",
				type: "Text"
			}, {
				id: "WarrantyDatefailure",
				desc: "Date failure Identified or Occurred",
				type: "Text"
			}, {
				id: "WarrantyTermby",
				desc: "Warranty Term",
				type: "Text"
			}, {
				id: "UrgencyofReplacementRequired",
				desc: "Urgency of Replacement Required",
				type: "Text"
			}, {
				id: "ShippinPoint",
				desc: "Shipping Defective Parts to Onshore",
				type: "ShippingLongText"
			}, {
				id: "CommentstoVendorforWarranty",
				desc: "Comments to Vendor",
				type: "CommentLongText"
			}, {
				id: "ProposedResolutionActionTaken",
				desc: "Proposed Resolution",
				type: "ProposedLongText"
			});
			var aColumnData = [{
				columnId: "No.",
				columnId2: "No."
			}, {
				columnId: "Description",
				columnId2: "Description"
			}];
			for (var j = 0; j < OData.results.length; j++) {
				aColumnData.push({
					columnId: "VName" + j,
					columnId2: OData.results[j].Name1
				});
			}
			var aData = [];
			for (var arr1 = 0; arr1 < warrantyArray.length; arr1++) {
				var item = {};
				item["No."] = arr1 + 1;
				item["Description"] = warrantyArray[arr1].desc;
				for (var val = 0; val < OData.results.length; val++) {
					for (var val1 = 0; val1 < OData.results[val].NavClaim.results.length; val1++) {
						if (OData.results[val].Lifnr === OData.results[val].NavClaim.results[val1].Lifnr) {
							if (warrantyArray[arr1].id === "WarrantyClaimNo") {
								item["VName" + val] = OData.results[val].NavClaim.results[val1].WarnClaimNo;
								item["type"] = warrantyArray[arr1].type;
							} else if (warrantyArray[arr1].id === "WarrantyPONo") {
								item["VName" + val] = OData.results[val].NavClaim.results[val1].PoOldNumber;
								item["type"] = warrantyArray[arr1].type;
							} else if (warrantyArray[arr1].id === "WarrantyDatefailure") {
								if (OData.results[val].NavClaim.results[val1].FailureDate === null) {
									item["VName" + val] = OData.results[val].NavClaim.results[val1].FailureDate;
									item["type"] = warrantyArray[arr1].type;
								} else {
									var failureDate = formatter.datechange(OData.results[val].NavClaim.results[val1].FailureDate);
									item["VName" + val] = failureDate;
									item["type"] = warrantyArray[arr1].type;
								}
							} else if (warrantyArray[arr1].id === "WarrantyTermby") {
								item["VName" + val] = OData.results[val].NavClaim.results[val1].WarnTerm;
								item["type"] = warrantyArray[arr1].type;
							} else if (warrantyArray[arr1].id === "UrgencyofReplacementRequired") {
								item["VName" + val] = OData.results[val].NavClaim.results[val1].ReplaceUrgency;
								item["type"] = warrantyArray[arr1].type;
							} else if (warrantyArray[arr1].id === "CommentstoVendorforWarranty") {
								var commentVendor = OData.results[val].NavClaim.results[val1].CommentToVendor.length;
								if (commentVendor > 30) {
									item["VName" + val] = OData.results[val].NavClaim.results[val1].CommentToVendor.substring(0, 30);
									item["VName" + val + "CommentstoVendorforWarranty"] = OData.results[val].NavClaim.results[val1].CommentToVendor;
								} else {
									item["VName" + val] = OData.results[val].NavClaim.results[val1].CommentToVendor;
									item["VName" + val + "CommentstoVendorforWarranty"] = OData.results[val].NavClaim.results[val1].CommentToVendor;
								}
								item["type"] = warrantyArray[arr1].type;
							} else if (warrantyArray[arr1].id === "ProposedResolutionActionTaken") {
								var proposedResolution = OData.results[val].NavClaim.results[val1].PropResolution.length;
								if (proposedResolution > 30) {
									item["VName" + val] = OData.results[val].NavClaim.results[val1].PropResolution.substring(0, 30);
									item["VName" + val + "ProposedResolutionActionTaken"] = OData.results[val].NavClaim.results[val1].PropResolution;
								} else {
									item["VName" + val] = OData.results[val].NavClaim.results[val1].PropResolution;
									item["VName" + val + "ProposedResolutionActionTaken"] = OData.results[val].NavClaim.results[val1].PropResolution;
								}
								item["type"] = warrantyArray[arr1].type;
							} else if (warrantyArray[arr1].id === "ShippinPoint") {
								var shippingPoint = OData.results[val].NavClaim.results[val1].ShipDefPart.length;
								if (shippingPoint > 30) {
									item["VName" + val] = OData.results[val].NavClaim.results[val1].ShipDefPart.substring(0, 30);
									item["VName" + val + "ShippinPoint"] = OData.results[val].NavClaim.results[val1].ShipDefPart;
								} else {
									item["VName" + val] = OData.results[val].NavClaim.results[val1].ShipDefPart;
									item["VName" + val + "ShippinPoint"] = OData.results[val].NavClaim.results[val1].ShipDefPart;
								}
								item["type"] = warrantyArray[arr1].type;
							}
						}
					}
				}
				aData.push(item);
			}
			var WarrantyInfoModel = new JSONModel();
			WarrantyInfoModel.setData({
				columns: aColumnData,
				rows: aData
			});
			oWarrantyHeaderTable.setModel(WarrantyInfoModel);
			oWarrantyHeaderTable.setVisibleRowCount(8);
			oWarrantyHeaderTable.setFixedColumnCount(2);
			oWarrantyHeaderTable.bindAggregation("columns", "/columns", function(index, context) {
				switch (context.getObject().columnId2) {
					case "No.":
						return new sap.ui.table.Column({
							width: "5rem",
							label: [
								new sap.m.Label({
									textAlign: "Center",
									width: "100%",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							})
						});
					case "Description":
						return new sap.ui.table.Column({
							width: "15rem",
							label: [
								new sap.m.Label({
									textAlign: "Center",
									width: "100%",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							})
						});
					default:
						return new sap.ui.table.Column({
							width: "15rem",
							label: [
								new sap.m.Label({
									textAlign: "Center",
									width: "100%",
									text: context.getObject().columnId2
								})
							],
							template: self._getWarrantyRow(context.getObject().columnId, context)
						});
				}
			});
			oWarrantyHeaderTable.bindAggregation("rows", "/rows");
			this.getView().setModel(WarrantyInfoModel, "WarrantyInfoModel");
		},
		/**
		 *function name : _getWarrantyRow
		 *Reason :  To create a different row template for oWarrantyHeaderTable depending upon the input type
		 *input parameters: colmId,context
		 *return: null*/
		_getWarrantyRow: function(colmId, context) {
			var self = this;
			var value = "{" + colmId + "}";
			if (context.oModel.getData().rows[6][colmId + "CommentstoVendorforWarranty"] !== undefined) {
				var messageTextComment = context.oModel.getData().rows[6][colmId + "CommentstoVendorforWarranty"];
			}
			if (context.oModel.getData().rows[5][colmId + "ShippinPoint"] !== undefined) {
				var messageTextShipping = context.oModel.getData().rows[5][colmId + "ShippinPoint"];
			}
			if (context.oModel.getData().rows[7][colmId + "ProposedResolutionActionTaken"] !== undefined) {
				var messageTextProposed = context.oModel.getData().rows[7][colmId + "ProposedResolutionActionTaken"];
			}
			if (messageTextComment !== "" || messageTextShipping !== "" || messageTextProposed !== "") {
				var template = new sap.m.VBox({
					items: [
						new sap.m.Text({
							text: value,
							visible: '{= ${type} === "Text" ? true : false }'
						}),
						new sap.m.Text({
							text: value,
							visible: '{= ${type} === "ShippingLongText" ? true : false }'
						}),
						new sap.m.Text({
							text: value,
							visible: '{= ${type} === "CommentLongText" ? true : false }'
						}),
						new sap.m.Text({
							text: value,
							visible: '{= ${type} === "ProposedLongText" ? true : false }'
						}),
						new sap.m.Link({
							text: "More",
							press: function() {
								MessageBox.information(
									messageTextShipping, {
										icon: sap.m.MessageBox.Icon.NONE,
										title: "Shipping Defective Parts to Onshore",
										onClose: null
									}
								);
							},
							visible: '{= ${type} === "ShippingLongText" ? true : false }'
						}),
						new sap.m.Link({
							text: "More",
							press: function() {
								MessageBox.information(
									messageTextComment, {
										icon: sap.m.MessageBox.Icon.NONE,
										title: "Comments to Vendor for Warranty",
										onClose: null
									}
								);
							},
							visible: '{= ${type} === "CommentLongText" ? true : false }'
						}),
						new sap.m.Link({
							text: "More",
							press: function() {
								MessageBox.information(
									messageTextProposed, {
										icon: sap.m.MessageBox.Icon.NONE,
										title: "Proposed Resolution",
										onClose: null
									}
								);
							},
							visible: '{= ${type} === "ProposedLongText" ? true : false }'
						})
					]
				});
			} else {
				var template = new sap.m.VBox({
					items: [
						new sap.m.Text({
							text: value,
							visible: '{= ${type} === "Text" ? true : false }'
						}),
						new sap.m.Text({
							text: value,
							visible: '{= ${type} === "ShippingLongText" ? true : false }'
						}),
						new sap.m.Text({
							text: value,
							visible: '{= ${type} === "CommentLongText" ? true : false }'
						}),
						new sap.m.Text({
							text: value,
							visible: '{= ${type} === "ProposedLongText" ? true : false }'
						})
					]
				});
			}
			return template;
		},
		/**
		 *function name : _getTemp
		 *Reason :  To create a different row template for oHeaderTable depending upon the input type
		 *input parameters: colmId 
		 *return: null*/
		_getTemp: function(colmId, context) {
			var self = this;
			var value = "{" + colmId + "}";
			var MeetsTechSpeckey = context.oModel.getData().rows[11][colmId];
			var MeetsComReqkey = context.oModel.getData().rows[12][colmId];
			var AccptModecTckey = context.oModel.getData().rows[13][colmId];
			var CommisionSpareskey = context.oModel.getData().rows[14][colmId];
			var YrsSpareskey = context.oModel.getData().rows[15][colmId];
			var ServRateAgreedkey = context.oModel.getData().rows[16][colmId];
			var template = new sap.m.VBox({
				items: [
					new sap.m.Input({
						value: value,
						visible: '{= ${type} === "PaymentTermInput" ? true : false }',
						valueHelpRequest: function(oEvent) {
							var PageData = {
								"Input": oEvent.getSource()
							};
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
							var pModel = new sap.ui.model.json.JSONModel();
							pModel.setData(PageData);
							self.getView().setModel(pModel, 'Properties');
							var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
							var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
							var readRequestURL = "/SearchhelpsSet/?$filter=Zinput eq 'TERM'";
							oMod.read(readRequestURL, {
								success: function(AssignedTOData) {
									var AssignedToModel = new JSONModel();
									AssignedToModel.setData(AssignedTOData);
									var _oDialog2 = self._getDialog2();
									_oDialog2.setModel(AssignedToModel);
									_oDialog2.open();
								}
							});
						},
						showValueHelp: true,
						valueHelpOnly: true
					}),
					new sap.m.Input({
						value: value,
						visible: '{= ${type} === "FreigtModeInput" ? true : false }',
						valueHelpRequest: function(oEvent) {
							var PageData = {
								"Input": oEvent.getSource()
							};
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
							var pModel = new sap.ui.model.json.JSONModel();
							pModel.setData(PageData);
							self.getView().setModel(pModel, 'Properties');
							var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
							var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
							var readRequestURL = "/SearchhelpsSet/?$filter=Zinput eq 'SHIP'";
							oMod.read(readRequestURL, {
								success: function(AssignedTOData1) {
									var AssignedToModel1 = new JSONModel();
									AssignedToModel1.setData(AssignedTOData1);
									var _oDialog3 = self._getDialog3();
									_oDialog3.setModel(AssignedToModel1);
									_oDialog3.open();
								}
							});
						},
						showValueHelp: true,
						valueHelpOnly: true
					}),
					new sap.m.Input({
						value: value,
						maxLength: 20,
						visible: '{= ${type} === "Input20" ? true : false }',
						change: function(oEvent) {
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
							self.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/Warranty", oEvent.getParameters().value);
						}
					}),
					new sap.m.Input({
						value: value,
						maxLength: 6,
						visible: '{= ${type} === "Input" ? true : false }',
						change: function(oEvent) {
							oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
							if (oEvent.getParameters().value <= 100 && oEvent.getParameters().value >= 0) {
								//if ((oEvent.getParameters().value <= 100 && oEvent.getParameters().value >= 0) || oEvent.getParameters().value === "") {
								errorFlag = "";
								columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
								var finalValue = formatter.floatFormatter(oEvent.getParameters().value);
								oEvent.getSource().setValue(finalValue);
								self.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/LocalContent", finalValue);
							} else {
								oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
								errorFlag = true;
							}
						}
					}),
					new sap.m.Input({
						value: value,
						visible: '{= ${type} === "RevInput" ? true:false }',
						maxLength: 4,
						change: function(oEvent) {
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
							self.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/RevisionNo", oEvent.getParameters().value);
						}
					}),
					new sap.m.Text({
						text: value,
						visible: '{= ${type} === "Text" ? true : false }'
					}),
					new sap.m.Select({
						selectedKey: MeetsComReqkey,
						visible: '{= ${type} === "MeetsComReqInputPopup" ? true : false }',
						items: [new sap.ui.core.ListItem({
							key: "0",
							text: " "
						}), new sap.ui.core.ListItem({
							key: "Y",
							text: "Yes"
						}), new sap.ui.core.ListItem({
							key: "N",
							text: "No"
						}), new sap.ui.core.ListItem({
							key: "O",
							text: "Optional"
						})],
						change: function(oEvent) {
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
							self.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/MeetsComReq", oEvent.getParameters().selectedItem.getProperty(
								"key"));
						}
					}),
					new sap.m.Select({
						selectedKey: AccptModecTckey,
						visible: '{= ${type} === "AccptModecTcInputPopup" ? true : false }',
						items: [new sap.ui.core.ListItem({
							key: "0",
							text: " "
						}), new sap.ui.core.ListItem({
							key: "Y",
							text: "Yes"
						}), new sap.ui.core.ListItem({
							key: "N",
							text: "No"
						}), new sap.ui.core.ListItem({
							key: "O",
							text: "Optional"
						})],
						change: function(oEvent) {
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
							self.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/AccptModecTc", oEvent.getParameters().selectedItem.getProperty(
								"key"));
						}
					}),
					new sap.m.Select({
						selectedKey: MeetsTechSpeckey,
						visible: '{= ${type} === "MeetsTechSpecInputPopup" ? true : false }',
						items: [new sap.ui.core.ListItem({
							key: "0",
							text: " "
						}), new sap.ui.core.ListItem({
							key: "Y",
							text: "Yes"
						}), new sap.ui.core.ListItem({
							key: "N",
							text: "No"
						}), new sap.ui.core.ListItem({
							key: "O",
							text: "Optional"
						})],
						change: function(oEvent) {
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
							self.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/MeetsTechSpec", oEvent.getParameters().selectedItem
								.getProperty(
									"key"));
						}
					}),
					new sap.m.Select({
						selectedKey: CommisionSpareskey,
						visible: '{= ${type} === "CommisionSparesInputPopup" ? true : false }',
						items: [new sap.ui.core.ListItem({
							key: "0",
							text: " "
						}), new sap.ui.core.ListItem({
							key: "Y",
							text: "Yes"
						}), new sap.ui.core.ListItem({
							key: "N",
							text: "No"
						}), new sap.ui.core.ListItem({
							key: "O",
							text: "Optional"
						})],
						change: function(oEvent) {
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;

							self.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/CommisionSpares", oEvent.getParameters().selectedItem
								.getProperty(
									"key"));
						}
					}),
					new sap.m.Select({
						selectedKey: YrsSpareskey,
						visible: '{= ${type} === "YrsSparesInputPopup" ? true : false }',
						items: [new sap.ui.core.ListItem({
							key: "0",
							text: " "
						}), new sap.ui.core.ListItem({
							key: "Y",
							text: "Yes"
						}), new sap.ui.core.ListItem({
							key: "N",
							text: "No"
						}), new sap.ui.core.ListItem({
							key: "O",
							text: "Optional"
						})],
						change: function(oEvent) {
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
							self.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/YrsSpares", oEvent.getParameters().selectedItem.getProperty(
								"key"));
						}
					}),
					new sap.m.Select({
						selectedKey: ServRateAgreedkey,
						visible: '{= ${type} === "ServRateAgreedInputPopup" ? true : false }',
						items: [new sap.ui.core.ListItem({
							key: "0",
							text: " "
						}), new sap.ui.core.ListItem({
							key: "Y",
							text: "Yes"
						}), new sap.ui.core.ListItem({
							key: "N",
							text: "No"
						}), new sap.ui.core.ListItem({
							key: "O",
							text: "Optional"
						})],
						change: function(oEvent) {
							columnNo = oEvent.getSource().getParent().getCustomData()[0].getProperty("value") - 2;
							self.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/ServRateAgreed", oEvent.getParameters().selectedItem
								.getProperty(
									"key"));
						}
					})

				]
			});
			return template;
		},
		/**
		 *function name : _getrankingComparisonDisable
		 *Reason :  Depending upon rfqstatus Ranking Table is disabled
		 *input parameters: OData, oFilters
		 *return: null*/
		_getrankingComparisonDisable: function(OData, oFilters) {
			var self = this;
			var rankingURL = "/ApproveSet";
			this.getView().getModel().read(rankingURL, {
				filters: oFilters,
				urlParameters: {
					$expand: "NavUpdateRank"
				},
				success: function(AssignedData) {
					var rankingModel = new JSONModel();
					var newRankingModel = new JSONModel();
					var newRankArray = [];

					if (AssignedData.results[0].NavUpdateRank.results.length > 0) {
						for (var ctr2 = 0; ctr2 < AssignedData.results[0].NavUpdateRank.results.length; ctr2++) {
							AssignedData.results[0].NavUpdateRank.results[ctr2].editable = false;
						}
					}
					for (var j = 0; j < AssignedData.results[0].NavUpdateRank.results.length; j++) {
						newRankArray.push({
							Key: AssignedData.results[0].NavUpdateRank.results[j].Value,
							Value: AssignedData.results[0].NavUpdateRank.results[j].Value,
							editable: false
						});
					}
					newRankingModel.setData(newRankArray);
					self.getView().setModel(newRankingModel, "newRankingModel");
					rankingModel.setData(AssignedData.results[0].NavUpdateRank);
					self.getView().byId("idRankTable").setModel(rankingModel, "rankingModel");
					if (AssignedData.results[0].NavUpdateRank.results.length > 0) {
						for (var ctr3 = 0; ctr3 < AssignedData.results[0].NavUpdateRank.results.length; ctr3++) {
							AssignedData.results[0].NavUpdateRank.results[ctr3].editable = false;
							self.getView().byId("idRankTable").getItems()[ctr3].getCells()[3].setProperty("selectedKey", AssignedData.results[
								0].NavUpdateRank.results[ctr3].Value);
							self.getView().byId("idRankTable").getItems()[ctr3].getCells()[3].setEnabled(false);
						}
					}
					self.getView().byId("routeForApprovalButton").setEnabled(false);
				}
			});

		},
		/**
		 *function name : _getrankingComparison
		 *Reason :  Depending upon rfqstatus Ranking Table is Enabled
		 *input parameters: OData,oFilters 
		 *return: null*/
		_getrankingComparison: function(OData, oFilters) {
			var self = this;
			var rankingURL = "/ApproveSet";
			this.getView().getModel().read(rankingURL, {
				filters: oFilters,
				urlParameters: {
					$expand: "NavUpdateRank"
				},
				success: function(AssignedData) {
					var rankingModel = new JSONModel();
					var newRankingModel = new JSONModel();
					var newRankArray = [];

					newRankArray.push({
						Key: "Y",
						Value: "  ",
						editable: "true"
					});
					for (var i = 0; i < AssignedData.results[0].NavUpdateRank.results.length; i++) {
						var val = i + 1;
						newRankArray.push({
							Key: i,
							Value: "0" + val,
							editable: "true"
						});
					}
					newRankArray.push({
						Key: "X",
						Value: "Reject",
						editable: "true"
					});
					if (AssignedData.results[0].NavUpdateRank.results.length > 0) {
						for (var ctr1 = 0; ctr1 < AssignedData.results[0].NavUpdateRank.results.length; ctr1++) {
							AssignedData.results[0].NavUpdateRank.results[ctr1].editable = true;
						}
					}
					newRankingModel.setData(newRankArray);
					self.getView().setModel(newRankingModel, "newRankingModel");
					rankingModel.setData(AssignedData.results[0].NavUpdateRank);
					self.getView().byId("idRankTable").setModel(rankingModel, "rankingModel");
					if (AssignedData.results[0].NavUpdateRank.results.length > 0) {
						for (var ctr3 = 0; ctr3 < AssignedData.results[0].NavUpdateRank.results.length; ctr3++) {
							self.getView().byId("idRankTable").getItems()[ctr3].getCells()[3].setProperty("selectedKey", AssignedData.results[
								0].NavUpdateRank.results[ctr3].Value);
							self.getView().byId("idRankTable").getItems()[ctr3].getCells()[3].setEnabled(true);
						}
					}
				}
			});
		},
		/**
		 *function name : _getApproverList
		 *Reason :  Approved vendor is binded to Approver List Table
		 *input parameters: sObjectId
		 *return: null*/
		_getApproverList: function(sObjectId) {
			var self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_CBE_COMPARISON_SCREEN_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/ApproverListSet?$filter=Screen eq 'CBE' and PrNo eq " + "'" + sObjectId + "'";
			oMod.read(readRequestURL, {
				success: function(oData) {
					var oApproveModel = new JSONModel();
					var oCommentModel = new JSONModel();
					var oDeclineVendor = new JSONModel();
					oApproveModel.setData(oData);
					self.getView().byId("approveListTable").setModel(oApproveModel, "oApproveModel");
					var approverListLength = self.getView().byId("approveListTable").getModel("oApproveModel").getData().results.length;
					if (approverListLength === 0) {
						self.getView().byId("approveListTable").setVisibleRowCount(1);
					} else {
						self.getView().byId("approveListTable").setVisibleRowCount(approverListLength);
					}
					if (approverListLength > 0 && oData.results.length > 0) {
						oCommentModel.setData(oData.results[0]);
						var commentList = formatter.HeaderText(oCommentModel.getData().CommentHistory);
						self.getView().byId("commentID").setValue(commentList);
					} else {
						self.getView().byId("commentID").setValue("");
					}
				}
			});
		},
		/**
		 *function name : _getDeclinedVendorList
		 *Reason :  Declined vendor is binded to Decline Vendor List
		 *input parameters: sObjectId
		 *return: null*/
		_getDeclinedVendorList: function(sObjectId) {
			var self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_CBE_COMPARISON_SCREEN_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/DeclinedVendorSet?$filter=Banfn eq" + "'" + sObjectId + "'";
			oMod.read(readRequestURL, {
				success: function(oDeclineVendorData) {
					var oDeclineModel = new JSONModel();
					oDeclineModel.setData(oDeclineVendorData);
					self.getView().byId("declineVendorTable").setModel(oDeclineModel, "oDeclineModel");
					var declineVendorLength = self.getView().byId("declineVendorTable").getModel("oDeclineModel").getData().results.length;
					if (declineVendorLength === 0) {
						self.getView().byId("declineVendorTable").setVisibleRowCount(1);
					} else {
						self.getView().byId("declineVendorTable").setVisibleRowCount(declineVendorLength);
					}
				}
			});
		},

		/**
		 *function name : _getAttachments
		 *Reason :  To show the attachment list in attachment Tab.
		 *input parameters: sObjectId 
		 *return: null*/
		_getAttachments: function(sObjectId) {
			/*var tabTecId = this.getView().byId("techDoc");*/
			var tabComId = this.getView().byId("commDoc");
			var tabVendorTecId = this.getView().byId("techVendorDoc");
			var tabVendorComId = this.getView().byId("commVendorDoc");
			var jsonModTec = new sap.ui.model.json.JSONModel();
			var jsonModCom = new sap.ui.model.json.JSONModel();
			var jsonVendorModTec = new sap.ui.model.json.JSONModel();
			var jsonVendorModCom = new sap.ui.model.json.JSONModel();
			var datArray = new Array();
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_RFQ_ATTACHMENTS_SRV";
			var requrl = "/AttachmentListSet?$filter=Objid eq'" + sObjectId + "' and Objetype eq'" + "PR" + "' and Screen eq'" + "CBE" + "'";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			oMod.read(requrl, null, null, true, function(oData, oResponse) {
					var data = oData.results;
					jQuery.each(data, function(id, record) {
						datArray.push(record);
					});

					var zTec = [];
					var zCom = [];
					var zVTec = [];
					var zVCom = [];
					if (data.length !== 0) {
						for (var i = 0; i < data.length; i++) {
							if (data[i].VendorAttached === "") {
								if (data[i].Bsart === "ZTEC") {
									zTec.push(data[i]);
								} else {
									zCom.push(data[i]);
								}
							} else {
								if (data[i].Bsart === "ZTEC") {
									zVTec.push(data[i]);
								} else {
									zVCom.push(data[i]);
								}

							}
						}
					}

					jsonModTec.setData(zTec);
					jsonModCom.setData(zCom);
					jsonVendorModTec.setData(zVTec);
					jsonVendorModCom.setData(zVCom);
					// tabTecId.setModel(jsonModTec, "jsonModTec");
					//tabComId.setModel(jsonModCom, "jsonModCom");
					// tabVendorTecId.setModel(jsonVendorModTec, "jsonVendorModTec");
					// tabVendorComId.setModel(jsonVendorModCom, "jsonVendorModCom");

				},
				function(oError) {

				});
		},
		/**
		 *function name : Unit
		 *Reason :  On Click Unit dialog is opened and data is binded in dialog box
		 *input parameters: oEvent
		 *return: null*/
		Unit: function(oEvent) {
			var self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/DMSearchHelpSet?$filter=Zinput eq 'Unit' and Werks eq '" + Plant + "'" + " and Banfn eq '" + rfq_number +
				"'";
			oMod.read(readRequestURL, {
				success: function(attachmentData) {
					var attachmentModel = new JSONModel();
					attachmentModel.setData(attachmentData);
					var _oAttachmentDialog = self._getAttachmentDialog();
					_oAttachmentDialog.setModel(attachmentModel);
					_oAttachmentDialog.open();
				}
			});
		},
		/**
		 *function name : _getAttachmentDialog
		 *Reason :  On click of Unit in Attachment Tab display Unit Dialog Box
		 *input parameters: null
		 *return: null*/
		_getAttachmentDialog: function() {
			// create dialog via fragment factory
			this._oAttachmentDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.Unit", this);
			return this._oAttachmentDialog;
		},
		/**
		 *function name : _handleValueHelpSearchUnit
		 *Reason : Helps us to do search operation in Unit Fragment.
		 *input parameters: oEvent
		 *return: null*/
		_handleValueHelpSearchUnit: function(oEvent) {
			// add filter for search
			var aFilters = [];
			var sQuery = oEvent.getParameters().value;
			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("Unit", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			var binding = oEvent.getSource().getBinding("items");
			binding.filter(aFilters, "Application");
		},
		/**
		 *function name :_onPress      //Deepthi FETR0013312
		 *Reason : Calculate Button 
		 *input parameters: oEvent
		 *return: null*/
		onPress: function(oEvent) {

			var that = this;
			var OTableHeaderModelData = this.getView().getModel("tab1HeaderModel").getData();
			var oCur = OTableHeaderModelData.TqPriceCur;
			var oQuotedVal = oFloatFormat.parse(OTableHeaderModelData.TqPrice); //separator change
			var oEstdCur = OTableHeaderModelData.EstdPoCur;
			var oEstdVal = oFloatFormat.parse(OTableHeaderModelData.EstdPoValue); //separator change
			var oTotBud = oFloatFormat.parse(OTableHeaderModelData.TotBudget); //separator change
			var oCurFilter = new sap.ui.model.Filter("TqPriceCur", sap.ui.model.FilterOperator.EQ, oCur);
			var oQuotedValFilter = new sap.ui.model.Filter("TqPrice", sap.ui.model.FilterOperator.EQ, oQuotedVal);
			var oEstdCurFilter = new sap.ui.model.Filter("EstdPoCur", sap.ui.model.FilterOperator.EQ, oEstdCur);
			var oEstdValFilter = new sap.ui.model.Filter("EstdPoValue", sap.ui.model.FilterOperator.EQ, oEstdVal);
			var oTotBudFilter = new sap.ui.model.Filter("TotBudget", sap.ui.model.FilterOperator.EQ, oTotBud);
			var oFilter = new sap.ui.model.Filter({
				filters: [oCurFilter, oQuotedValFilter, oEstdCurFilter, oEstdValFilter, oTotBudFilter],
				and: true
			});
			if (this.getView().byId("Currencyid").getValue() === "") {
				this.getView().byId("Currencyid").setValueState(sap.ui.core.ValueState.Error);
			} else {
				this.getView().byId("Currencyid").setValueState(sap.ui.core.ValueState.None);
			}
			if (this.getView().byId("EstCurrencyid").getValue() === "") {
				this.getView().byId("EstCurrencyid").setValueState(sap.ui.core.ValueState.Error);
			} else {
				this.getView().byId("EstCurrencyid").setValueState(sap.ui.core.ValueState.None);
			}
			this.oMod.read("/CalcbuttonSet", {
				filters: [oFilter],
				async: false,
				success: function(OData) {
					var oTabModel1 = that.getView().getModel("tab1HeaderModel");
					if (OData.results[0].ExErMsg != "") {
						MessageBox.error(OData.results[0].ExErMsg);
						/*oTabModel1.setProperty("/BudBal", "");
						oTabModel1.setProperty("/PotSav", "");*/
					}
					//	var oTabModel1 = that.getView().getModel("tab1HeaderModel"); // For bb and Ps backend data display
					else {
						oTabModel1.setProperty("/BudBal", OData.results[0].BudBal);
						oTabModel1.setProperty("/PotSav", OData.results[0].PotSav);
					}
					oTabModel1.refresh(true);
				},
				error: function(oError) {}

			});
		}, //Deepthi FETR0013312

		// /**
		//  *function name : onSelectDialogItemUnit
		//  *Reason : On select of particular Unit it gets binded to the HeaderModel 
		//  * so that we can pass the vlaue at the backend at the time of save.
		//  *input parameters: oEvent
		//  *return: null*/
		onSelectDialogItemUnit: function(oEvent) {
			this.getView().byId("unitId").setValue(oEvent.getParameters().selectedItem.getProperty("title"));
			oEvent.getSource().getBinding("items").filter([]);
			this.getView().byId("unitId").setValueState(sap.ui.core.ValueState.None);
		},

		/**
		 *function name : _handleValueHelpCloseUnit
		 *Reason :  On click of cancel button it will destroy the Unit fragment
		 *input parameters: null
		 *return: null*/
		_handleValueHelpCloseUnit: function() {
			this._getAttachmentDialog().destroy();
		},
		/**
		 *function name : Unit
		 *Reason :  On Click Unit dialog is opened and data is binded in dialog box
		 *input parameters: oEvent
		 *return: null*/
		Phase: function(oEvent) {
			var self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/DMSearchHelpSet?$filter=Zinput eq 'Phase' and Werks eq '" + Plant + "'" + " and Banfn eq '" + rfq_number +
				"'";
			oMod.read(readRequestURL, {
				success: function(phaseData) {
					var attachmentModel = new JSONModel();
					attachmentModel.setData(phaseData);
					var _oAttachmentDialog = self._getPhaseDialog();
					_oAttachmentDialog.setModel(attachmentModel);
					_oAttachmentDialog.open();
				}
			});
		},
		/**
		 *function name : _getAttachmentDialog
		 *Reason :  On click of Unit in Attachment Tab display Unit Dialog Box
		 *input parameters: null
		 *return: null*/
		_getPhaseDialog: function() {
			// create dialog via fragment factory
			this._oAttachmentDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.Phase", this);
			return this._oAttachmentDialog;
		},
		/**
		 *function name : _handleValueHelpSearchPhase
		 *Reason : Helps us to do search operation in Phase Fragment.
		 *input parameters: oEvent
		 *return: null*/
		_handleValueHelpSearchPhase: function(oEvent) {
			// add filter for search
			var aFilters = [];
			var sQuery = oEvent.getParameters().value;
			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("Phase", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			var binding = oEvent.getSource().getBinding("items");
			binding.filter(aFilters, "Application");
		},

		/**
		 *function name : onSelectDialogItemPhase
		 *Reason : On select of particular Phase it gets binded to the HeaderModel 
		 * so that we can pass the vlaue at the backend at the time of save.
		 *input parameters: oEvent
		 *return: null*/
		onSelectDialogItemPhase: function(oEvent) {
			this.getView().byId("phaseId").setValue(oEvent.getParameters().selectedItem.getProperty("title"));
			oEvent.getSource().getBinding("items").filter([]);
			this.getView().byId("phaseId").setValueState(sap.ui.core.ValueState.None);
		},

		/**
		 *function name : _handleValueHelpClosePhase
		 *Reason :  On click of cancel button it will destroy the Phase fragment
		 *input parameters: null
		 *return: null*/
		_handleValueHelpClosePhase: function() {
			this._getPhaseDialog().destroy();
		},
		//	documentNoChange: function() {

		// 	this.getView().byId("documentNoId").setValueState(sap.ui.core.ValueState.None);
		// },
		/**
		 *function name : getTecPdf
		 *Reason :  To download the technical document present in attachment list.
		 *input parameters: oEvent 
		 *return: null*/
		getTecPdf: function(oEvent) {
			var getArcDocID = oEvent.getSource().getProperty("alt").split("-");
			var ArcDocId = getArcDocID[0];
			var rfqNo = getArcDocID[1];
			var sRead = "/AttachmentSet(Objid='" + rfqNo + "',ArcDocId='" + ArcDocId + "')";
			var sURI = "/sap/opu/odata/sap/ZPTP_RFQ_ATTACHMENTS_SRV" + sRead + "/$value";
			sURI = encodeURI(sURI);
			window.open(sURI, "_blank");
		},

		/**
		 *function name : getComPdf
		 *Reason :  To download the commercial document present in attachment list.
		 *input parameters: oEvent 
		 *return: null*/
		getComPdf: function(oEvent) {
			var getArcDocID = oEvent.getSource().getProperty("alt").split("-");
			var ArcDocId = getArcDocID[0];
			var rfqno = getArcDocID[1];
			var sRead = "/AttachmentSet(Objid='" + rfqno + "',ArcDocId='" + ArcDocId + "')";
			var sURI = "/sap/opu/odata/sap/ZPTP_RFQ_ATTACHMENTS_SRV" + sRead + "/$value";
			sURI = encodeURI(sURI);
			window.open(sURI, "_blank");
		},

		estimatedPoDateChange: function(oEvent) {
			this.estdTimeForShippingChange(oEvent);
		},
		estdDelLeadTimeChange: function(oEvent) {
			if ((oEvent.getParameters().value < 1000 && oEvent.getParameters().value >= 0) || this.getView().byId("estdDelLeadTimeId").getValue() ===
				"") {
				if (errorFlag === "") {
					errorFlag = "";
				}
				this.getView().byId("estdDelLeadTimeId").setValueState(sap.ui.core.ValueState.None);
				this.estdTimeForShippingChange(oEvent);
			} else {
				this.getView().byId("estdDelLeadTimeId").setValueState(sap.ui.core.ValueState.Error);
				errorFlag = true;
			}
		},
		/**
		 *function name : DeliveryFloatDays
		 *Reason :  To calculate delivery float days.
		 *input parameters: oEvent 
		 *return: null*/
		estdTimeForShippingChange: function(oEvent) {
			if ((this.getView().byId("estdTimeForShippingId").getValue() > 999 || this.getView().byId("estdTimeForShippingId").getValue() <
					0) &&
				this.getView().byId("estdTimeForShippingId").getValue() !== "") {
				this.getView().byId("estdTimeForShippingId").setValueState(sap.ui.core.ValueState.Error);
				errorFlag = true;
			} else {
				errorFlag = "";
				this.getView().byId("estdTimeForShippingId").setValueState(sap.ui.core.ValueState.None);
				if (this.getView().byId("reqdOnsiteDateId").getValue() !== "") {
					if (this.getView().byId("estimatedPoDateId").getValue() === "") {
						this.getView().byId("deliveryFloatDaysId").setValue("");
					} else {
						var date1 = this.getView().byId("reqdOnsiteDateId").getValue().split("-");
						var date2 = date1[1] + '/' + date1[0] + '/' + date1[2];
						var reqdOnsiteDate = new Date(date2);
						var date4;
						var date3 = this.getView().byId("estimatedPoDateId").getValue().split("/");
						if (date3.length < 3) {
							date3 = this.getView().byId("estimatedPoDateId").getValue().split("-");
							date4 = date3[1] + '/' + date3[0] + '/' + date3[2];
							if (date3.length < 3) {
								date3 = this.getView().byId("estimatedPoDateId").getValue().split(".");
								date4 = date3[1] + '/' + date3[0] + '/' + date3[2];
							}
						} else {
							date4 = date3[0] + '/' + date3[1] + '/' + date3[2];
						}
						var estimatedPoDate = new Date(date4);
						var estdDelLeadTimeDays = this.getView().byId("estdDelLeadTimeId").getValue() * 7;
						var estdTimeForShippingDays = this.getView().byId("estdTimeForShippingId").getValue() * 7;
						var finalDate = new Date(estimatedPoDate.setDate(estimatedPoDate.getDate() + (estdDelLeadTimeDays + estdTimeForShippingDays)));
						var finalDays = (reqdOnsiteDate - finalDate) / 1000 / 60 / 60 / 24;
						if (finalDays < 0) {
							this.getView().byId("deliveryFloatDaysId").addStyleClass("inputBoxCss");
						} else {
							this.getView().byId("deliveryFloatDaysId").removeStyleClass("inputBoxCss");
						}
						this.getView().byId("deliveryFloatDaysId").setValue(finalDays);
					}
				}
			}

		},

		/**
		 *function name : totalQuotedPriceAfterTechnicalQueryConfirmChanges
		 *Reason :  To calculate estimate po value if we change total budget avialable value.
		 *input parameters: null 
		 *return: null*/
		/*Added by Deepthi FETR0013312*/
		totalQuotedPriceAfterTechnicalQueryConfirmChanges: function() {
			//totalQuotedPriceAfterTechnicalQueryConfirmId
			// var totalQuotedPriceAfterTechnicalQueryConfirm = oFloatFormat.parse(this.getView().byId(
			// 	"totalQuotedPriceAfterTechnicalQueryConfirmId").getValue());
			// this.getView().byId("totalQuotedPriceAfterTechnicalQueryConfirmId").setValue(totalQuotedPriceAfterTechnicalQueryConfirm);
			// this.estimatePoValueChange();    Deepthi
		},

		/**
		 *function name : totalBudgetAvailableChange
		 *Reason :  To calculate estimate po value if we change total budget avialable value.
		 *input parameters: null 
		 *return: null*/
		totalBudgetAvailableChange: function() {
			var totalBudgetValue = formatter.pricefloatFormatter(this.getView().byId("totalBudgetAvailableId").getValue());
			this.getView().byId("totalBudgetAvailableId").setValue(totalBudgetValue);
			this.estimatePoValueChange();
		},
		//start of changes by nagesh FETR0013312
		totalBudgetAvailableChange1: function() {
			// Seperator change
			
			// var totalBudgetValue = oFloatFormat.parse(this.getView().byId("totalBudgetAvailableId1").getValue());
			// this.getView().byId("totalBudgetAvailableId1").setValue(totalBudgetValue);
			// this.estimatePoValueChange();  DeEPTHI
		},
		//end of changes
		/**
		 *function name : estimatePoValueChange
		 *Reason :  To calculate balance which will be calculated  on the basis of Total Budget adn estimated PO Value.
		 *input parameters: oEvent 
		 *return: null*/
		estimatePoValueChange: function(oEvent) {
			var totalBudget = this.getView().byId("totalBudgetAvailableId").getValue();
			var estimatePoValue = formatter.pricefloatFormatter(this.getView().byId("estimatePoValueId").getValue());
			this.getView().byId("estimatePoValueId").setValue(estimatePoValue);
			var balance = formatter.pricefloatFormatter(totalBudget - estimatePoValue);
			this.getView().byId("balanceId").setValue(balance);
			if ((totalBudget - estimatePoValue) < 0) {
				this.getView().byId("balanceId").addStyleClass("inputBoxCss");
			} else {
				this.getView().byId("balanceId").removeStyleClass("inputBoxCss");
			}
		},

		////////////////////////////////////////////////////Route For Approval Button//////////////////////////////////////////////		
		/**
		 *function name : routeForApprove
		 *Reason :  On click of Route for approval button display Confirm fragment
		 *input parameters: oEvent 
		 *return: null*/
		routeForApprove: function(oEvent) {
			this._oConfirmDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.Confirm", this);
			saveFlag = "";
			return this._oConfirmDialog.open();
		},
		/**
		 *function name : routeForApprove
		 *Reason :  On click of cancel button it will destroy the Confirm fragment
		 *input parameters: oEvent 
		 *return: null*/
		destroyDialog: function() {
			var self = this;
			self._oConfirmDialog.destroy();
		},

		/**
		 *function name : saveButton
		 *Reason :  On click of Save button we pass saveFlag as X after which route for approval function is triggered.
		 *input parameters: null 
		 *return: null*/
		saveButton: function() {
			if (errorFlag === "") {
				saveFlag = "X";
				this._oConfirmDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.SaveConfirm", this);
				return this._oConfirmDialog.open();
			} else {
				MessageBox.error("Please enter the valid data");
			}
		},
		/**
		 *function name : routeForApprove
		 *Reason :  On click of cancel button it will destroy the SaveConfirm fragment
		 *input parameters: oEvent 
		 *return: null*/
		destroySaveDialog: function() {
			var self = this;
			self._oConfirmDialog.destroy();
		},

		/**
		 *function name : acceptButton
		 *Reason :  On click of Accept button ranking is been sent to the backend and route for approval process is done
		 *input parameters: oEvent 
		 *return: null*/
		acceptButton: function(oEvent) {
			this._oConfirmDialog.destroy();
			var vendorLength = this.getView().byId("idRankTable").getModel("rankingModel").getData().results.length;
			for (var rankColumn = 0; rankColumn < vendorLength; rankColumn++) {
				if (this.getView().byId("idRankTable").getItems()[rankColumn].getCells()[3].getSelectedItem().getText() === "  ") {
					this.getView().byId("idRankTable").getItems()[rankColumn].getCells()[3].addStyleClass("SelectError");
					var flag = "X";
					if (saveFlag === "X") {
						flag = "";
						this.getView().byId("idRankTable").getItems()[rankColumn].getCells()[3].removeStyleClass("SelectError");
					}
				} else {
					this.getView().byId("idRankTable").getItems()[rankColumn].getCells()[3].removeStyleClass("SelectError");
				}
			}
			if (flag !== "X") {
				var UpdateRankSet = [];
				for (rankColumn = 0; rankColumn < vendorLength; rankColumn++) {
					var key = this.getView().byId("idRankTable").getItems()[rankColumn].getCells()[3].getSelectedItem().getText();
					var rankNotes = this.getView().byId("idRankTable").getItems()[rankColumn].getCells()[4].getValue();
					UpdateRankSet.push({
						Zranking: key,
						Lifnr: this.getView().byId("idRankTable").getModel("rankingModel").getData().results[rankColumn].Lifnr,
						RankingNotes: rankNotes
					});
					this.getView().byId("idRankTable").getItems()[rankColumn].getCells()[3].removeStyleClass("SelectError");
				}
				var checkDup = 0;
				for (var rankcheck = 0; rankcheck < UpdateRankSet.length; rankcheck++) {
					var TempRank = UpdateRankSet[rankcheck].Zranking;
					for (var rankDuplicate = rankcheck + 1; rankDuplicate < UpdateRankSet.length; rankDuplicate++) {
						var TempRankDup = UpdateRankSet[rankDuplicate].Zranking;
						if (TempRankDup === TempRank && (TempRankDup && TempRank !== "Reject")) {
							checkDup = checkDup + 1;
							this.getView().byId("idRankTable").getItems()[rankcheck].getCells()[3].addStyleClass("SelectError");
							this.getView().byId("idRankTable").getItems()[rankDuplicate].getCells()[3].addStyleClass("SelectError");
							if (saveFlag === "X" && TempRankDup === "  ") {
								checkDup = 0;
								this.getView().byId("idRankTable").getItems()[rankcheck].getCells()[3].removeStyleClass("SelectError");
								this.getView().byId("idRankTable").getItems()[rankDuplicate].getCells()[3].removeStyleClass("SelectError");
							}
						}
					}
				}
				var mandatoryFields = 0;
				if (saveFlag !== "X") {
					if (this.getView().byId("documentNoId").getValue() === "") {
						this.getView().byId("documentNoId").setValueState(sap.ui.core.ValueState.Error);
						mandatoryFields = 1;
					}
					if (this.getView().byId("unitId").getValue() === "" && this.getView().byId("unitId").getVisible() !== false) {
						this.getView().byId("unitId").setValueState(sap.ui.core.ValueState.Error);
						mandatoryFields = 1;
					}
					if (this.getView().byId("phaseId").getValue() === "" && this.getView().byId("phaseId").getVisible() !== false) {
						this.getView().byId("phaseId").setValueState(sap.ui.core.ValueState.Error);
						mandatoryFields = 1;
					}
				}
				var duplicateDescription = false;
				var CBERecommendationSet = this.getView().byId("cbeRecomdationTable").getModel("cbeRecommendationModel").getData().rows;
				for (var description = 0; description < CBERecommendationSet.length; description++) {
					var tempDescription = CBERecommendationSet[description].Description;
					for (var descriptionDuplicate = description + 1; descriptionDuplicate < CBERecommendationSet.length; descriptionDuplicate++) {
						var tempDescriptionDup = CBERecommendationSet[descriptionDuplicate].Description;
						if (tempDescriptionDup === tempDescription) {
							duplicateDescription = true;
							this.getView().byId("cbeRecomdationTable").getRows()[description].getCells()[0].setValueState(sap.ui.core.ValueState.Error);
							this.getView().byId("cbeRecomdationTable").getRows()[descriptionDuplicate].getCells()[0].setValueState(sap.ui.core.ValueState
								.Error);
						}
						if (tempDescriptionDup === false) {
							this.getView().byId("cbeRecomdationTable").getRows()[description].getCells()[0].setValueState(sap.ui.core.ValueState.None);
							this.getView().byId("cbeRecomdationTable").getRows()[descriptionDuplicate].getCells()[0].setValueState(sap.ui.core.ValueState
								.None);
						}
					}
				}
				if (checkDup === 0 && mandatoryFields === 0 && duplicateDescription === false) {
					var _self = this;

					var BuyerRecomTxt = _self.getView().byId("buyerRecommendationId").getValue();

					//start of changes by nagesh FETR0013312
					var EstdPoCur, TqCur, BudBal, Tqprice, Potentialsav, Costsaveremarks;
					var costSavingsFlag = _self.getView().getModel("HeaderModel").getProperty("/costSavingsFlag");

					var EstdPoValue;
					if (costSavingsFlag === true) {
						EstdPoValue = oFloatFormat.parse(_self.getView().byId("estimatePoValueId1").getValue()); //separator change
						EstdPoCur = _self.getView().byId("EstCurrencyid").getValue(); //DeePTHI FETR0013312

						TqCur = _self.getView().byId("Currencyid").getValue(); //Deepthi FETR0013312

						BudBal = oFloatFormat.parse(_self.getView().byId("balanceId1").getValue()); //Deepthi FETR0013312 //separator change 
						if (BudBal === "") {
							BudBal = null;
						}

						Tqprice = oFloatFormat.parse(_self.getView().byId("totalQuotedPriceAfterTechnicalQueryConfirmId").getValue()); //Deepthi FETR0013312 //separator change  

						Potentialsav = oFloatFormat.parse(_self.getView().byId("potentialSavingsId").getValue()); //Deepthi FETR0013312 //separator change 
						if (Potentialsav === "") {
							Potentialsav = null;
						}
						Costsaveremarks = _self.getView().byId("costSavingsRemarksId").getValue(); //Deepthi FETR0013312

					} else {
						EstdPoValue = _self.getView().byId("estimatePoValueId").getValue();
					}
					if (EstdPoValue === "") {
						EstdPoValue = null;
					}
					// end of changes

					var EstdPoDate = _self.getView().byId("estimatedPoDateId").getDateValue();
					var finalEstdPoDate;
					if (EstdPoDate === "" || EstdPoDate === null) {
						finalEstdPoDate = null;
					} else {
						var oDateFormat1 = sap.ui.core.format.DateFormat.getDateTimeInstance({
							pattern: "yyyy-MM-dd"
						});
						finalEstdPoDate = oDateFormat1.format(EstdPoDate) + "T00:00:00";

					}
					var EstdShipTime = _self.getView().byId("estdTimeForShippingId").getValue();
					var EstdDelLeadTime = _self.getView().byId("estdDelLeadTimeId").getValue();

					// start of changes by nagesh FETR0013312
					var TotBudget;
					if (costSavingsFlag === true) {
						TotBudget = oFloatFormat.parse(_self.getView().byId("totalBudgetAvailableId1").getValue());
					} else {
						TotBudget = oFloatFormat.parse(_self.getView().byId("totalBudgetAvailableId").getValue());
					}
					if (TotBudget === "") {
						TotBudget = 0.000;
					}
					// end of changes

					var data1 = {};
					var NavUpdateHeaderInfo = [];
					var localContnt; //   localContent_changes_deepthi
					for (var i = 0; i < _self.getView().getModel("HeaderModel").getData().length; i++) {
						if (_self.getView().getModel("HeaderModel").getData()[i].LocalContent == "") {
							localContnt = 0;
						} else {
							localContnt = _self.getView().getModel("HeaderModel").getData()[i].LocalContent;
						}
						// start of changes
						if (costSavingsFlag === true) {
							NavUpdateHeaderInfo.push({
								Banfn: _self.getView().getModel("HeaderModel").getData()[i].Submi,
								TotBudget: TotBudget,
								EstdPoValue: EstdPoValue,
								EstdPoCur: EstdPoCur, //Deepthi FETR0013312
								TqPriceCur: TqCur, //Deepthi FETR0013312
								TqPrice: Tqprice,
								BudBal: BudBal, //Deepthi FETR0013312
								PotSav: Potentialsav,
								CostSavRmks: Costsaveremarks,
								FreigtMode: _self.getView().getModel("HeaderModel").getData()[i].FreigtMode,
								//	LocalContent: _self.getView().getModel("HeaderModel").getData()[i].LocalContent,
								LocalContent: localContnt,
								VendorName: _self.getView().getModel("HeaderModel").getData()[i].VendorName,
								Lifnr: _self.getView().getModel("HeaderModel").getData()[i].Lifnr,
								TbeApprovDate: null,
								EstdPoDate: finalEstdPoDate,
								EstdDelLeadTime: EstdDelLeadTime,
								EstdShipTime: EstdShipTime,
								BuyerRecomTxt: BuyerRecomTxt,
								RevisionNo: _self.getView().getModel("HeaderModel").getData()[i].RevisionNo,
								PaymentTerm: _self.getView().getModel("HeaderModel").getData()[i].PaymentTerm,
								Warranty: _self.getView().getModel("HeaderModel").getData()[i].Warranty,
								MeetsTechSpec: _self.getView().getModel("HeaderModel").getData()[i].MeetsTechSpec,
								MeetsComReq: _self.getView().getModel("HeaderModel").getData()[i].MeetsComReq,
								AccptModecTc: _self.getView().getModel("HeaderModel").getData()[i].AccptModecTc,
								CommisionSpares: _self.getView().getModel("HeaderModel").getData()[i].CommisionSpares,
								YrsSpares: _self.getView().getModel("HeaderModel").getData()[i].YrsSpares,
								ServRateAgreed: _self.getView().getModel("HeaderModel").getData()[i].ServRateAgreed
							});
						} else {
							NavUpdateHeaderInfo.push({
								Banfn: _self.getView().getModel("HeaderModel").getData()[i].Submi,
								TotBudget: TotBudget,
								EstdPoValue: EstdPoValue,
								FreigtMode: _self.getView().getModel("HeaderModel").getData()[i].FreigtMode,
								//	LocalContent: _self.getView().getModel("HeaderModel").getData()[i].LocalContent,
								LocalContent: localContnt,
								VendorName: _self.getView().getModel("HeaderModel").getData()[i].VendorName,
								Lifnr: _self.getView().getModel("HeaderModel").getData()[i].Lifnr,
								TbeApprovDate: null,
								EstdPoDate: finalEstdPoDate,
								EstdDelLeadTime: EstdDelLeadTime,
								EstdShipTime: EstdShipTime,
								BuyerRecomTxt: BuyerRecomTxt,
								RevisionNo: _self.getView().getModel("HeaderModel").getData()[i].RevisionNo,
								PaymentTerm: _self.getView().getModel("HeaderModel").getData()[i].PaymentTerm,
								Warranty: _self.getView().getModel("HeaderModel").getData()[i].Warranty,
								MeetsTechSpec: _self.getView().getModel("HeaderModel").getData()[i].MeetsTechSpec,
								MeetsComReq: _self.getView().getModel("HeaderModel").getData()[i].MeetsComReq,
								AccptModecTc: _self.getView().getModel("HeaderModel").getData()[i].AccptModecTc,
								CommisionSpares: _self.getView().getModel("HeaderModel").getData()[i].CommisionSpares,
								YrsSpares: _self.getView().getModel("HeaderModel").getData()[i].YrsSpares,
								ServRateAgreed: _self.getView().getModel("HeaderModel").getData()[i].ServRateAgreed
							});
						}
						// end of changes

					}
					data1.Banfn = _self.getView().getModel("HeaderModel").getData()[0].Submi;
					var NavBidAttach_Attr = [];
					NavBidAttach_Attr.push({
						Banfn: _self.getView().getModel("HeaderModel").getData()[0].Submi,
						DocNo: _self.getView().byId("documentNoId").getValue(),
						Phase: _self.getView().byId("phaseId").getValue(),
						Unit: _self.getView().byId("unitId").getValue()
					});
					var CBERecommendationSet = this.getView().byId("cbeRecomdationTable").getModel("cbeRecommendationModel").getData().rows;
					var CBERecommendationSetColumn = this.getView().byId("cbeRecomdationTable").getModel("cbeRecommendationModel").getData().columns;
					var CBERecommendationArray = [];
					if (CBERecommendationSet.length === 0) {
						CBERecommendationArray.push({
							Banfn: "",
							DelInd: "",
							Descr: "",
							Lifnr: "",
							SrNo: " ",
							VendResp: ""
						});
					} else {
						for (var i = 0; i < CBERecommendationSet.length; i++) {
							for (var j = 0; j < CBERecommendationSetColumn.length - 2; j++) {
								CBERecommendationArray.push({
									Banfn: CBERecommendationSet[i].Banfn,
									DelInd: CBERecommendationSet[i].DelInd,
									Descr: CBERecommendationSet[i].Description,
									Lifnr: CBERecommendationSetColumn[j + 1].Lifnr,
									SrNo: CBERecommendationSet[i].SrNo,
									VendResp: CBERecommendationSet[i]["VName" + j]
								});
							}
						}
						if (this.getView().getModel("deleteModel") !== undefined) {
							if (this.getView().getModel("deleteModel").getData().length > 0) {
								for (var i = 0; i < this.getView().getModel("deleteModel").getData().length; i++) {
									for (var j = 0; j < CBERecommendationSetColumn.length - 2; j++) {
										CBERecommendationArray.push({
											Banfn: this.getView().getModel("deleteModel").getData()[i].Banfn,
											DelInd: this.getView().getModel("deleteModel").getData()[i].DelInd,
											Descr: this.getView().getModel("deleteModel").getData()[i].Description,
											Lifnr: CBERecommendationSetColumn[j + 1].Lifnr,
											SrNo: this.getView().getModel("deleteModel").getData()[i].SrNo,
											VendResp: this.getView().getModel("deleteModel").getData()[i]["VName" + j]
										});
									}
								}
							}
						}
					}
					//	this.getView().byId("cbeRecomdationTable").getModel("cbeRecommendationModel").getData().rows;
					if (saveFlag === "X") {
						data1.Save = "true";
					} else {
						data1.Save = "false";
					}
					data1.Message = "";
					data1.NavUpdateRank = UpdateRankSet;
					data1.NavUpdateHeaderInfo = NavUpdateHeaderInfo;
					//data1.NavBidAttach_Attr = NavBidAttach_Attr;

					//when no attachmets, the NavBidAttach is restricted - SS_Start  
					if ((_self.getView().byId("documentNoId").getValue() !== "") || (_self.getView().byId("phaseId").getValue() !== "") || (_self.getView()
							.byId("unitId").getValue() !== "")) {
						data1.NavBidAttach_Attr = NavBidAttach_Attr;

					}
					//SS_End

					data1.NavCBERecommendation = CBERecommendationArray;
					var serviceURL = "/sap/opu/odata/sap/ZPTP_CBE_COMPARISON_SCREEN_SRV";
					var oModel = new sap.ui.model.odata.ODataModel(
						serviceURL);
					var requrl = "/ApproveSet()";
					sap.ui.core.BusyIndicator.show(0);
					setTimeout(function() {
						oModel.create(requrl, data1, {
							success: function(oData, oResponse) {
								var responseMsg = oResponse;
								if (saveFlag !== "X") {
									MessageBox.success("Ranking has been successfully sent for Approval");
									UpdateRankSet = [];
									for (rankColumn = 0; rankColumn < vendorLength; rankColumn++) {
										_self.getView().byId("idRankTable").getItems()[rankColumn].getCells()[3].setEnabled(false);
										_self.getView().byId("idRankTable").getItems()[rankColumn].getCells()[4].setEnabled(false);
									}
									_self._onBindingChange();
								} else {
									MessageBox.success("Data Saved Successfully");
									_self._onBindingChange();
								}
							},
							error: function(oEvent) {
								var oMessageBox = jQuery.parseXML(oEvent.response.body).querySelectorAll("errordetail > message");
								var msgLength = oMessageBox.length;
								if (msgLength === 0) {
									var oMessage = jQuery.parseXML(oEvent.response.body).querySelectorAll("error > message")[0].textContent;
								} else {
									var oMessage = jQuery.parseXML(oEvent.response.body).querySelectorAll("errordetail > message")[0].textContent;
									if (msgLength > 0) {
										for (var msgRow = 1; msgRow < msgLength; msgRow++) {
											oMessage = oMessage + "\n" + jQuery.parseXML(oEvent.response.body).querySelectorAll("errordetail > message")[msgRow]
												.textContent;
										}
									}
								}
								MessageBox.error(oMessage);
							}
						});
						sap.ui.core.BusyIndicator.hide();
					});
				} else {
					if (checkDup !== 0 && mandatoryFields === 0) {
						MessageBox.error("Please change the duplicate Rank");
					} else if (mandatoryFields !== 0 && checkDup === 0) {
						MessageBox.error("Please fill the mandatory fields in attachment tab");
					} else if (duplicateDescription === true) {
						MessageBox.error("Please remove the duplicate description from Bid Normalization Tab");
					} else {
						MessageBox.error("Please change the duplicate Rank and fill the mandatory fields in attachment tab");
					}

				}
			} else {
				MessageBox.error("Ranking not Filled Yet");

			}
		},

		////////////////////////////////////////////////////END Route For Approval Button//////////////////////////////////////////////		

		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");
			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 *function name : _getDialog2
		 *Reason :  On click of Payterm in TAB 2 display PaymentTerms fragment
		 *input parameters: null
		 *return: null*/
		_getDialog2: function() {
			// create dialog via fragment factory
			this._oDialog2 = sap.ui.xmlfragment("ptp.sourcing.cbe.view.PaymentTerms", this);
			return this._oDialog2;
		},

		/**
		 *function name : _handleValueHelpSearchPaymentTerms
		 *Reason : Helps us to do search operation in Payterms Fragment.
		 *input parameters: oEvent
		 *return: null*/
		_handleValueHelpSearchPaymentTerms: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new sap.ui.model.Filter("Zterm", sap.ui.model.FilterOperator.Contains, sValue);
			var oFilter1 = new sap.ui.model.Filter("Zdesc", sap.ui.model.FilterOperator.Contains, sValue);
			var oFilter2 = new sap.ui.model.Filter([oFilter, oFilter1], false);
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([oFilter2]);
		},

		/**
		 *function name : onSelectDialogItemPaymentTerms
		 *Reason : On select of particular payment term it gets binded to the HeaderModel 
		 * so that we can pass the vlaue at the backend at the time of save.
		 *input parameters: oEvent
		 *return: null*/
		onSelectDialogItemPaymentTerms: function(oEvent) {
			var Properties = this.getView().getModel("Properties").getData();
			var InputBox = Properties.Input;
			InputBox.setValue(oEvent.getParameters().selectedItem.getProperty("title") + " " + oEvent.getParameters().selectedItem.getProperty(
				"description"));
			this.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/PaymentTerm", oEvent.getParameters().selectedItem.getProperty(
				"title"));
			oEvent.getSource().getBinding("items").filter([]);
		},

		/**
		 *function name : _handleValueHelpClosePaymentTerms
		 *Reason :  On click of cancel button it will destroy the PaymentTerms fragment
		 *input parameters: null
		 *return: null*/
		_handleValueHelpClosePaymentTerms: function() {
			this._getDialog2().destroy();
		},

		/**
		 *function name : _getDialog3
		 *Reason : On click of Freight Mode in TAB 2 display FreightMode fragment
		 *input parameters: oEvent 
		 *return: null*/
		_getDialog3: function() {
			// create dialog via fragment factory
			this._oDialog3 = sap.ui.xmlfragment("ptp.sourcing.cbe.view.FreightMode", this);
			return this._oDialog3;
		},

		/**
		 *function name : _handleValueHelpSearchFreigtMode
		 *Reason : Helps us to do search operation in FreightMode Fragment.
		 *input parameters: oEvent
		 *return: null*/
		_handleValueHelpSearchFreigtMode: function(oEvent) {
			// add filter for search
			var aFilters = [];
			var sQuery = oEvent.getParameters().value;
			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("ShipCond", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			var binding = oEvent.getSource().getBinding("items");
			binding.filter(aFilters, "Application");
		},

		/**
		 *function name : onSelectDialogItemFreigtMode
		 *Reason : On select of particular Freight Mode it gets binded to the HeaderModel 
		 * so that we can pass the vlaue at the backend at the time of save.
		 *input parameters: oEvent
		 *return: null*/
		onSelectDialogItemFreigtMode: function(oEvent) {
			var Properties = this.getView().getModel("Properties").getData();
			var InputBox = Properties.Input;
			InputBox.setValue(oEvent.getParameters().selectedItem.getProperty("title") + " " + oEvent.getParameters().selectedItem.getProperty(
				"description"));
			this.getView().getModel("HeaderModel").setProperty("/" + columnNo + "/FreigtMode", oEvent.getParameters().selectedItem.getProperty(
				"title"));
			oEvent.getSource().getBinding("items").filter([]);
		},

		/**
		 *function name : _handleValueHelpCloseFreigtMode
		 *Reason :  On click of cancel button it will destroy the FreightMode fragment
		 *input parameters: null
		 *return: null*/
		_handleValueHelpCloseFreigtMode: function() {
			this._getDialog3().destroy();
		},
		//Deepthi Currency value search Help
		onSearchCurrencyValueHelp: function(oEvent) {
			var _self = this;
			// var PageData = {
			// 	"Input": oEvent.getSource()
			// };
			// var pModel = new sap.ui.model.json.JSONModel();
			// pModel.setData(PageData);
			// _self.getView().setModel(pModel, 'Properties');
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/SearchhelpsSet/?$filter=Zinput eq 'WAER'";
			oMod.read(readRequestURL, {
				success: function(AssignedTOData) {
					var AssignedToModel = new JSONModel();
					AssignedToModel.setData(AssignedTOData);
					var _oDialog4 = _self._getDialog4();
					_oDialog4.setModel(AssignedToModel);
					_self.getView().setModel(AssignedToModel, "CurrencyModel");
					_oDialog4.open();
				}
			});
		},
		onSearchCurrencyValueHelp1: function(oEvent) {
			var _self = this;
			// var PageData = {
			// 	"Input": oEvent.getSource()
			// };
			// var pModel = new sap.ui.model.json.JSONModel();
			// pModel.setData(PageData);
			// _self.getView().setModel(pModel, 'Properties');
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/SearchhelpsSet/?$filter=Zinput eq 'WAER'";
			oMod.read(readRequestURL, {
				success: function(AssignedTOData) {
					var AssignedToModel = new JSONModel();
					AssignedToModel.setData(AssignedTOData);
					var _oDialog5 = _self._getDialog5();
					_oDialog5.setModel(AssignedToModel);
					_self.getView().setModel(AssignedToModel, "CurrencyModel");
					_oDialog5.open();
				}
			});
		},
		_getDialog4: function() {
			// create dialog lazily
			// create dialog via fragment factory
			this._oDialog4 = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.Currency", this);
			return this._oDialog4;
		},
		_getDialog5: function() {
			// create dialog lazily
			// create dialog via fragment factory
			this._oDialog5 = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.CurrencyPO", this);
			return this._oDialog5;
		},

		_handleValueHelpSearchCurrency: function(oEvent) {
			// add filter for search
			var aFilters = [];
			var sQuery = oEvent.getParameters().value;
			if (sQuery && sQuery.length > 0) {

				aFilters = new sap.ui.model.Filter({
					filters: [
						new sap.ui.model.Filter("Waers", sap.ui.model.FilterOperator.Contains, sQuery),
						new sap.ui.model.Filter("Zdesc", sap.ui.model.FilterOperator.Contains, sQuery)
					],
					and: false
				});
			}
			var binding = oEvent.getSource().getBinding("items");
			binding.filter(aFilters, "Application");
		},
		// onSelectDialogItemCurrency: function(oEvent) {
		// 	var Properties = this.getView().getModel("Properties").getData();
		// 	var InputBox = Properties.Input;
		// 	InputBox.setValue(oEvent.getParameters().selectedItem.getProperty("title"));
		// 	oEvent.getSource().getBinding("items").filter([]);
		// 	// this.currencyValueChange(oEvent.getParameters().selectedItem.getProperty("title"));
		// 	var currencyDecimal = "";
		// 	var currencyModel = this.getView().getModel("CurrencyModel");
		// 	var currencyData = currencyModel.getData();
		// 	var lineModel = this.getView().getModel("line_opt_oModel");
		// 	 var lineData = lineModel.getData();
		// 	for (var j = 0; j < currencyData.results.length; j++) {
		// 		if (currencyData.results[j].Waers === oEvent.getParameters().selectedItem.getProperty("title")) {
		// 			currencyDecimal = currencyData.results[j].Currdec;
		// 			break;
		// 		}
		// 	}
		// 	var self = this;
		// 	sap.ui.core.BusyIndicator.show(0);
		// 	window.setTimeout(function() {
		// 		for (var i = 0; i < lineData.results.length; i++) {
		// 			lineData.results[i].ZzshrttxtValue = "None";
		// 			lineData.results[i].ZflagCurrdec = currencyDecimal;
		// 			var quantity = lineData.results[i].MengeVend;
		// 			var netpr = lineData.results[i].NetPr;
		// 			if (isNaN(formatter.priceParser(netpr, currencyDecimal))) {
		// 				lineData.results[i].NetPr = formatter.currencyParseFormatter(0, currencyDecimal);
		// 				lineData.results[i].Brtwr = formatter.currencyParseFormatter(0, currencyDecimal);
		// 			} else {
		// 				netpr = formatter.parseFormatter(netpr);
		// 				quantity = formatter.parseFormatter(quantity);
		// 				lineData.results[i].NetPr = formatter.currencyParseFormatter(formatter.priceParser(netpr, currencyDecimal), currencyDecimal);
		// 				if (isNaN(quantity)) {
		// 					lineData.results[i].Brtwr = formatter.currencyParseFormatter(0, currencyDecimal);
		// 				} else {
		// 					lineData.results[i].Brtw = formatter.currencyParseFormatter(quantity * formatter.priceParser(netpr, currencyDecimal),
		// 						currencyDecimal);
		// 				}
		// 			}
		// 		}
		// 		self.getView().byId("lineItemsList1").setModel(lineModel);
		// 		self.getView().byId("lineItemsList1").updateBindings(true);
		// 		sap.ui.core.BusyIndicator.hide();
		// 	});
		// },
		_handleValueHelpCloseCurrency1: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var currencyInput = this.byId("EstCurrencyid");
				currencyInput.setValue(oSelectedItem.getTitle());
			}
			oEvent.getSource().getBinding("items").filter([]);
			this._getDialog5().destroy();
		}, //Deepthi
		_handleValueHelpCloseCurrency: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var currencyInput = this.byId("Currencyid");
				currencyInput.setValue(oSelectedItem.getTitle());
			}
			oEvent.getSource().getBinding("items").filter([]);
			this._getDialog4().destroy();
		}, //Deepthi

		///////////////////// Cross App NAvigation ///////////////////
		/**
		 *function name : handleLinkPress
		 *Reason :  When clicked on Vendor name we navigate to Buyer Screen using this function.
		 *input parameters: oEvent
		 *return: null*/
		handleLinkPress: function(oEvent) {
			var vendorName = sap.ui.getCore().byId(oEvent.getParameter("id")).getProperty("text");
			var sVendor = "";
			for (var compData = 0; compData < thisVal.getView().getModel("vendorRowModel").getData().results.length; compData++) {
				if (thisVal.getView().getModel("vendorRowModel").getData().results[compData].Name1 === vendorName) {
					sVendor = thisVal.getView().getModel("vendorRowModel").getData().results[compData].Lifnr;
					break;
				}
			}
			var oCrossApplicationNavigation = sap.ushell.Container.getService("CrossApplicationNavigation");
			if (this.getParent().getParent().getParent().getId().indexOf("dialog") === true) {
				this.getParent().getParent().getParent().destroy();
			}
			oCrossApplicationNavigation.toExternal({
				target: {
					semanticObject: "BuyerScreen",
					action: "display"
				},
				params: {
					"VendorNo": sVendor,
					"RFQNumber": rfq_number,
					"SemObj": "CBEComparision"
				}
			});
		},
		/*function name : openFullScreen*/
		/*Reason :  on press of open full screen button on the top of vendor comparison table we get Comparison table in the Full Screen mode */
		/*input parameters: null */
		/*return: null*/
		openFullScreen: function() {
			this.fullScreenDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.FullScreenLineItem", this);
			this.fullScreenDialog.open();
			var self = this;
			this.fullScreenDialog.attachBrowserEvent("keydown", function(oEvent) {
				oEvent.stopPropagation();

			});
			sap.ui.getCore().byId("fullScreencbecompTable").setModel(oTableModel);
			sap.ui.getCore().byId("fullScreencbecompTable").setFixedColumnCount(3);
			if (oTableModel.getData().rows.length < 10) {
				sap.ui.getCore().byId("fullScreencbecompTable").setVisibleRowCount(oTableModel.getData().rows.length);
			} else {
				sap.ui.getCore().byId("fullScreencbecompTable").setVisibleRowCount(10);
			}
			sap.ui.getCore().byId("fullScreencbecompTable").bindAggregation("columns", "/columns", function(index, context) {
				switch (context.getObject().columnId2) {
					case "Item No.":
						return new sap.ui.table.Column({
							width: "4rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Material No.":
						return new sap.ui.table.Column({
							width: "8rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable headertablematerialno")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Description":
						return new sap.ui.table.Column({
							width: "10rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable headertabledescr")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}).addStyleClass("Defaulttable"),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "MODEC Tag No":
						return new sap.ui.table.Column({
							width: "13rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable headertabletagno")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}",
								maxLines: 3,
								textAlign: "Left"
							}).addStyleClass("tagNoCss"),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Supplier Tag number":
						return new sap.ui.table.Column({
							width: "6rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable headertabletagno")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Warranty Model No":
						return new sap.ui.table.Column({
							width: "6rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable headertabletagno")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Manufacturer Name":
						return new sap.ui.table.Column({
							width: "8rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable headertabletagno")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Manufacturer Serial No.":
						return new sap.ui.table.Column({
							width: "8rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable headertabletagno")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Material Long Text":
						return new sap.ui.table.Column({
							width: "10rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable")
							],
							template: new sap.m.Text({
								maxLines: 4,
								text: "{" + context.getObject().columnId + "}",
								tooltip: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "PR Req Qty":
						return new sap.ui.table.Column({
							width: "5rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								}).addStyleClass("headertable")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "UOM":
						return new sap.ui.table.Column({
							width: "4rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",

									text: context.getObject().columnId2
								}).addStyleClass("headertable")
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Vend Conf Qty":
						return new sap.ui.table.Column({
							width: "5rem",
							headerSpan: [5, 1],
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Text({
								textAlign: "Right",
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Technical Response":
						return new sap.ui.table.Column({
							width: "10rem",
							headerSpan: [5, 1],
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Text({
								textAlign: "Right",
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Unit Price":
						return new sap.ui.table.Column({
							width: "8rem",
							headerSpan: [5, 1],
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Text({
								textAlign: "Right",
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Total Price":
						return new sap.ui.table.Column({
							width: "8rem",
							headerSpan: [5, 1],
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Text({
								textAlign: "Right",
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
					case "Opt.":
						return new sap.ui.table.Column({
							width: "4rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.CheckBox({
								selected: "{" + context.getObject().columnId + "}",
								enabled: false
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId,
							filterType: new sap.ui.model.type.Boolean()
						});
					default:
						return new sap.ui.table.Column({
							width: "7rem",
							multiLabels: [new sap.m.Link({
									textAlign: "Center",
									text: context.getObject().column,
									press: self.handleLinkPress
								}),
								new sap.m.Label({
									textAlign: "Center",
									text: context.getObject().columnId2
								})
							],
							template: new sap.m.Text({
								text: "{" + context.getObject().columnId + "}"
							}),
							sortProperty: context.getObject().columnId,
							filterProperty: context.getObject().columnId
						});
				}
			});
			sap.ui.getCore().byId("fullScreencbecompTable").bindAggregation("rows", "/rows");
		},
		/*function name : downloadPDF*/
		/*Reason : Download the Screen in PDF format
		/*input parameters: null */
		/*return: null*/
		downloadPDF: function() {
			var sURI = "/sap/opu/odata/sap/ZPTP_CBE_COMPARISON_SCREEN_SRV/CBEFormSet('" + rfq_number + "')/$value";
			sURI = encodeURI(sURI);
			window.open(sURI, "_blank");
		},
		/**
		 *function name : closeFullScreen
		 *Reason :  On click of cancel button it will destroy the fullScreenDialog fragment
		 *input parameters: null
		 *return: null*/
		closeFullScreen: function() {
			this.fullScreenDialog.destroy();
		},
		/*function name : addComDoc*/
		/*Reason :  to open commercial doc fragment */
		/*input parameters: parameters*/
		/*return: null*/
		addComDoc: function(oEvent) {
			var self = this;
			self.dialog = sap.ui.xmlfragment("ptp.sourcing.collectiveno.view.Attachment", self);
			self.dialog.setModel(self.oLangu, "i18n");
			self.dialog.open();
			this.dialog.attachBrowserEvent("keydown", function(oEvent) {
				oEvent.stopPropagation();
			});
			attachmentFlag = "";
		},

		addTecDoc: function(oEvent) {
			this.dialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.AddTechnicalDocument", this);
			this.dialog.open();
			this.dialog.attachBrowserEvent("keydown", function(oEvent) {
				if (oEvent.keyCode === 27) {
					oEvent.stopPropagation();
				}
			});
			attachmentFlag = "X";
		},
		/*function name : confirmTecDoc*/
		/*Reason :  to open dialogbox , asking how many files need to be uploaded */
		/*input parameters: parameters*/
		/*return: null*/
		confirmTecDoc: function(oEvent) {
			var that = this;
			noDoc = sap.ui.getCore().byId("addTecDocID").getValue();
			if (noDoc > 0 && noDoc <= 10) {
				sap.ui.getCore().byId("addTecDocID").setValueState(sap.ui.core.ValueState.None);
				if (that.dialog1) {
					this.dialog1.destroy();
				}
				that.dialog1 = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.TechnicalDocument", that);
				that.getView().addDependent(that.dialog1);
				that.dialog1.open();
				var noDocModel = new JSONModel();
				var a = [];
				for (var i = 0; i < noDoc; i++) {
					a.push({
						fileNo: (i + 1),
						revisionNo: "",
						vendorDocumentNo: "",
						fileName: ""
					});
				}
				noDocModel.setData(a);
				sap.ui.getCore().byId("tecDocTable").setModel(noDocModel, "noDocModel");
				this.dialog.destroy();
			} else {
				sap.ui.getCore().byId("addTecDocID").setValueState(sap.ui.core.ValueState.Error);
				var displayStatus = "Max 10 numbers of document's can be attached at a time";
				MessageBox.information(displayStatus);
			}
			this.dialog1.attachBrowserEvent("keydown", function(oEventKey) {
				if (oEventKey.keyCode === 27) {
					oEventKey.stopPropagation();
				}
			});
			this.dialog1.attachBrowserEvent("mousedown", function(oEventMouse) {
				oEventMouse.target.click();
			});
		},
		/*function name : cancelDoc*/
		/*Reason :  to destroy dialog box */
		/*input parameters: parameters*/
		/*return: null*/
		cancelDoc: function() {
			this.dialog.destroy();

		},

		/*function name : cancelTecDoc*/
		/*Reason :  to close the dialog box after upload process */
		/*input parameters: parameters*/
		/*return: null*/
		/*Author: DVijay*/
		cancelTecDoc: function() {
			var displayStatus = this.oLangu.getResourceBundle().getText("alertAttachmentCancelled");
			MessageBox.alert(displayStatus);
			this.getView().byId("addComDocButton").setEnabled(true);
			this.getView().byId("addComDocButton").setTooltip("Add Commercial Document");
			this.getView().getModel("vmodel").getData().status.change = true;
			this.getView().getModel("vmodel").refresh(true);
			CustomAttrSet = [];
			tecDocId = [];
			this.dialog1.destroy();
		},

		/*function name : onChangeRevNo*/
		/*Reason :  to check for revision no  */
		/*input parameters: parameters*/
		/*return: null*/
		onChngeRevNo: function(oEvent) {
			var arrayNo = oEvent.getSource().getParent().getBindingContext("noDocModel").sPath.split("/")[1];
			if (CustomAttrSet.length > 0 && arrayNo < CustomAttrSet.length) {
				CustomAttrSet[arrayNo].RevNo = oEvent.getParameter("value");
			}
			sap.ui.getCore().byId("tecDocTable").getModel("noDocModel").getData()[arrayNo].revisionNo = oEvent.getParameter("value");
		},

		/*function name : handleUploadComplete*/
		/*Reason :  to check if there is type missmatch or not */
		/*input parameters: parameters*/
		/*return: null*/
		handleUploadComplete: function(oEvent) {
			var sResponse = oEvent.getParameter("status");
			iLimit = iLimit + 1;
			var _selfuploadTecDoc = this;
			if (sResponse) {
				var displayStatus;
				if (sResponse === 201) {
					sap.ui.getCore().byId("tecDocTable").getModel("noDocModel").getData().splice(0, 1);
					tecDocId.splice(0, 1);
					CustomAttrSet.splice(0, 1);
					if (CustomAttrSet.length > 0) {
						_selfuploadTecDoc.uploadAttachment();
					} else {
						displayStatus = _selfuploadTecDoc.oLangu.getResourceBundle().getText("successAttachmentUploaded");
						if (exitFlag === "Y") {
							progressFlag = "";
							exitFlag = "";
						} else {
							MessageBox.success(displayStatus);
							progressFlag = "";
							CustomAttrSet = [];
							tecDocId = [];
							_selfuploadTecDoc.dialog1.destroy();
							/*if (rfqStatus === "12") {
								_selfuploadTecDoc._disableScreen();
							} else {
								_selfuploadTecDoc._enableScreen();
							}*/
							_selfuploadTecDoc.getView().byId("addComDocButton").setEnabled(true);
							_selfuploadTecDoc.getView().byId("addComDocButton").setTooltip("Add Commercial Document");
							_selfuploadTecDoc.getView().getModel("vmodel").getData().status.change = true;
							_selfuploadTecDoc.getView().getModel("vmodel").refresh(true);
							_selfuploadTecDoc.getDownloadAttachmentList(prNumber);
						}
					}
				} else {
					sap.ui.getCore().byId("tecDocTable").getModel("noDocModel").getData().splice(0, 1);
					tecDocId.splice(0, 1);
					CustomAttrSet.splice(0, 1);
					if (CustomAttrSet.length > 0) {
						_selfuploadTecDoc.uploadAttachment();
					} else {
						displayStatus = _selfuploadTecDoc.oLangu.getResourceBundle().getText("successAttachmentUploaded");
						if (exitFlag === "Y") {
							progressFlag = "";
							exitFlag = "";
						} else {
							MessageBox.success(displayStatus);
							progressFlag = "";
							CustomAttrSet = [];
							tecDocId = [];
							_selfuploadTecDoc.dialog1.destroy();
							/*if (rfqStatus === "12") {
								_selfuploadTecDoc._disableScreen();
							} else {
								_selfuploadTecDoc._enableScreen();
							}*/
							_selfuploadTecDoc.getView().byId("addComDocButton").setEnabled(true);
							_selfuploadTecDoc.getView().byId("addComDocButton").setTooltip("Add Commercial Document");
							_selfuploadTecDoc.getView().getModel("vmodel").getData().status.change = true;
							_selfuploadTecDoc.getView().getModel("vmodel").refresh(true);
							_selfuploadTecDoc.getDownloadAttachmentList(prNumber);
						}
					}
				}
			}
		},

		/*function name : handleValueChange*/
		/*Reason :  to handle the revision no, max charchter for file,pushing inputs to custom attribute and uploading of files*/
		/*input parameters: parameters*/
		/*return: null*/
		handleValueChange: function(oEvent) {
			var arrayNo = oEvent.getSource().getParent().getBindingContext("noDocModel").sPath.split("/")[1];
			custCount = arrayNo;
			sap.ui.getCore().byId("tecDocTable").getItems()[arrayNo].getCells()[1].setValueState(sap.ui.core.ValueState.None);
			sap.ui.getCore().byId("tecDocTable").getItems()[arrayNo].getCells()[2].setValueState(sap.ui.core.ValueState.None);
			var file = oEvent.getParameters().newValue;
			var index = file.lastIndexOf(".");
			var fileName1 = file.substr(0, index);
			if (sap.ui.getCore().byId("tecDocTable").getModel("noDocModel").getData()[arrayNo].revisionNo.length > 0) {
				if (fileName1.length >= 16) {
					var fileName = fileName1.substr(0, 15);
				} else {
					fileName = fileName1;
				}
				var format = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?]+/;
				var engformat = /^[-a-zA-Z0-9_ ]+$/;
				var specialCharacter = format.test(fileName1);
				var englishCharacter = engformat.test(fileName1);
				if (specialCharacter === true) {
					MessageBox.alert(this.oLangu.getResourceBundle().getText("alertAttachmentInvalidFilename"));
					sap.ui.getCore().byId(oEvent.getSource().getId()).setValue("");
				} else if (file.length > 64) {
					MessageBox.alert(this.oLangu.getResourceBundle().getText("alertAttachmentLongFilename"));
					sap.ui.getCore().byId(oEvent.getSource().getId()).setValue("");
				} else if (englishCharacter === false) {
					MessageBox.alert(this.oLangu.getResourceBundle().getText("alertAttachmentNonEngFilename"));
					sap.ui.getCore().byId(oEvent.getSource().getId()).setValue("");

				} else {
					if (attachmentFlag === "X") {
						if (fileName1 !== "") {
							this.dialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.CustAttributes", this);
							this.dialog.setModel(this.getView().getModel());
							this.dialog.open();
							sap.ui.getCore().byId("FileNme").setEnabled(false);
							sap.ui.getCore().byId("FileNme").setValue(file);
							sap.ui.getCore().byId("DType").setEnabled(false);
							/*sap.ui.getCore().byId("IReason").setEnabled(false);
							sap.ui.getCore().byId("DType").setEnabled(false);
							sap.ui.getCore().byId("DType").setValue("CBE");*/
							sap.ui.getCore().byId("unit_Id").setValue(unitGlobal);
							sap.ui.getCore().byId("phase_Id").setValue(phaseGlobal);
							sap.ui.getCore().byId("Origin").setValue("MI");
							/*Change Dated: 16.09.2019, Author: Deepak Vijay*/
							sap.ui.getCore().byId("IReason").setValue("FIO");
							sap.ui.getCore().byId("Disc_Id").setValue("P2");
							/*Change Dated: 23.12.2019, Author: Deepak Vijay*/
							sap.ui.getCore().byId("title_Id").setEnabled(false);
							sap.ui.getCore().byId("title_Id").setValue(file);
						}
						CustomAttrSet[arrayNo] = {
							PrNum: prNumber,
							RfqNum: "123",
							SrcngType: "ZTEC",
							RevNo: sap.ui.getCore().byId("tecDocTable").getModel("noDocModel").getData()[arrayNo].revisionNo,
							VdrDocNum: fileName,
							Title: file
						};

					} else {
						CustomAttrSet[arrayNo] = {
							PrNum: prNumber,
							RfqNum: "123",
							SrcngType: "ZCOM",
							RevNo: sap.ui.getCore().byId("tecDocTable").getModel("noDocModel").getData()[arrayNo].revisionNo,
							VdrDocNum: fileName,
							Title: file
						};
					}
					tecDocId.push({
						fileUploader: oEvent.getParameters().id
					});
				}
			} else {
				MessageBox.warning(this.oLangu.getResourceBundle().getText("warningRevNo"));
				sap.ui.getCore().byId(oEvent.getSource().getId()).setValue("");
			}
		},

		/*function name : handleTypeMissmatch*/
		/*Reason :  to check if there is type missmatch or not */
		/*input parameters: parameters*/
		/*return: null*/
		handleTypeMissmatch: function(oEvent) {
			var fileType = oEvent.getParameters().fileType;
			MessageBox.warning(this.oLangu.getResourceBundle().getText("warningAttachmentFiletype") + fileType + this.oLangu.getResourceBundle()
				.getText("warningAttachmentFiletypeNotAllowed"));
		},

		attributesOk: function(oEvent) {
			var that = this;
			var fname = sap.ui.getCore().byId("FileNme").getValue();
			var disc_attb = sap.ui.getCore().byId("Disc_Id").getValue();
			var doctype = sap.ui.getCore().byId("DType").getValue();
			var reason = sap.ui.getCore().byId("IReason").getValue();
			var origin = sap.ui.getCore().byId("Origin").getValue();
			var phase = sap.ui.getCore().byId("phase_Id").getValue();
			var unit_attr = sap.ui.getCore().byId("unit_Id").getValue();
			var title_attr = sap.ui.getCore().byId("title_Id").getValue();
			if (disc_attb === "" || origin === "" || phase === "" || unit_attr === "" || title_attr === "") {
				MessageBox.warning(this.oLangu.getResourceBundle().getText("AttributesWarning"));
			} else {
				CustomAttrSetAll[custCount] = {
					Disc: disc_attb,
					DType: doctype,
					reason_Attb: reason,
					orig_Attb: origin,
					phase_Attb: phase,
					unit_Attb: unit_attr,
					title: title_attr
				};
				that.dialog.destroy();
			}
		},

		/**
		 *function name : DisciplineAttributes
		 *Reason :  On Click Discipline dialog is opened and data is binded in dialog box
		 *input parameters: oEvent
		 *return: null*/
		DiscAttributes: function(oEvent) {
			var self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/DMSearchHelpSet?$filter=Zinput eq 'Disc' and Werks eq '" + Plant + "'" + " and Banfn eq '" + rfq_number +
				"'";
			oMod.read(readRequestURL, {
				success: function(attachmentData) {
					var attachmentModel = new JSONModel();
					attachmentModel.setData(attachmentData);
					var _oAttachmentDialog = self._getAttachmentDialogDisc();
					_oAttachmentDialog.setModel(attachmentModel);
					_oAttachmentDialog.open();
				}
			});
		},
		/**
		 *function name : _getAttachmentDialogDisc
		 *Reason :  On click of Discipline in Attachment Tab display Unit Dialog Box
		 *input parameters: null
		 *return: null*/
		_getAttachmentDialogDisc: function() {
			// create dialog via fragment factory
			this._oAttachmentDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.DisciplineAttr", this);
			return this._oAttachmentDialog;
		},
		/**
		 *function name : _handleValueHelpSearchDisc
		 *Reason : Helps us to do search operation in Discipline Fragment.
		 *input parameters: oEvent
		 *return: null*/
		_handleValueHelpSearchDisc: function(oEvent) {
			// add filter for search
			var aFilters = [];
			var sQuery = oEvent.getParameters().value;
			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("Disc", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			var binding = oEvent.getSource().getBinding("items");
			binding.filter(aFilters, "Application");
		},
		/*
		 *function name : onSelectDialogItemDiscAttr
		 *Reason : On select of particular Unit it gets binded to the HeaderModel 
		 * so that we can pass the value at the backend at the time of save.
		 *input parameters: oEvent
		 *return: null*/
		onSelectDialogItemDiscAttr: function(oEvent) {
			sap.ui.getCore().byId("Disc_Id").setValue(oEvent.getParameters().selectedItem.getProperty("title"));
			oEvent.getSource().getBinding("items").filter([]);
			sap.ui.getCore().byId("Disc_Id").setValueState(sap.ui.core.ValueState.None);
		},

		/**
		 *function name : _handleValueHelpCloseDiscAttr
		 *Reason :  On click of cancel button it will destroy the Discipline fragment
		 *input parameters: null
		 *return: null*/
		_handleValueHelpCloseDiscAttr: function() {
			this._getAttachmentDialogDisc().destroy();
		},

		/**
		 *function name : Originator Attributes
		 *Reason :  On Click Originator dialog is opened and data is binded in dialog box
		 *input parameters: oEvent
		 *return: null*/
		OriginAttributes: function(oEvent) {
			var self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/DMSearchHelpSet?$filter=Zinput eq 'Orig' and Werks eq '" + Plant + "'" + " and Banfn eq '" + rfq_number +
				"'";
			oMod.read(readRequestURL, {
				success: function(attachmentData) {
					var attachmentModel = new JSONModel();
					attachmentModel.setData(attachmentData);
					var _oAttachmentDialog = self._getAttachmentDialogOrigin();
					_oAttachmentDialog.setModel(attachmentModel);
					_oAttachmentDialog.open();
				}
			});
		},
		/**
		 *function name : _getAttachmentDialogOrigin
		 *Reason :  On click of Originator in Attachment Tab display Originator Dialog Box
		 *input parameters: null
		 *return: null*/
		_getAttachmentDialogOrigin: function() {
			// create dialog via fragment factory
			this._oAttachmentDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.OriginAttributes", this);
			return this._oAttachmentDialog;
		},
		/**
		 *function name : _handleValueHelpSearchOrigin
		 *Reason : Helps us to do search operation in Origin Fragment.
		 *input parameters: oEvent
		 *return: null*/
		_handleValueHelpSearchOrigin: function(oEvent) {
			// add filter for search
			var aFilters = [];
			var sQuery = oEvent.getParameters().value;
			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("Orig", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			var binding = oEvent.getSource().getBinding("items");
			binding.filter(aFilters, "Application");
		},
		/*
		 *function name : onSelectDialogItemOriginAttr
		 *Reason : On select of particular Origin it gets binded to the HeaderModel 
		 * so that we can pass the vlaue at the backend at the time of save.
		 *input parameters: oEvent
		 *return: null*/
		onSelectDialogItemOriginAttr: function(oEvent) {
			sap.ui.getCore().byId("Origin").setValue(oEvent.getParameters().selectedItem.getProperty("title"));
			oEvent.getSource().getBinding("items").filter([]);
			sap.ui.getCore().byId("Origin").setValueState(sap.ui.core.ValueState.None);
		},

		/**
		 *function name : _handleValueHelpCloseOriginAttr
		 *Reason :  On click of cancel button it will destroy the Phase fragment
		 *input parameters: null
		 *return: null*/
		_handleValueHelpCloseOriginAttr: function() {
			this._getAttachmentDialogOrigin().destroy();
		},

		/*
		 *function name : PhaseAttributes
		 *Reason :  On Click Phase dialog is opened and data is binded in dialog box
		 *input parameters: oEvent
		 *return: null*/
		PhaseAttributes: function(oEvent) {
			var self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/DMSearchHelpSet?$filter=Zinput eq 'Phase' and Werks eq '" + Plant + "'" + " and Banfn eq '" + rfq_number +
				"'";
			oMod.read(readRequestURL, {
				success: function(phaseData) {
					var attachmentModel = new JSONModel();
					attachmentModel.setData(phaseData);
					var _oAttachmentDialog = self._getPhaseAttrDialog();
					_oAttachmentDialog.setModel(attachmentModel);
					_oAttachmentDialog.open();
				}
			});
		},
		/**
		 *function name : _getPhaseAttrDialog
		 *Reason :  On click of Phase in Attachment Tab display Phase Dialog Box
		 *input parameters: null
		 *return: null*/
		_getPhaseAttrDialog: function() {
			// create dialog via fragment factory
			this._oAttachmentDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.PhaseAttr", this);
			return this._oAttachmentDialog;
		},
		/**
		 *function name : onSelectDialogItemPhaseAttr
		 *Reason : On select of particular Phase it gets binded to the HeaderModel 
		 * so that we can pass the vlaue at the backend at the time of save.
		 *input parameters: oEvent
		 *return: null*/
		onSelectDialogItemPhaseAttr: function(oEvent) {
			sap.ui.getCore().byId("phase_Id").setValue(oEvent.getParameters().selectedItem.getProperty("title"));
			oEvent.getSource().getBinding("items").filter([]);
			sap.ui.getCore().byId("phase_Id").setValueState(sap.ui.core.ValueState.None);
		},

		/**
		 *function name : _handleValueHelpClosePhaseAttr
		 *Reason :  On click of cancel button it will destroy the Phase fragment
		 *input parameters: null
		 *return: null*/
		_handleValueHelpClosePhaseAttr: function() {
			this._getPhaseAttrDialog().destroy();
		},

		/**
		 *function name : UnitAttributes
		 *Reason :  On Click Unit dialog is opened and data is binded in dialog box
		 *input parameters: oEvent
		 *return: null*/
		UnitAttributes: function(oEvent) {
			var self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/DMSearchHelpSet?$filter=Zinput eq 'Unit' and Werks eq '" + Plant + "'" + " and Banfn eq '" + rfq_number +
				"'";
			oMod.read(readRequestURL, {
				success: function(attachmentData) {
					var attachmentModel = new JSONModel();
					attachmentModel.setData(attachmentData);
					var _oAttachmentDialog = self._getAttachmentDialogUnit();
					_oAttachmentDialog.setModel(attachmentModel);
					_oAttachmentDialog.open();
				}
			});
		},
		/**
		 *function name : _getAttachmentDialogUnit
		 *Reason :  On click of Unit in Attachment Tab display Unit Dialog Box
		 *input parameters: null
		 *return: null*/
		_getAttachmentDialogUnit: function() {
			// create dialog via fragment factory
			this._oAttachmentDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.UnitAttr", this);
			return this._oAttachmentDialog;
		},
		/**
		 *function name : onSelectDialogItemUnitAttr
		 *Reason : On select of particular Unit it gets binded to the HeaderModel 
		 * so that we can pass the vlaue at the backend at the time of save.
		 *input parameters: oEvent
		 *return: null*/
		onSelectDialogItemUnitAttr: function(oEvent) {
			sap.ui.getCore().byId("unit_Id").setValue(oEvent.getParameters().selectedItem.getProperty("title"));
			oEvent.getSource().getBinding("items").filter([]);
			sap.ui.getCore().byId("unit_Id").setValueState(sap.ui.core.ValueState.None);
		},

		/**
		 *function name : _handleValueHelpCloseUnitAttr
		 *Reason :  On click of cancel button it will destroy the Unit fragment
		 *input parameters: null
		 *return: null*/
		_handleValueHelpCloseUnitAttr: function() {
			this._getAttachmentDialogUnit().destroy();
		},

		/*function name : uploadTecDoc*/
		/*Reason :  to call the service of custom attribute */
		/*input parameters: parameters*/
		/*return: null*/
		uploadTecDoc: function(oEvent) {
			var _selfuploadTecDoc = this;
			var data1 = {};
			data1.PrNum = prNumber;
			data1.RfqNum = "123";
			data1.PRToCustAtt = CustomAttrSet;
			iLimit = 0;
			var serviceURL = "/sap/opu/odata/sap/ZPTP_RFQ_CUSTOM_ATTR_SRV";
			var oModel = new sap.ui.model.odata.ODataModel(
				serviceURL);
			var requrl = "/PRSet()";

			oModel.create(requrl, data1, {
				success: function() {
					progressFlag = "X";
					_selfuploadTecDoc.tecUploadCollection();
					var displayStatus1 = _selfuploadTecDoc.oLangu.getResourceBundle().getText("informationAttachmentInProgress");
					MessageBox.information(displayStatus1);
					_selfuploadTecDoc.dialog1.close();
					_selfuploadTecDoc.getView().byId("addComDocButton").setEnabled(false);
					_selfuploadTecDoc.getView().byId("addComDocButton").setTooltip("Document Upload under process");
					_selfuploadTecDoc.getView().getModel("vmodel").getData().status.change = false;
					_selfuploadTecDoc.getView().getModel("vmodel").refresh(true);
				},
				error: function(err) {
					var oMessageBox = jQuery.parseXML(err.response.body).querySelectorAll("errordetail > message");
					var msgLength = oMessageBox.length;
					var oMessage = jQuery.parseXML(err.response.body).querySelectorAll("errordetail > message")[0].textContent;
					var filename1 = jQuery.parseXML(err.response.body).querySelectorAll("errordetail > message")[0].textContent.split(
						"for file ")[
						1];
					var fileArr = [];
					fileArr.push({
						name: filename1.split(" :")[0],
						revNo: jQuery.parseXML(err.response.body).querySelectorAll("errordetail > message")[0].textContent.split(" ")[3]
					});
					if (msgLength > 1) {
						for (var msgRow = 1; msgRow < msgLength - 1; msgRow++) {
							filename1 = jQuery.parseXML(err.response.body).querySelectorAll("errordetail > message")[msgRow].textContent.split(
								"for file ")[1];
							oMessage = oMessage + "\n" + jQuery.parseXML(err.response.body).querySelectorAll("errordetail > message")[msgRow].textContent;
							fileArr.push({
								name: filename1.split(" :")[0],
								revNo: jQuery.parseXML(err.response.body).querySelectorAll("errordetail > message")[msgRow].textContent.split(" ")[3]
							});
						}
					}
					if (oMessage) {
						MessageBox.error(oMessage);
						for (var fileRow = 0; fileRow < fileArr.length; fileRow++) {
							for (var rowNo = 0; rowNo < CustomAttrSet.length; rowNo++) {

								if (fileArr[fileRow].name === CustomAttrSet[rowNo].Title && fileArr[fileRow].revNo === CustomAttrSet[rowNo].RevNo) {
									sap.ui.getCore().byId("tecDocTable").getItems()[rowNo].getCells()[1].setValue("");
									sap.ui.getCore().byId("tecDocTable").getItems()[rowNo].getCells()[2].setValue("");
									sap.ui.getCore().byId("tecDocTable").getItems()[rowNo].getCells()[1].setValueState(sap.ui.core.ValueState.Error);
									sap.ui.getCore().byId("tecDocTable").getItems()[rowNo].getCells()[2].setValueState(sap.ui.core.ValueState.Error);
									CustomAttrSet[rowNo] = {};
									break;
								}
							}
						}
					}
				}
			});
		},

		/*function name : techUploadCollection*/
		/*Reason :  to capture csrf token */
		/*input parameters: parameters*/
		/*return: null*/
		tecUploadCollection: function() {
			var self = this;
			var oService = "/sap/opu/odata/sap/ZPTP_RFQ_ATTACHMENTS_SRV";
			var oModelUploadImage = new sap.ui.model.odata.ODataModel(oService);
			var request = "AttachmentSet";
			var payload = "";
			oModelUploadImage.create(request, payload, null,
				function(oResponse, status) {
					MessageBox.error(status.statusText);
				},
				function(oError, response) {
					self.csrfToken = oError.request.headers["x-csrf-token"];
					self.uploadAttachment();
				});
		},

		/*function name : uploadAttachment*/
		/*Reason :  to provide csrf token and slug parament with filetypes and calling upload() */
		/*input parameters: parameters*/
		/*return: null*/
		uploadAttachment: function() {
			/*this.dialog1 = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.Attributes", this);
			this.dialog1.open();*/
			// call the upload method 
			var oFileUploader = sap.ui.getCore().byId(tecDocId[0].fileUploader);
			oFileUploader.insertHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "x-csrf-token",
				value: this.csrfToken
			}));
			var filename = CustomAttrSet[0].Title;
			var pr_no = CustomAttrSet[0].PrNum;
			var reviNo = CustomAttrSet[0].RevNo;
			var rfqtype = "PR";
			var lifnr = "";
			var rfq_no = "";
			var screen = "CBE";
			var disc = CustomAttrSetAll[iLimit].Disc;
			var doctype = CustomAttrSetAll[iLimit].DType;
			var reason = CustomAttrSetAll[iLimit].reason_Attb;
			var origin = CustomAttrSetAll[iLimit].orig_Attb;
			var phase = CustomAttrSetAll[iLimit].phase_Attb;
			var unit = CustomAttrSetAll[iLimit].unit_Attb;
			var title = CustomAttrSetAll[iLimit].title;
			oFileUploader.insertHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "SLUG",
				value: filename + "|" + pr_no + "|" + rfqtype + "|" + rfq_no + "|" + lifnr + "|" + screen + "|" + disc + "|" + doctype + "|" +
					reason + "|" + origin + "|" + phase + "|" + unit + "|" + title + "|" + reviNo
			}));
			var fileType = filename.split(".")[1];
			oFileUploader.insertHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "Content-Type",
				value: fileType
			}));
			oFileUploader.upload();
		},

		/*function name : getDownloadAttachmentList*/
		/*Reason :  to bind the data coming from the backend and displating in the frontend with their properties. */
		/*input parameters: parameters*/
		/*return: null*/
		getDownloadAttachmentList: function() {
			/*******************************************************code for download attachments***************************************************************************/
			/*var tabTecId = this.getView().byId("techDoc");*/
			DelFlag = "";
			var tabComId = this.getView().byId("commDoc");
			var jsonModTec = new sap.ui.model.json.JSONModel();
			jsonModTec.setSizeLimit(500);
			var jsonModCom = new sap.ui.model.json.JSONModel();
			jsonModCom.setSizeLimit(500);
			var datArray = new Array();
			var _self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_RFQ_ATTACHMENTS_SRV";
			var requrl = "/AttachmentListSet?$filter=Objid eq'" + prNumber + "' and Objetype eq'" + "PR" + "' and Screen eq'" + "CBE" + "'";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			oMod.read(requrl, null, null, true, function(oData, oResponse) {
				var data = oData.results;
				jQuery.each(data, function(id, record) {
					datArray.push(record);
				});
				var zTec = [];
				var zCom = [];
				var zTec1 = [];
				var zCom1 = [];
				if (data.length !== 0) {
					for (i = 0; i < data.length; i++) {
						if (data[i].VendorAttached === "") {
							if (data[i].Bsart === "ZTEC") {
								zTec.push(data[i]);
							} else {
								zCom.push(data[i]);
							}
						} else {
							if (data[i].Bsart === "ZTEC") {
								zTec1.push(data[i]);
							} else {
								zCom1.push(data[i]);
							}
						}
					}
				}
				//jsonModTec.setData(zTec);
				jsonModCom.setData(zCom);
				/*tabTecId.setModel(jsonModTec, "jsonModTec");*/
				tabComId.setModel(jsonModCom, "jsonModCom");
				_self.setAttachmentHeight();

			});
			/**************************************************************code for download attachments********************************************************************/
		},

		/*function name : setAttachmentHeight*/
		/*Reason :  to check on the height of the attachmentlist */
		/*input parameters: parameters*/
		/*return: null*/
		setAttachmentHeight: function() {
			/*var techList = this.getView().byId("techDoc").getItems().length;*/
			var commList = this.getView().byId("commDoc").getItems().length;
			// tech doc display for the panel size
			/*if (techList === 0) {
				this.getView().byId("techDocBox").setHeight("80px");
			} else if (techList === 1) {
				this.getView().byId("techDocBox").setHeight("142px");
			} else if (techList === 2) {
				this.getView().byId("techDocBox").setHeight("250px");
			} else if (techList === 3) {
				this.getView().byId("techDocBox").setHeight("360px");
			} else {
				this.getView().byId("techDocBox").setHeight("470px");

			}*/
			// Commercial doc display for the panel size
			if (commList === 0) {
				this.getView().byId("commDocBox").setHeight("80px");
			} else if (commList === 1) {
				this.getView().byId("commDocBox").setHeight("142px");
			} else if (commList === 2) {
				this.getView().byId("commDocBox").setHeight("250px");
			} else if (commList === 3) {
				this.getView().byId("commDocBox").setHeight("360px");
			} else {
				this.getView().byId("commDocBox").setHeight("470px");
			}
		},
		/*function name : onSelectChanged*/
		/*Reason :  When click on Attachment tab, the event to appear documents attached */
		/*input parameters: parameters*/
		/*return: null*/
		/*Author: Deepak Vijay*/
		onSelectChanged: function(oEvent) {
			var key = oEvent.getParameters().key;
			if (key === "iconTabBarFilterKey5") {
				this.getDownloadAttachmentList();
			}
		},
		/*function name : destroyDeleteDialog*/
		/*Reason :  to destroy dialog box */
		/*input parameters: parameters*/
		destroyDeleteDialog: function() {
			this.dialog.destroy();
		},

		onDeleteDailog: function(oEvent) {
			this.deleteObj = oEvent.getSource().data("DeleteObject");
			/*var getArcDocID = oEvent.getSource().getProperty("alt").split("-");
			var ArcDocId = getArcDocID[0];*/
			this.dialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.DeleteAttacmentDialog", this);
			this.dialog.open();
		},
		// delete Attachment method 
		onDelete: function() {
			var self = this;
			var sMsg = "";
			self.dialog.destroy();
			/*if (self.getView().byId("idHSeLine").getValue().length > 0) {
				self.saveFlag = true;
				deletePress = true;
				self.onSaveForDrapt();
			}*/
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_RFQ_ATTACHMENTS_SRV";
			var oModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true);
			/*var notifNum = "300004441"
			var Arc = "121B3AF79E611EE9AADC47479634528C"*/
			/*var req_url = "/SN_AttachmentSet(IObjId='" + notifNum + "',ArcDocId='" + this.deleteObj.ArcDocId + "')";*/
			var req_url = "/AttachmentSet(Objid='" + prNumber + "',ArcDocId='" + this.deleteObj.ArcDocId + "')";
			sap.ui.core.BusyIndicator.show(0);
			setTimeout(function() {
				oModel.remove(req_url, {
					method: "DELETE",
					success: function(oData, oResponse) {
						//// Added by Bharat to freeze the screen at MY Attachment /////
						deleteScroll = "X";
						sMsg = "Document Deleted successfully";
						self.getDownloadAttachmentList(prNumber);
						sap.m.MessageBox.success(sMsg);
					},
					error: function(oEvent) {
						// var oMessageBox = jQuery.parseJSON(oEvent.response.body).error.innererror.errordetails;
						// var msgLength = oMessageBox.length;
						// var oMessage;
						// if (msgLength === 0) {
						// 	oMessage = jQuery.parseJSON(oEvent.response.body).error.innererror.errordetails[0].message;
						// } else {
						// 	oMessage = jQuery.parseJSON(oEvent.response.body).error.innererror.errordetails[0].message;
						// 	if (msgLength > 0) {
						// 		for (var msgRow = 1; msgRow < msgLength; msgRow++) {
						// 			oMessage = oMessage + "\n" + jQuery.parseJSON(oEvent.response.body).error.innererror.errordetails[msgRow].message;
						// 		}
						// 	}
						// }
						// sap.m.MessageBox.error(oMessage);
						sap.m.MessageBox.error(jQuery.parseJSON(oEvent.response.body).error.message.value);
						// sMsg = "Document Deletion Field";
						// var oMessage = JSON.parse(ex.response.body);
						// sap.m.MessageBox.error(oMessage.error.innererror.errordetails[0].message);
					}
				});
				sap.ui.core.BusyIndicator.hide();
			});
		},

		/**
		 *function name : ReasonAttributes
		 *Reason :  On Click Issue Reason dialog is opened and data is binded in dialog box
		 *input parameters: oEvent
		 * Author: Deepak Vijay, Dated: 16.09.2019
		 *return: null*/
		ReasonAttributes: function(oEvent) {
			var self = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZPTP_SEARCH_HELP_SRV";
			var oMod = new sap.ui.model.odata.ODataModel(sServiceUrl);
			var readRequestURL = "/DMSearchHelpSet?$filter=Zinput eq 'IssRea' and Werks eq '" + Plant + "'" + " and Banfn eq '" + rfq_number +
				"'";
			oMod.read(readRequestURL, {
				success: function(attachmentData) {
					var attachmentModel = new JSONModel();
					attachmentModel.setData(attachmentData);
					var _oAttachmentDialog = self._getAttachmentDialogReason();
					_oAttachmentDialog.setModel(attachmentModel);
					_oAttachmentDialog.open();
				}
			});
		},
		/**
		 *function name : _getAttachmentDialogReason
		 *Reason :  On click of Issue Reason in Attachment Tab display Unit Dialog Box
		 *input parameters: null
		 *return: null*/
		_getAttachmentDialogReason: function() {
			// create dialog via fragment factory
			this._oAttachmentDialog = sap.ui.xmlfragment("ptp.sourcing.cbe.view.fragments.ReasonAttr", this);
			return this._oAttachmentDialog;
		},
		/**
		 *function name : onSelectDialogItemReasonAttr
		 *Reason : On select of particular Issue Reason it gets binded to the HeaderModel 
		 * so that we can pass the vlaue at the backend at the time of save.
		 *input parameters: oEvent
		 *return: null*/
		onSelectDialogItemReasonAttr: function(oEvent) {
			sap.ui.getCore().byId("IReason").setValue(oEvent.getParameters().selectedItem.getProperty("title"));
			oEvent.getSource().getBinding("items").filter([]);
			sap.ui.getCore().byId("IReason").setValueState(sap.ui.core.ValueState.None);
		},

		/**
		 *function name : _handleValueHelpSearchReason
		 *Reason : Helps us to do search operation in Issue Reason Fragment.
		 *input parameters: oEvent
		 *return: null*/
		_handleValueHelpSearchReason: function(oEvent) {
			// add filter for search
			var aFilters = [];
			var sQuery = oEvent.getParameters().value;
			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("IssRea", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			var binding = oEvent.getSource().getBinding("items");
			binding.filter(aFilters, "Application");
		},

		/**
		 *function name : _handleValueHelpCloseReason
		 *Reason :  On click of cancel button it will destroy the Unit fragment
		 *input parameters: null
		 *return: null*/
		_handleValueHelpCloseReason: function() {
			this._getAttachmentDialogReason().destroy();
		}
	});
});`