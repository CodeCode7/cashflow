jQuery.sap.require("com.accenture.CashFlow.Utils.CustomFormatter");
jQuery.sap.require("com.accenture.CashFlow.Utils.Formatter");
jQuery.sap.require("sap.ui.core.format.NumberFormat");
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	'sap/m/Popover',
	'sap/m/Button',
	'com/accenture/CashFlow/Utils/CustomFormatter',
	"sap/ui/export/Spreadsheet",
	'sap/m/MessageToast',
	"com/accenture/CashFlow/model/models",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Filter",
	"com/accenture/CashFlow/Utils/Formatter",
	'sap/ui/core/util/Export',
	'sap/ui/core/util/ExportTypeCSV',
	'sap/m/MessageBox',
	'com/accenture/CashFlow/controller/VariantsManagement',
], function (Controller, Popover, Button, CustomFormatter, Spreadsheet, MessageToast, models, JSONModel, FilterOperator, Filter,
	Formatter, Export, ExportTypeCSV, MessageBox, VariantsManagement) {
	"use strict";
	var ofvalue;
	var oseldate;
	var oselM;
	var oExportFlag;
	var ofilterPress;
	var odateStart = false;

	return Controller.extend("com.accenture.CashFlow.controller.CashFlowHome", {
		onInit: function () {
			var oCASHFLOW_HIST = new sap.ui.model.json.JSONModel();
			var oCASHFLOW_HIS = new sap.ui.model.json.JSONModel();
			var oCASHFLOW_Pre = new sap.ui.model.json.JSONModel();
			var that = this;
			var histArray = [];
			var predictionArray = [];
			that.onBusyIndicatorStart(); // busy Start
			//calling the CashFlowSet service for getting period -sam1
			that.getOwnerComponent().getModel().metadataLoaded().then(function () {
				that.getOwnerComponent().getModel().read("/CashFlowSet", {
					async: true,
					success: function (data) {
						oCASHFLOW_HIST.setData(data);
						sap.ui.getCore().setModel(oCASHFLOW_HIST, "CASHFLOW_HIST");
						that.onMsgLoadCash();
						var olistData = sap.ui.getCore().getModel("CASHFLOW_HIST").getData().results;
						if (olistData.length > 0) {
							for (var i = 0; i <= 7; i++) {
								histArray.push(olistData[i].MonthYear);
							}
							for (var k = 8; k < olistData.length; k++) {
								predictionArray.push(olistData[k].MonthYear);
							}
						}
						oCASHFLOW_HIS.setData(histArray);
						sap.ui.getCore().setModel(oCASHFLOW_HIS, "oCASHFLOW_HIS");
						oCASHFLOW_Pre.setData(predictionArray);
						sap.ui.getCore().setModel(oCASHFLOW_Pre, "oCASHFLOW_Pre");
						var temp = new sap.ui.core.Item({
							text: "{CC>CompanyCodeDesc}",
							key: "{CC>CompanyCode}"
						});
						var oMcb = new sap.m.MultiComboBox();
						oMcb.bindItems("CC>/Z_FI_CC_FILTER", temp);
						var oModel = new JSONModel("model/data.json");
						sap.ui.getCore().setModel(oModel, "JsonModel");
						that.initCustomFormat();
						//Donut chat initialization 
						var oVizFrame = that.oVizFrame = that.getView().byId("idVizFrame");
						oVizFrame.setVizProperties({
							plotArea: {
								drawingEffect: sap.viz.ui5.types.Line_drawingEffect.glossy,
								dataLabel: {
									visible: true,
									style: [{
										fontSize: "1px"
									}]
								}

							},
							valueAxis: {
								title: {
									visible: true
								}
							},
							categoryAxis: {
								title: {
									visible: true
								}
							},
							legend: {
								visible: true,
								label: {
									style: {
										fontSize: "10px"
									}
								},
								title: {
									visible: false,
									text: "Current Month Net Cash by Company Code"
								}
							},
							title: {
								visible: true,
								alignment: "left",
								text: "Current Month Net Cash by Company Code",
								style: [{
									fontSize: "6px"
								}]
							},
							legendGroup: {
								layout: {
									position: "bottom"
								}

							},
						});
						that._oPopover1 = that.getView().byId("idPopOver");
						that._oPopover1.connect(oVizFrame.getVizUid());
						var otool1 = new sap.viz.ui5.controls.VizTooltip({

						});
						otool1.connect(oVizFrame.getVizUid());
						var scales = [{
							"feed": "color",
							"palette": ["#6d05b9", "#e60811", "#1a0a98", "#16b5e6"]
						}];
						oVizFrame.setVizScales(scales);

						var oTableData = {
							"oDonut": [{
								"oFlow": "Net",
								"oPeriod": "Month End",
								"oObject": "Company Code"
							}, {
								"oFlow": "Inflow",
								"oPeriod": "Current Month",

							}, {
								"oFlow": "Outflow",
								"oPeriod": "Next Month",

							}]
						};
						var oResultsModel1 = new sap.ui.model.json.JSONModel();
						oResultsModel1.setData(oTableData);
						that.getView().byId("table1").setModel(oResultsModel1, "oResultsModel1");
						var odate = new Date();
						that.getView().byId("idheaderdate").setText("Data as of " + odate.toDateString().substr(4, 3) + odate.toDateString().substr(
								10) +
							"" + ".  Predictions for next 3 months");
						var omonth = odate.getMonth();
						var omonth1 = omonth + 1;
						var oselmon;
						if (omonth1 < 9) {
							oselmon = "00" + omonth1;
						} else {
							oselmon = "0" + omonth1;
						}
						var ofulldate = oselmon + odate.getFullYear();
						var settingsModel1 = {
							dataset: [{
								dimensions: [{
									name: 'Company',
									value: "{{DN>CompanyDescription}"
								}],
								measures: [{
									name: 'Cashflow_Per',
									value: '{DN>Cashflow_Per}'
								}],
								data: {
									path: "DN>/Z_CASHFLOW_COM_CONSUMPTION(mon='" + ofulldate + "',FLAG='X')/Set",
								}
							}]

						};

						var oDataset1 = new sap.viz.ui5.data.FlattenedDataset(settingsModel1.dataset[0]);
						oVizFrame.setDataset(oDataset1);
						var feedCategoryAxisBB1 = new sap.viz.ui5.controls.common.feeds.FeedItem({
							'uid': "color",
							'type': "Dimension",
							'values': ["Company"]
						});
						var feedActualValuesBB2 = new sap.viz.ui5.controls.common.feeds.FeedItem({
							'uid': "size",
							'type': "Measure",
							'values': ["Cashflow_Per"]
						});

						oVizFrame.addFeed(feedCategoryAxisBB1);
						oVizFrame.addFeed(feedActualValuesBB2);

						//New code 
						var oModel1 = new JSONModel("model/data.json");

						sap.ui.getCore().setModel(oModel1, "JsonModel");
						//Cash Flow Forecast graph 
						var oVizFrame2 = that.oVizFrame2 = that.getView().byId("idVizFrame2");

						var settingsModel = ({
							value: [
								["CashOutflow", "CashInflow", "NetCash"]
							],
							vizType: ["stacked_combination"],
							dataset: [{
								dimensions: [{
									name: 'MonthYear',
									value: "{MonthYear}"
								}],
								measures: [{
									name: 'OutFlow Cash',
									value: '{CashOutflow}'

								}, {
									name: 'Inflow Cash',
									value: '{CashInflow}'
								}, {
									name: 'Net Cash',
									value: '{NetCash}'
								}],
								data: {
									path: "/CashFlowSet",

								}
							}],
							rules: [{
								plotArea: {
									dataLabel: {},
									dataPointStyleMode: "override",
									dataPointStyle: {
										"rules": [{
											"dataContext": [{
												"MonthYear": { in : histArray
												},
												"Inflow Cash": "*"
											}],
											"properties": {
												"color": "#03960e",

											},
											displayName: "Inflow Cash"
										}, {
											"dataContext": [{
												"MonthYear": { in : histArray
												},
												"OutFlow Cash": "*"
											}],
											"properties": {
												"color": "#9e0cce",

											},
											displayName: "Outflow Cash"
										}, {
											"dataContext": [{
												"MonthYear": { in : histArray
												},
												"Net Cash": "*"
											}],
											"properties": {

												"lineColor": "#291a9e",
												"color": "#291a9e",
												"dataLabel": "hide"

											},
											displayName: "Net Cash"
										}, {
											"dataContext": [{
												"MonthYear": { in : predictionArray
												},
												"Inflow Cash": "*"
											}],
											"properties": {
												"pattern": "diagonalStripe",
												"color": "#17cfef",

											},

											displayName: "Inflow Cash Prediction"
										}, {
											"dataContext": [{
												"MonthYear": { in : predictionArray
												},
												"OutFlow Cash": "*"
											}],
											"properties": {
												"pattern": "diagonalStripe",
												"color": "#ef17d3",

											},
											displayName: "Outflow Cash Prediction"
										}, {
											"dataContext": [{
												"MonthYear": { in : predictionArray
												},
												"Net Cash": "*"
											}],
											"properties": {
												"lineColor": "#291a9e",
												"color": "#291a9e",
												"lineType": "dash",
												"dataLabel": "hide"

											},
											displayName: "Net Cash Prediction"
										}]
									}
								}
							}],

							commonrules: {
								plotArea: {
									drawingEffect: sap.viz.ui5.types.Line_drawingEffect.glossy,
									dataLabel: {
										formatString: CustomFormatter.FIORI_LABEL_SHORTFORMAT_2, //'0,00,000.00€'
										visible: false,
										hideWhenOverlap: false,
										allowOverlap: false,
										/*  overlapBehavior: true,*/
										crop: false,
										overflow: 'none',
										enabled: true,
										inside: true,
										style: {
											color: "#0c0c0c",
											//fontWeight: "bold",
											colorRange: "all"
										},

									},

									dataShape: {
										primaryAxis: ["bar", "bar", "line"]
									},
									scales: {
										feed: "color",
										palette: ["#bb0f0f", "#689652", "#ffec14"]
									}

								},

								valueAxis: {
									label: {
										formatString: CustomFormatter.FIORI_LABEL_SHORTFORMAT_2
									},
									title: {
										visible: false

									}
								},
								categoryAxis: {
									title: {
										visible: false,
										text: "Monthly"
									}
								},
								legend: {
									visible: true,
									title: {
										visible: false,
										text: "Cash Flow Forecast"
									}
								},
								title: {
									visible: false,
									text: "Cash Flow Forecast"
								},
								legendGroup: {
									layout: {
										position: "bottom"
									}

								}
							}
						});

						var bindValue = settingsModel;
						var oPopOver = that.getView().byId("idPopOver2");
						var oDataset = new sap.viz.ui5.data.FlattenedDataset(bindValue.dataset[0]);
						oVizFrame2.setDataset(oDataset);
						oVizFrame2.setVizType(
							bindValue.vizType[0]);
						oVizFrame2.setVizProperties(bindValue.commonrules);
						oVizFrame2.setVizProperties(bindValue.rules[0]);

						that._oPopover2 = that.getView().byId("idPopOver2");
						that._oPopover2.connect(oVizFrame2.getVizUid());
						var otool = new sap.viz.ui5.controls.VizTooltip({
							"formatString": CustomFormatter.FIORI_LABEL_SHORTFORMAT_2
						});
						otool.connect(oVizFrame2.getVizUid());

						var feedCategoryAxis = new sap.viz.ui5.controls.common.feeds.FeedItem({
								'uid': "categoryAxis",
								'type': "Dimension",
								'values': ["MonthYear"]
							}),
							feedActualValues = new sap.viz.ui5.controls.common.feeds.FeedItem({
								'uid': "valueAxis",
								'type': "Measure",
								'values': ["OutFlow Cash"]
							}),
							feedAdditionalValues = new sap.viz.ui5.controls.common.feeds.FeedItem({
								'uid': "valueAxis",
								'type': "Measure",
								'values': ["Inflow Cash"]
							}),
							feedCostValues = new sap.viz.ui5.controls.common.feeds.FeedItem({
								'uid': "valueAxis",
								'type': "Measure",
								'values': ["Net Cash"]
							});

						oVizFrame2.removeAllFeeds();
						oVizFrame2.addFeed(feedCategoryAxis);
						oVizFrame2.addFeed(feedActualValues);
						oVizFrame2.addFeed(
							feedAdditionalValues);
						oVizFrame2.addFeed(feedCostValues);
						/*  oVizFrame2.getDataset().getBinding("data").filter(oFilters);*/

						//New code for bank balance trend VizFrame3
						var oVizFrame3 = that.oVizFrame3 = that.getView().byId("idVizFrame3");
						var settingsModelBB = ({
							rules: [{
								plotArea: {
									dataPointStyle: {
										"rules": [{

											"dataContext": [{
												"Monthly": { in : histArray
												},
												"Opening Balance": "*"
											}],
											"properties": {
												"lineColor": "#150c94",
												"color": "#150c94",
												//"lineType": "dash"

											},
											displayName: "Opening Balance"

										}, {
											"dataContext": [{
												"Monthly": { in : histArray
												},
												"Net cash flow": "*"
											}],
											"properties": {
												"lineColor": "#f78017",
												"color": "#f78017",
												"dataLabel": "hide"
													//"lineType": "dash"
											},
											displayName: "Net cash flow"
										}, {
											"dataContext": [{
												"Monthly": { in : histArray
												},
												"Ending Balance": "*"
											}],
											"properties": {
												"lineColor": "#666666",
												"color": "#666666",
												//"lineType": "dash"
											},
											displayName: "Ending Balance"
										}, {

											"dataContext": [{
												"Monthly": { in : predictionArray
												},
												"Opening Balance": "*"
											}],
											"properties": {
												"lineColor": "#150c94",
												"color": "#150c94",
												"lineType": "dash"
											},
											displayName: "Opening Balance Prediction"

										}, {
											"dataContext": [{
												"Monthly": { in : predictionArray
												},
												"Net cash flow": "*"
											}],
											"properties": {
												"lineColor": "#f78017",
												"color": "#f78017",
												"lineType": "dash",
												"dataLabel": "hide"
											},

											displayName: "Net cash flow Prediction"
										}, {
											"dataContext": [{
												"Monthly": { in : predictionArray
												},
												"Ending Balance": "*"
											}],
											"properties": {
												"lineColor": "#666666",
												"color": "#666666",
												"lineType": "dash"

											},
											displayName: "Ending Balance Prediction"
										}]

									}
								}
							}],

							commonrules: {
								plotArea: {
									dataLabel: {
										formatString: CustomFormatter.FIORI_LABEL_SHORTFORMAT_2, //'0,00,000.00€'
										visible: false,
										hideWhenOverlap: false,
										allowOverlap: true,
										crop: false,
										overflow: 'none',
										enabled: true,
										inside: true
									},
									dataShape: {
										primaryAxis: ["line", "line", "line"]
									}
								},
								valueAxis: {
									label: {
										formatString: CustomFormatter.FIORI_LABEL_SHORTFORMAT_2
									},
									title: {
										visible: false,

									}
								},
								categoryAxis: {
									title: {
										visible: false,
										text: "Monthly"
									}
								},
								legend: {
									visible: false,
									title: {
										visible: false,
										text: "Opening and Ending Bank Balance Trend"
									}
								},
								title: {
									visible: false,
									text: "Opening and Ending Bank Balance Trend"
								},
								legendGroup: {
									layout: {
										position: "bottom"
									}

								},
							}
						});
						var bindValueBB = settingsModelBB;
						oVizFrame3.setVizProperties(bindValueBB.commonrules);
						oVizFrame3.setVizProperties(bindValueBB.rules[0]);
						var scales3 = [{
							"feed": "color",
							"palette": ["#22a1ef", "#a7a3a0", "#f98b17"]
						}];
						//oVizFrame3.setVizScales(scales3);
						that._oPopover3 = that.getView().byId("idPopOver3");
						that._oPopover3.connect(oVizFrame3.getVizUid());
						var otool3 = new sap.viz.ui5.controls.VizTooltip({
							"formatString": CustomFormatter.FIORI_LABEL_SHORTFORMAT_2
						});
						otool3.connect(oVizFrame3.getVizUid());
						odateStart = true;
					},
					error: function () {

					}
				});

			});
		},

		onReportPress: function (event) {
			//Press report buton
			var that = this;
			var popover = new Popover({
				showHeader: false,
				placement: sap.m.PlacementType.Bottom,
				content: [
					new Button({
						text: ' Print',
						type: sap.m.ButtonType.Transparent,
						press: function (oEvent) {
							that.onPrint(oEvent);
						}
					}),
					new Button({
						text: 'Send by e-mail',
						type: sap.m.ButtonType.Transparent,
						press: function (oEvent) {
							var URL = window.location.href;
							sap.m.URLHelper.triggerEmail("", "Cashflow Information ", " Hi All,     Please find cashflow forecaster application URL:" +
								URL);
						}

					}),
					new Button({
						text: 'Export to Excel Sheet ',
						type: sap.m.ButtonType.Transparent,
						press: function (oEvent) {

							if (oExportFlag) {
								oExportFlag = oExportFlag;
							} else {
								oExportFlag = "cash";
							}
							if (oExportFlag === "bank") {
								that.onExportBankGraph(oEvent);
							} else {
								that.onExportCash(oEvent);
							}

						}
					})
				]
			}).addStyleClass('sapMOTAPopover sapTntToolHeaderPopover');

			popover.openBy(event.getSource());
		},

		onFilterPress1: function (oEvent) {
			ofilterPress = true;
			if (!this._oPopover) {
				/*    this._oPopover = sap.ui.xmlfragment("com.accenture.CashFlow.view.Popover", this);*/
				this._oPopover = sap.ui.xmlfragment("com.accenture.CashFlow.view.Popover", this.getView().getController());
				this.getView().addDependent(this._oPopover);
				this._oPopover.addStyleClass('sapMOTAPopover sapTntToolHeaderPopover');
				/*  this._oPopover.bindElement("/ProductCollection/0");*/
			}
			this._oPopover.addStyleClass('sapMOTAPopover sapTntToolHeaderPopover');
			this._oPopover.openBy(oEvent.getSource());
		},
		onCharts: function (event) {
			var that = this;
			var popover = new Popover({
				showHeader: false,
				placement: sap.m.PlacementType.Bottom,
				content: [
					new Button({
						text: ' Cash Flow Forecast',
						type: sap.m.ButtonType.Transparent,
						press: function () {
							that.onCash();

							popover.close();
						}
					}),
					new Button({
						text: 'Bank balance Trend ',
						type: sap.m.ButtonType.Transparent,
						press: function () {
							oExportFlag = "bank";
							that.onBank();
							if (ofilterPress) {
								sap.ui.getCore().byId("mcbBankID").setSelectedKeys("");
								sap.ui.getCore().byId("mcbBankCountry").setSelectedKeys("");
								sap.ui.getCore().byId("mcbHouseBank").setSelectedKeys("");
							}

							popover.close();
						}
					})

				]
			}).addStyleClass('sapMOTAPopover sapTntToolHeaderPopover');

			popover.openBy(event.getSource());
		},
		onBank: function () {
			this.getView().byId("idVizFrame2").setVisible(false);
			this.getView().byId("idChartContainer").setVisible(false);
			this.getView().byId("idVizFrame").setVisible(false);
			this.getView().byId("idVizFrame3").setVisible(true);
			this.getView().byId("idChartContainer2").setVisible(true);
			this.getView().byId("table1").setVisible(false);
			this.getView().byId("id4").setVisible(true);
			this.getView().byId("id5").setVisible(true);
			this.getView().byId("id6").setVisible(true);
			this.getView().byId("msgid2").setVisible(true);
			this.getView().byId("msgid1").setVisible(false);

			this.getView().byId("id1").setVisible(false);
			this.getView().byId("id2").setVisible(false);
			this.getView().byId("id3").setVisible(false);
		},
		onCash: function () {
			oExportFlag = "cash";
			if (ofilterPress) {
				sap.ui.getCore().byId("mcbBankID").setSelectedKeys("");
				sap.ui.getCore().byId("mcbBankCountry").setSelectedKeys("");
				sap.ui.getCore().byId("mcbHouseBank").setSelectedKeys("");
				sap.ui.getCore().byId("mcbBankID").setEditable(false);
				sap.ui.getCore().byId("mcbBankCountry").setEditable(false);
				sap.ui.getCore().byId("mcbHouseBank").setEditable(false);
			}
			this.getView().byId("idVizFrame2").setVisible(true);
			this.getView().byId("idVizFrame").setVisible(true);
			this.getView().byId("idChartContainer").setVisible(true);
			this.getView().byId("idChartContainer2").setVisible(false);
			this.getView().byId("idVizFrame3").setVisible(false);
			this.getView().byId("table1").setVisible(true);
			this.getView().byId("id4").setVisible(false);
			this.getView().byId("id5").setVisible(false);
			this.getView().byId("id6").setVisible(false);
			this.getView().byId("id1").setVisible(true);
			this.getView().byId("id2").setVisible(true);
			this.getView().byId("id3").setVisible(true);
			this.getView().byId("msgid2").setVisible(false);
			this.getView().byId("msgid1").setVisible(true);
		},
		onHomePress: function () {
			this.onCash();
		},

		initCustomFormat: function () {
			CustomFormatter.registerCustomFormat();
		},
		onPrint: function (oEvent) {
			var oTarget = this.getView(),
				$domTarget = oTarget.$()[0],
				sTargetContent = $domTarget.innerHTML,
				sOriginalContent = document.body.innerHTML;

			document.body.innerHTML = sTargetContent;
			window.print();
			document.body.innerHTML = sOriginalContent;

		},
		createColumnConfig: function () {
			return [
				/*{
				        label: 'Company Code',
				        property: 'Companycode',
				        width: '10'
				      },*/
				{
					label: 'MonthYear',
					property: 'MonthYear',
					width: '10'

				}, {
					label: 'Date',
					property: 'Clfiscyearper',
					width: '10'

				}, {
					label: 'Outflow Cash',
					property: 'CashOutflow',
					width: '15',
					type: 'number',
					scale: 3,
					delimiter: true
						/*  template: {
						    content: {
						      parts: ['CashOutflow'],
						      formatter: Formatter.numFormat
						    }
						  }*/

				}, {
					label: 'Inflow Cash',
					property: 'CashInflow',
					width: '15',
					type: 'number',
					scale: 3,
					delimiter: true

				}, {
					label: 'Net',
					property: 'NetCash',
					width: '15',
					type: 'number',
					scale: 3,
					delimiter: true

				}
			];
		},
		createTitle: function () {
			return [{
				application: "Cash Flow Forecaster",
				title: "Cash Flow Forecaster_Data"
			}];
		},

		onExport: function (onExport) {

			var aCols, aTitle, aProducts, oSettings;
			aCols = this.createColumnConfig();
			aTitle = this.createTitle();
			var oModel = sap.ui.getCore().getModel("CASHFLOW_HIST").getData();
			oSettings = {
				workbook: {
					columns: aCols,
					context: {}
				},
				dataSource: oModel["results"],
				fileName: "CashFlowForecasterReport(Cash Data).xlsx"
			};
			new Spreadsheet(oSettings)
				.build()
				.then(function () {
					MessageToast.show("CashFlow Forecaster export has finished");
				});
		},

		createColumnConfigBank: function () {
			return [
				/*{
				        label: 'Company Code',
				        property: 'Companycode',
				        width: '10'
				      }, {
				        label: 'Bank Country',
				        property: 'Bankcountry',
				        width: '10'

				      }, {
				        label: 'House Bank',
				        property: 'Housebank',
				        width: '10'

				      }, {
				        label: 'Bank Id',
				        property: 'Bankid',
				        width: '10'

				      },*/
				{
					label: 'Date',
					property: 'Clfiscyear',
					width: '10'

				}, {
					label: 'MonthYear',
					property: 'Monthyear',
					width: '10'

				}, {
					label: 'Opening Balance',
					property: 'Openbal',
					width: '15',
					type: 'number',
					scale: 3,
					delimiter: true

				}, {
					label: 'Ending Balance',
					property: 'Closebal',
					width: '15',
					type: 'number',
					scale: 3,
					delimiter: true

				}, {
					label: 'Net Cash',
					property: 'Netbal',
					width: '20',
					type: 'number',
					scale: 3,
					delimiter: true

				},
			];
		},
		createTitleBank: function () {
			return [{
				application: "Cash Flow Forecaster(Bank Data)",
				title: "Cash Flow Forecaster_Data"
			}];
		},
		onExportBank: function () {
			var aCols, aTitle, aProducts, oSettings;
			aCols = this.createColumnConfigBank();
			aTitle = this.createTitleBank();
			var oModel = sap.ui.getCore().getModel("BankBChartJson").getData();
			oSettings = {
				workbook: {
					columns: aCols,
					context: {}
				},
				dataSource: oModel["results"],
				fileName: "CashFlowForecasterReport(Bank Data).xlsx"
			};
			new Spreadsheet(oSettings)
				.build()
				.then(function () {
					MessageToast.show("CashFlow Forecaster export has finished");
				});

		},
		onCompanyCode: function () {

			var aFilters = [];
			var oFilter = [];
			var mcbCompanyFilter = sap.ui.getCore().byId("mcbCompanyCode").getSelectedKeys();
			if (mcbCompanyFilter.length > 0) {
				for (var k = 0; k < mcbCompanyFilter.length; k++) {
					oFilter.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));
				}
				sap.ui.getCore().byId("mcbBankCountry").getBinding("items").filter(new Filter({
					filters: oFilter,
					and: false
				}));
				this.onCompanygraph();
				var vizFrame = this.getView().byId("idVizFrame3");
				vizFrame.getDataset().getBinding("data").filter(oFilter);
				this.getView().byId("table16").getBinding("items").filter(oFilter);
				this.getView().byId("table15").getBinding("items").filter(oFilter);
				if (oExportFlag) {
					oExportFlag = oExportFlag;
				} else {
					oExportFlag = "cash";
				}
				if (oExportFlag === "bank") {
					sap.ui.getCore().byId("mcbBankCountry").setEditable(true);
				} else {
					sap.ui.getCore().byId("mcbBankCountry").setEditable(false);
				}
				//  this.onCompanycodeBusy();

			}

		},
		onBankCountry: function () {
			var aFilters = [];
			var aFilters1 = [];
			var oaFilters = [];
			var oaFilters1 = [];
			var allFilters = [];

			var mcbCompanyFilter = sap.ui.getCore().byId("mcbCompanyCode").getSelectedKeys();
			var mcbBankCountry = sap.ui.getCore().byId("mcbBankCountry").getSelectedKeys();
			if (mcbCompanyFilter.length > 0) {

				for (var k = 0; k < mcbCompanyFilter.length; k++) {

					aFilters.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));

				}
				oaFilters.push(new Filter({
					filters: aFilters,
					or: false
				}));
			}
			if (mcbBankCountry.length > 0) {
				sap.ui.getCore().byId("mcbHouseBank").setEditable(true);
				for (var i = 0; i < mcbBankCountry.length; i++) {
					aFilters1.push(new Filter("Bankcountry", FilterOperator.EQ, mcbBankCountry[i]));

				}
				oaFilters.push(new Filter({
					filters: aFilters1,
					or: false
				}));

				allFilters.push(new Filter({
					filters: oaFilters,
					and: true
				}));

				sap.ui.getCore().byId("mcbHouseBank").getBinding("items").filter(oaFilters);
				this.getView().byId("table16").getBinding("items").filter(oaFilters);
				this.onBankCountrygraph();
			}

			/*var vizFrame = this.getView().byId("idVizFrame3");
			vizFrame.getDataset().getBinding("data").filter(allFilters);*/
		},
		onHouseBank: function () {
			var aFilters = [];
			var oaFilters = [];
			var allFilters = [];
			var oFilter1 = [];
			var oFilter2 = [];
			var oFilter3 = [];

			var mcbCompanyFilter = sap.ui.getCore().byId("mcbCompanyCode").getSelectedKeys();
			var mcbBankCountry = sap.ui.getCore().byId("mcbBankCountry").getSelectedKeys();
			var mcbHouseBank = sap.ui.getCore().byId("mcbHouseBank").getSelectedKeys();
			if (mcbCompanyFilter.length > 0) {
				for (var k = 0; k < mcbCompanyFilter.length; k++) {
					oFilter1.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));

				}
				oaFilters.push(new Filter({
					filters: oFilter1,
					or: false
				}));
			}
			if (mcbBankCountry.length > 0) {
				for (var i = 0; i < mcbBankCountry.length; i++) {
					oFilter2.push(new Filter("Bankcountry", FilterOperator.EQ, mcbBankCountry[i]));

				}
				oaFilters.push(new Filter({
					filters: oFilter2,
					or: false
				}));
			}
			if (mcbHouseBank.length > 0) {
				sap.ui.getCore().byId("mcbBankID").setEditable(true);
				for (var j = 0; j < mcbHouseBank.length; j++) {
					oFilter3.push(new Filter("Housebank", FilterOperator.EQ, mcbHouseBank[j]));

				}
				oaFilters.push(new Filter({
					filters: oFilter3,
					or: false
				}));

				allFilters.push(new Filter({
					filters: oaFilters,
					and: true
				}));

				sap.ui.getCore().byId("mcbBankID").getBinding("items").filter(allFilters);
				this.getView().byId("table16").getBinding("items").filter(allFilters);
				this.onHouseBankgraph();
			}

		},
		onCompanygraph: function () {
			var aFilters = [];
			var oaFilters = [];
			var mcbCompanyFilter = sap.ui.getCore().byId("mcbCompanyCode").getSelectedKeys();
			if (mcbCompanyFilter.length > 0) {
				//aFSearch.push(new Filter("CompanyCode", FilterOperator.EQ, mcbCompanyFilter));
				for (var k = 0; k < mcbCompanyFilter.length; k++) {
					aFilters.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));
				}
				oaFilters.push(new Filter({
					filters: aFilters,
					or: false
				}));
			}
			var vizFrame = this.getView().byId("idVizFrame2");
			vizFrame.getDataset().getBinding("data").filter(aFilters, true);
			this.getView().byId("table15").getBinding("items").filter(aFilters, true);

		},
		onRenderComplete: function () {
			if (odateStart == true) {
				var vizFrame = this.getView().byId("idVizFrame2");
				var odate = new Date();
				var omonth = odate.getMonth();
				var omonth1 = omonth + 1;
				var nextM = omonth1 + 1;
				var lastomonth;
				var curntmonth;
				var nxtmonth;
				var lastMdate;

				if (omonth1 < 9) {
					if (omonth == 0) {
						lastomonth = "012";
						lastMdate = odate.getFullYear() - 1;
					} else {
						lastomonth = "00" + omonth;
						lastMdate = odate.getFullYear();
					}

				} else {
					lastomonth = "0" + omonth;
				}
				var lastMonthfulldate = lastomonth + lastMdate + "";
				var lastMonth = vizFrame.getDataset().getBinding("data").getModel().getProperty("/CashFlowSet('" + lastMonthfulldate + "')");
				/*  var c = new sap.ui.model.type.Currency({
				    showMeasure: true
				  });
				  var c1 = c.formatValue(lastMonth.NetCash,"string");
				  this.getView().byId("idtxtNet1").setText(c1);*/
				this.getView().byId("idtxtNet1").setText(this.currencyformatterTxt(lastMonth.NetCash) + " €");
				this.getView().byId("idtxtInflow1").setText(this.currencyformatterTxt(lastMonth.CashInflow) + " €");
				this.getView().byId("idtxtOutflow1").setText(this.currencyformatterTxt(lastMonth.CashOutflow) + " €");
				this.getView().byId("idlastNet1").setText(lastMonth.PercNet + "%");
				this.getView().byId("idlastInflow1").setText(lastMonth.PercInflow + "%");
				this.getView().byId("idlastOutflow1").setText(lastMonth.PercOutflow + "%");
				var Icon1 = this.getView().byId("idlastIcon1");
				var Icon2 = this.getView().byId("idlastIcon2");
				var Icon3 = this.getView().byId("idlastIcon3");
				Formatter.getIconFlag(lastMonth.PercNet, Icon1);
				Formatter.getIconFlag(lastMonth.PercInflow, Icon2);
				Formatter.getIconFlag(lastMonth.PercOutflow, Icon3);

				if (omonth1 < 9) {
					curntmonth = "00" + omonth1;
				} else {
					curntmonth = "0" + omonth1;
				}
				var Currentfulldate = curntmonth + odate.getFullYear();
				var CurrentMonth = vizFrame.getDataset().getBinding("data").getModel().getProperty("/CashFlowSet('" + Currentfulldate + "')");
				this.getView().byId("idtxtNet2").setText(this.currencyformatterTxt(CurrentMonth.NetCash) + " €");
				this.getView().byId("idtxtInflow2").setText(this.currencyformatterTxt(CurrentMonth.CashInflow) + " €");
				this.getView().byId("idtxtOutflow2").setText(this.currencyformatterTxt(CurrentMonth.CashOutflow) + " €");
				this.getView().byId("idCurrentNet").setText(CurrentMonth.PercNet + "%");
				this.getView().byId("idCurrentInflow").setText(CurrentMonth.PercInflow + "%");
				this.getView().byId("idCurrentOutflow").setText(CurrentMonth.PercOutflow + "%");
				var currIcon1 = this.getView().byId("idCurrentIcon1");
				var currIcon2 = this.getView().byId("idCurrentIcon2");
				var currIcon3 = this.getView().byId("idCurrentIcon3");
				Formatter.getIconFlag(CurrentMonth.PercNet, currIcon1);
				Formatter.getIconFlag(CurrentMonth.PercInflow, currIcon2);
				Formatter.getIconFlag(CurrentMonth.PercOutflow, currIcon3);

				var nextMonth;
				var nextdate;
				if (omonth1 === 12) {
					nxtmonth = "001";
					nextdate = odate.getFullYear() + 1;
				} else {
					if (omonth1 < 9) {
						nxtmonth = "00" + nextM;
						nextdate = odate.getFullYear();
					} else {
						nxtmonth = "0" + nextM;
						nextdate = odate.getFullYear();
					}
				}

				var Nextfulldate = nxtmonth + nextdate;
				var NextMonth = vizFrame.getDataset().getBinding("data").getModel().getProperty("/CashFlowSet('" + Nextfulldate + "')");
				this.getView().byId("idtxtNet3").setText(this.currencyformatterTxt(NextMonth.NetCash) + " €");
				this.getView().byId("idtxtInflow3").setText(this.currencyformatterTxt(NextMonth.CashInflow) + " €");
				this.getView().byId("idtxtOutflow3").setText(this.currencyformatterTxt(NextMonth.CashOutflow) + " €");
				this.getView().byId("idNextMonthNet").setText(NextMonth.PercNet + "%");
				this.getView().byId("idNextMonthInflow").setText(NextMonth.PercInflow + "%");
				this.getView().byId("idNextMonthOutflow").setText(NextMonth.PercOutflow + "%");
				var nextIcon1 = this.getView().byId("idNextIcon1");
				var nextIcon2 = this.getView().byId("idNextIcon2");
				var nextIcon3 = this.getView().byId("idNextIcon3");
				Formatter.getIconFlag(NextMonth.PercNet, nextIcon1);
				Formatter.getIconFlag(NextMonth.PercInflow, nextIcon2);
				Formatter.getIconFlag(NextMonth.PercOutflow, nextIcon3);
				this.onBusyIndicatorEnd();
			}

		},
		onBankRenderComplete: function () {
			if (odateStart == true) {
				var vizFrame = this.getView().byId("idVizFrame3");
				var odate = new Date();
				var omonth = odate.getMonth();
				var omonth1 = omonth + 1;
				var nextM = omonth1 + 1;
				var lastomonth;
				var curntmonth;
				var nxtmonth;
				var lastMdate;

				if (omonth1 < 9) {
					if (omonth == 0) {
						lastomonth = "12";
						lastMdate = odate.getFullYear() - 1;
					} else {
						lastomonth = "0" + omonth;
						lastMdate = odate.getFullYear();
					}

				} else {
					lastomonth = omonth;
				}
				var lastMonthfulldate = lastMdate + "" + lastomonth;
				var lastMonth = vizFrame.getDataset().getBinding("data").getModel().getProperty("/BankBChartSet('" + lastMonthfulldate + "')");
				this.getView().byId("idtxtOpenBal1").setText(this.currencyformatterTxt(lastMonth.Openbal) + " €");
				this.getView().byId("idtxtNetBal1").setText(this.currencyformatterTxt(lastMonth.Netbal) + " €");
				this.getView().byId("idtxtEndBal1").setText(this.currencyformatterTxt(lastMonth.Closebal) + " €");
				this.getView().byId("idLastOpen").setText(lastMonth.PercOpen + "%");
				this.getView().byId("idLastNetBal").setText(lastMonth.PercNet + "%");
				this.getView().byId("idLastEndBal").setText(lastMonth.PercClose + "%");
				var Icon1 = this.getView().byId("idLastBankIcon1");
				var Icon2 = this.getView().byId("idLastBankIcon2");
				var Icon3 = this.getView().byId("idLastBankIcon3");
				Formatter.getIconFlagBank(lastMonth.PercOpen, Icon1);
				Formatter.getIconFlagBank(lastMonth.PercNet, Icon2);
				Formatter.getIconFlagBank(lastMonth.PercClose, Icon3);
				if (omonth1 < 9) {
					curntmonth = "0" + omonth1;
				} else {
					curntmonth = omonth1;
				}
				var Currentfulldate = odate.getFullYear() + "" + curntmonth;
				var CurrentMonth = vizFrame.getDataset().getBinding("data").getModel().getProperty("/BankBChartSet('" + Currentfulldate + "')");
				this.getView().byId("idtxtOpenBal2").setText(this.currencyformatterTxt(CurrentMonth.Openbal) + " €");
				this.getView().byId("idtxtNetBal2").setText(this.currencyformatterTxt(CurrentMonth.Netbal) + " €");
				this.getView().byId("idtxtEndBal2").setText(this.currencyformatterTxt(CurrentMonth.Closebal) + " €");
				this.getView().byId("idCurrentOpenBal").setText(CurrentMonth.PercOpen + "%");
				this.getView().byId("idCurrentNetBal").setText(CurrentMonth.PercNet + "%");
				this.getView().byId("idCurrentEndBal").setText(CurrentMonth.PercClose + "%");
				var currIcon1 = this.getView().byId("idCurrentBankIcon1");
				var currIcon2 = this.getView().byId("idCurrentBankIcon2");
				var currIcon3 = this.getView().byId("idCurrentBankIcon3");
				Formatter.getIconFlagBank(CurrentMonth.PercOpen, currIcon1);
				Formatter.getIconFlagBank(CurrentMonth.PercNet, currIcon2);
				Formatter.getIconFlagBank(CurrentMonth.PercClose, currIcon3);
				var nextMonth;
				var nextdate;
				if (omonth1 === 12) {
					nxtmonth = "01";
					nextdate = odate.getFullYear() + 1;
				} else {
					if (omonth1 < 9) {
						nxtmonth = "0" + nextM;
						nextdate = odate.getFullYear();
					} else {
						nxtmonth = nextM;
						nextdate = odate.getFullYear();
					}
				}

				var Nextfulldate = nextdate + "" + nxtmonth;
				var NextMonth = vizFrame.getDataset().getBinding("data").getModel().getProperty("/BankBChartSet('" + Nextfulldate + "')");
				this.getView().byId("idtxtOpenBal3").setText(this.currencyformatterTxt(NextMonth.Openbal) + " €");
				this.getView().byId("idtxtNetBal3").setText(this.currencyformatterTxt(NextMonth.Netbal) + " €");
				this.getView().byId("idtxtEndBal3").setText(this.currencyformatterTxt(NextMonth.Closebal) + " €");
				this.getView().byId("idNextOpenBal").setText(NextMonth.PercOpen + "%");
				this.getView().byId("idNextNetBal").setText(NextMonth.PercNet + "%");
				this.getView().byId("idNextEndBal").setText(NextMonth.PercClose + "%");
				var nextIcon1 = this.getView().byId("idNextBankIcon1");
				var nextIcon2 = this.getView().byId("idNextBankIcon2");
				var nextIcon3 = this.getView().byId("idNextBankIcon3");
				Formatter.getIconFlagBank(NextMonth.PercOpen, nextIcon1);
				Formatter.getIconFlagBank(NextMonth.PercNet, nextIcon2);
				Formatter.getIconFlagBank(NextMonth.PercClose, nextIcon3);
				this.onBusyIndicatorEnd();
				this.onMsgLoadBank();
			}
			/*  this.onMsgLoadCash();
			  this.onMsgLoadBank();*/

		},
		onPressFlow: function (oEvent) {
			this.getView().byId("idVizFrame").setBusy(true);
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "YYYY/MM/DD"
			});
			//  var dateFormatted = dateFormat.format(new Date(value));
			var aFilters = [];
			var odate = new Date();
			var omonth = odate.getMonth();
			var omonth1 = omonth + 1;
			var oVizFrame = this.oVizFrame = this.getView().byId("idVizFrame");
			if (omonth1 < 9) {
				omonth = "00" + omonth1;
			} else {
				omonth = "0" + omonth1;
			}

			var ofulldate;
			if (oseldate) {
				ofulldate = oseldate;
			} else {
				ofulldate = omonth + odate.getFullYear();
			}
			if (oselM) {
				oselM = oselM;
			} else {
				oselM = "Current Month";
			}

			var txtoFlow = oEvent.getSource().getProperty("text");
			var oFlag;
			var odate;
			if (txtoFlow === "Net") {
				odate = "0072018";
				oFlag = "X";
				oVizFrame.setVizProperties({
					title: {
						visible: true,
						alignment: "left",
						text: oselM + " Net cash by Company Code",
						style: [{
							fontSize: "8px"
						}]
					}
				});
				//aFilters.push(new Filter("FLAG", FilterOperator.EQ, "X"));
			}
			if (txtoFlow === "Inflow") {
				odate = "0072018";
				oFlag = "Y";
				oVizFrame.setVizProperties({
					title: {
						visible: true,
						alignment: "left",
						text: oselM + " Inflow cash by Company Code",
						style: [{
							fontSize: "8px"
						}]
					}
				});
				//.push(new Filter("FLAG", FilterOperator.EQ, "Y"));
			}
			if (txtoFlow === "Outflow") {
				odate = "0072018";
				oFlag = "Z";
				oVizFrame.setVizProperties({
					title: {
						visible: true,
						alignment: "left",
						text: oselM + " Outflow cash by Company Code",
						style: [{
							fontSize: "8px"
						}]
					}
				});
				//aFilters.push(new Filter("FLAG", FilterOperator.EQ, "Z"));
			}
			ofvalue = txtoFlow;
			this.getView().byId("idVizFrame").getDataset().bindData({
				path: "DN>/Z_CASHFLOW_COM_CONSUMPTION(mon='" + ofulldate + "',FLAG='" + oFlag + "')/Set",
			});
			/*  var oDataset1 = new sap.viz.ui5.data.FlattenedDataset(settingsModel1.dataset[0]);
			  oVizFrame.setDataset(oDataset1);*/
			//this.getView().byId("idVizFrame").getDataset().getBinding("data").filter(aFilters);
		},
		onPressPeriod: function (oEvent) {

			this.getView().byId("idVizFrame").setBusy(true);
			var txtoFlow = oEvent.getSource().getProperty("text");
			var odate = new Date();
			var omonth = odate.getMonth();
			var omonth1 = omonth + 1;

			var oselmon;
			var ofulldate;
			var oVizFrame = this.oVizFrame = this.getView().byId("idVizFrame");
			var ofg;
			var oFullD;
			if (ofvalue) {
				ofvalue = ofvalue;
			} else {
				ofvalue = "Net";
			}
			if (ofvalue === "Net") {
				ofg = "X";
			}
			if (ofvalue === "Inflow") {
				ofg = "Y";
			}
			if (ofvalue === "Outflow") {
				ofg = "Z";
			}

			if (txtoFlow === "Month End") {
				var d;
				if (omonth1 == 1) {
					omonth1 = "012";
				} else {
					omonth1 = omonth1;
				}
				if (omonth1 === "012") {
					oselmon = "012";
					ofulldate = odate.getFullYear() - 1;
				} else if (omonth1 < 9) {
					d = omonth1 - 1;
					oselmon = "00" + d;
					ofulldate = odate.getFullYear();
				} else {
					d = omonth1 - 1;
					oselmon = "0" + d;
					ofulldate = odate.getFullYear();
				}

				oFullD = oselmon + ofulldate;
				oVizFrame.setVizProperties({
					title: {
						visible: true,
						alignment: "left",
						text: "Month End " + ofvalue + " cash by Company Code",
						style: [{
							fontSize: "8px"
						}]
					}
				});
			}
			if (txtoFlow === "Current Month") {
				if (omonth1 < 9) {
					oselmon = "00" + omonth1;
				} else {
					oselmon = "0" + omonth1;
				}
				ofulldate = odate.getFullYear();
				oFullD = oselmon + ofulldate;
				oVizFrame.setVizProperties({
					title: {
						visible: true,
						alignment: "left",
						text: "Current Month " + ofvalue + " cash by Company Code",
						style: [{
							fontSize: "8px"
						}]
					}
				});
				//oselmon = "00" + odate.getMonth();
			}
			if (txtoFlow === "Next Month") {
				if (omonth1 === 12) {
					oselmon = "01";
					ofulldate = odate.getFullYear() + 1;

				} else {
					var da = omonth1 + 1;
					/*  oselmon = "00" + da;*/

					if (omonth1 < 9) {
						oselmon = "00" + da;
					} else {
						oselmon = "0" + da;
					}
					ofulldate = odate.getFullYear();
				}

				oFullD = oselmon + ofulldate;
				oVizFrame.setVizProperties({
					title: {
						visible: true,
						alignment: "left",
						text: "Next Month " + ofvalue + " cash by Company Code",
						style: [{
							fontSize: "8px"
						}]
					}
				});
			}

			oseldate = oFullD;
			oselM = txtoFlow;
			this.getView().byId("idVizFrame").getDataset().bindData({
				path: "DN>/Z_CASHFLOW_COM_CONSUMPTION(mon='" + oFullD + "',FLAG='" + ofg + "')/Set",
			});
		},
		onBankCountrygraph: function () {
			var aFilters = [];
			var aFilters1 = [];
			var oaFilters = [];
			var oaFilters1 = [];
			var allFilters = [];

			var mcbCompanyFilter = sap.ui.getCore().byId("mcbCompanyCode").getSelectedKeys();
			var mcbBankCountry = sap.ui.getCore().byId("mcbBankCountry").getSelectedKeys();
			if (mcbCompanyFilter.length > 0) {
				for (var k = 0; k < mcbCompanyFilter.length; k++) {

					aFilters.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));

				}
				oaFilters.push(new Filter({
					filters: aFilters,
					or: false
				}));
			}
			if (mcbBankCountry.length > 0) {
				for (var i = 0; i < mcbBankCountry.length; i++) {
					aFilters1.push(new Filter("Bankcountry", FilterOperator.EQ, mcbBankCountry[i]));

				}
				oaFilters.push(new Filter({
					filters: aFilters1,
					or: false
				}));
			}
			allFilters.push(new Filter({
				filters: oaFilters,
				and: true
			}));

			var vizFrame = this.getView().byId("idVizFrame3");

			vizFrame.getDataset().getBinding("data").filter(allFilters);
		},
		onHouseBankgraph: function () {

			var aFilters = [];
			var oaFilters = [];
			var allFilters = [];
			var oFilter1 = [];
			var oFilter2 = [];
			var oFilter3 = [];

			var mcbCompanyFilter = sap.ui.getCore().byId("mcbCompanyCode").getSelectedKeys();
			var mcbBankCountry = sap.ui.getCore().byId("mcbBankCountry").getSelectedKeys();
			var mcbHouseBank = sap.ui.getCore().byId("mcbHouseBank").getSelectedKeys();
			if (mcbCompanyFilter.length > 0) {
				for (var k = 0; k < mcbCompanyFilter.length; k++) {
					oFilter1.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));

				}
				oaFilters.push(new Filter({
					filters: oFilter1,
					or: false
				}));
			}
			if (mcbBankCountry.length > 0) {
				for (var i = 0; i < mcbBankCountry.length; i++) {
					oFilter2.push(new Filter("Bankcountry", FilterOperator.EQ, mcbBankCountry[i]));

				}
				oaFilters.push(new Filter({
					filters: oFilter2,
					or: false
				}));
			}
			if (mcbHouseBank.length > 0) {
				sap.ui.getCore().byId("mcbBankID").setEditable(true);
				for (var j = 0; j < mcbHouseBank.length; j++) {
					oFilter3.push(new Filter("Housebank", FilterOperator.EQ, mcbHouseBank[j]));

				}
				oaFilters.push(new Filter({
					filters: oFilter3,
					or: false
				}));

				allFilters.push(new Filter({
					filters: oaFilters,
					and: true
				}));

				var vizFrame = this.getView().byId("idVizFrame3");

				vizFrame.getDataset().getBinding("data").filter(allFilters);
			}

		},

		onBankID: function () {

			var aFilters = [];
			var oaFilters = [];
			var allFilters = [];
			var oFilter1 = [];
			var oFilter2 = [];
			var oFilter3 = [];
			var oFilter4 = [];

			var mcbCompanyFilter = sap.ui.getCore().byId("mcbCompanyCode").getSelectedKeys();
			var mcbBankCountry = sap.ui.getCore().byId("mcbBankCountry").getSelectedKeys();
			var mcbHouseBank = sap.ui.getCore().byId("mcbHouseBank").getSelectedKeys();
			var mcbBankID = sap.ui.getCore().byId("mcbBankID").getSelectedKeys();
			if (mcbCompanyFilter.length > 0) {
				for (var k = 0; k < mcbCompanyFilter.length; k++) {
					oFilter1.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));
				}
				oaFilters.push(new Filter({
					filters: oFilter1,
					or: false
				}));
			}
			if (mcbBankCountry.length > 0) {
				for (var i = 0; i < mcbBankCountry.length; i++) {
					oFilter2.push(new Filter("Bankcountry", FilterOperator.EQ, mcbBankCountry[i]));

				}
				oaFilters.push(new Filter({
					filters: oFilter2,
					or: false
				}));
			}
			if (mcbHouseBank.length > 0) {
				sap.ui.getCore().byId("mcbBankID").setEditable(true);
				for (var j = 0; j < mcbHouseBank.length; j++) {
					oFilter3.push(new Filter("Housebank", FilterOperator.EQ, mcbHouseBank[j]));

				}
				oaFilters.push(new Filter({
					filters: oFilter3,
					or: false
				}));

			}

			if (mcbBankID.length > 0) {

				for (var m = 0; m < mcbBankID.length; m++) {
					oFilter4.push(new Filter("Bankid", FilterOperator.EQ, mcbBankID[m]));

				}
				oaFilters.push(new Filter({
					filters: oFilter4,
					or: false
				}));
				allFilters.push(new Filter({
					filters: oaFilters,
					and: true
				}));

				var vizFrame = this.getView().byId("idVizFrame3");

				vizFrame.getDataset().getBinding("data").filter(allFilters);
				this.getView().byId("table16").getBinding("items").filter(allFilters);
			}

		},
		export1: function (oEvent) {
			var sUrl = "/sap/opu/odata/sap/ZC_CASHFLOW_PROJECT_SRV/CashFlowSet?$format=xlsx";
			var encodeUrl = encodeURI(sUrl);
			sap.m.URLHelper.redirect(encodeUrl, true);
		},
		selectionChangecom: function (oEvent) {
			var changedItem = oEvent.getParameter("changedItem");
			var isSelected = oEvent.getParameter("selected");
			var state = "Selected";

			if (!isSelected) {
				state = "Deselected"
			}
			//Check if "Selected All is selected
			if (changedItem.getProperty("key") == "All") {
				var oName, res;

				//If it is Selected
				if (state == "Selected") {

					var oItems = oEvent.getSource().getAggregation("items");
					var oName;
					for (var i = 0; i < oItems.length; i++) {
						if (i == 0) {
							oName = oItems[i].getProperty("key");
						} else {
							oName = oName + ',' + oItems[i].getProperty("key");
						} //If i == 0
					} //End of For Loop

					res = oName.split(",");
					oEvent.getSource().setSelectedKeys(res);

				}
			} else {
				res = null;
				oEvent.getSource().setSelectedKeys(res);
			}

		},
		onExport2: function (onExport) {

			var aFilters = [];
			var oaFilters = [];
			var mcbCompanyFilter = sap.ui.getCore().byId("mcbCompanyCode").getSelectedKeys();
			if (mcbCompanyFilter.length > 0) {
				for (var k = 0; k < mcbCompanyFilter.length; k++) {
					aFilters.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));
				}
				oaFilters.push(new Filter({
					filters: aFilters,
					or: false
				}));
			}
			var vizFrame = this.getView().byId("idVizFrame2");
			var osrvdata = vizFrame.getDataset().getBinding("data").filter(aFilters, true);
			var oModel1 = vizFrame.getModel();
			var oModelInterface1 = oModel1.getInterface();
			var aCols, aTitle, aProducts, oSettings;
			aCols = this.createColumnConfig();
			aTitle = this.createTitle();
			var oModel = sap.ui.getCore().getModel("CASHFLOW_HIST").getData();
			oSettings = {
				workbook: {
					columns: aCols,
					context: {}
				},
				//dataSource: oModel["results"],
				dataSource: {
					type: "oData",
					dataUrl: "ZC_CASHFLOW_PROJECT_SRV/CashFlowSet/?$filter=Companycode eq '1' or Companycode eq '2'",
					serviceUrl: osrvdata.sPath,
					//  headers: oModelInterface1.getHeaders ? oModelInterface1.getHeaders() : null,
					sizeLimit: 100

				},
				fileName: "CashFlowForecasterReport(Cash Data).xlsx"
			};
			new Spreadsheet(oSettings)
				.build()
				.then(function () {
					MessageToast.show("CashFlow Forecaster export has finished");
				});
		},
		currencyformatterTxt: function (value) {
			var fixedInteger = sap.ui.core.format.NumberFormat.getIntegerInstance({
				style: "short",
				maxFractionDigits: 3
			});
			return fixedInteger.format(value);
		},
		onBusyIndicatorStart: function () {
			this.getView().byId("idVizFrame2").setBusy(true);
			this.getView().byId("idVizFrame3").setBusy(true);
			this.getView().byId("idVizFrame").setBusy(true);
			this.getView().byId("table16").setBusy(true);
			this.getView().byId("table15").setBusy(true);
			this.getView().byId("id1").setBusy(true);
			this.getView().byId("id2").setBusy(true);
			this.getView().byId("id3").setBusy(true);
			this.getView().byId("id4").setBusy(true);
			this.getView().byId("id5").setBusy(true);
			this.getView().byId("id6").setBusy(true);
		},
		onBusyIndicatorEnd: function () {
			this.getView().byId("idVizFrame2").setBusy(false);
			this.getView().byId("idVizFrame3").setBusy(false);
			this.getView().byId("idVizFrame").setBusy(false);
			this.getView().byId("table16").setBusy(false);
			this.getView().byId("table15").setBusy(false);
			this.getView().byId("id1").setBusy(false);
			this.getView().byId("id2").setBusy(false);
			this.getView().byId("id3").setBusy(false);
			this.getView().byId("id4").setBusy(false);
			this.getView().byId("id5").setBusy(false);
			this.getView().byId("id6").setBusy(false);
		},
		onDonutRenderComplete: function () {
			this.getView().byId("idVizFrame").setBusy(false);
		},
		onCompanycodeBusy: function () {
			this.getView().byId("idVizFrame2").setBusy(true);
			this.getView().byId("id1").setBusy(true);
			this.getView().byId("id2").setBusy(true);
			this.getView().byId("id3").setBusy(true);
			this.getView().byId("table15").setBusy(true);
		},
		onCompanyCodeChange: function () {
			this.onCompanycodeBusy();
			this.onBankFiltersBusy();
		},
		onBankFiltersBusy: function () {
			this.getView().byId("idVizFrame3").setBusy(true);
			this.getView().byId("id4").setBusy(true);
			this.getView().byId("id5").setBusy(true);
			this.getView().byId("id6").setBusy(true);
			this.getView().byId("table16").setBusy(true);
		},
		onExportCash: function () {
			var aCols, oRowBinding, oSettings, oTable;
			if (!this._oTable) {
				this._oTable = this.byId("table15");
			}
			var oFilter = [];
			oTable = this._oTable;
			var mcbCompanyFilterid = sap.ui.getCore().byId("mcbCompanyCode");
			if (mcbCompanyFilterid) {
				var mcbCompanyFilter = mcbCompanyFilterid.getSelectedKeys();
				if (mcbCompanyFilter.length > 0) {
					for (var k = 0; k < mcbCompanyFilter.length; k++) {
						oFilter.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));
					}
					oRowBinding = oTable.getBinding("items").filter(new Filter({
						filters: oFilter,
						and: false
					}));

				} else {
					oRowBinding = oTable.getBinding("items");
				}

			} else {
				oRowBinding = oTable.getBinding("items");
			}

			aCols = this.createColumnConfig();

			var oModel = oRowBinding.getModel();
			var oModelInterface = oModel.getInterface();

			oSettings = {
				workbook: {
					columns: aCols,
					hierarchyLevel: 'Level'
				},
				dataSource: {
					type: "oData",
					dataUrl: oRowBinding.getDownloadUrl ? oRowBinding.getDownloadUrl() : null,
					serviceUrl: oModelInterface.sServiceUrl,
					headers: oModelInterface.getHeaders ? oModelInterface.getHeaders() : null,
					count: 12,
					/*useBatch: oModelInterface.bUseBatch,*/
					sizeLimit: 100
				},
				fileName: "CashFlowForecasterReport(Cash Data).xlsx",
				worker: false // We need to disable worker because we are using a MockServer as OData Service
			};

			new Spreadsheet(oSettings).build();
		},
		onExportBankGraph: function (oEvent) {
			var aCols, oRowBinding, oSettings, oTable;

			if (!this._oTable) {
				this._oTable = this.byId("table16");
			}
			var oFilter = [];
			oTable = this._oTable;
			var mcbCompanyFilterid = sap.ui.getCore().byId("mcbCompanyCode");
			if (mcbCompanyFilterid) {
				var oaFilters = [];
				var oFilter1 = [];
				var oFilter2 = [];
				var oFilter3 = [];
				var oFilter4 = [];

				var mcbCompanyFilter = sap.ui.getCore().byId("mcbCompanyCode").getSelectedKeys();
				var mcbBankCountry = sap.ui.getCore().byId("mcbBankCountry").getSelectedKeys();
				var mcbHouseBank = sap.ui.getCore().byId("mcbHouseBank").getSelectedKeys();
				var mcbBankID = sap.ui.getCore().byId("mcbBankID").getSelectedKeys();
				if (mcbCompanyFilter.length > 0) {
					for (var k = 0; k < mcbCompanyFilter.length; k++) {
						oFilter1.push(new Filter("Companycode", FilterOperator.EQ, mcbCompanyFilter[k]));
					}
					oaFilters.push(new Filter({
						filters: oFilter1,
						or: false
					}));

					if (mcbBankCountry.length > 0) {
						for (var i = 0; i < mcbBankCountry.length; i++) {
							oFilter2.push(new Filter("Bankcountry", FilterOperator.EQ, mcbBankCountry[i]));

						}
						oaFilters.push(new Filter({
							filters: oFilter2,
							or: false
						}));
					}
					if (mcbHouseBank.length > 0) {
						sap.ui.getCore().byId("mcbBankID").setEditable(true);
						for (var j = 0; j < mcbHouseBank.length; j++) {
							oFilter3.push(new Filter("Housebank", FilterOperator.EQ, mcbHouseBank[j]));

						}
						oaFilters.push(new Filter({
							filters: oFilter3,
							or: false
						}));

					}

					if (mcbBankID.length > 0) {

						for (var m = 0; m < mcbBankID.length; m++) {
							oFilter4.push(new Filter("Bankid", FilterOperator.EQ, mcbBankID[m]));

						}
						oaFilters.push(new Filter({
							filters: oFilter4,
							or: false
						}));

					}
					oRowBinding = oTable.getBinding("items").filter(new Filter({
						filters: oaFilters,
						and: true
					}));
				} else {
					oRowBinding = oTable.getBinding("items");
				}

			} else {
				oRowBinding = oTable.getBinding("items");
			}

			aCols = this.createColumnConfigBank();
			var aTitle = this.createTitleBank();
			var oModel = oRowBinding.getModel();
			var oModelInterface = oModel.getInterface();

			oSettings = {
				workbook: {
					columns: aCols,
					hierarchyLevel: 'Level'
				},
				dataSource: {
					type: "oData",
					dataUrl: oRowBinding.getDownloadUrl ? oRowBinding.getDownloadUrl() : null,
					serviceUrl: oModelInterface.sServiceUrl,
					headers: oModelInterface.getHeaders ? oModelInterface.getHeaders() : null,
					count: 12,
					/*useBatch: oModelInterface.bUseBatch,*/
					sizeLimit: 100
				},
				fileName: "CashFlowForecasterReport(Bank Data).xlsx",
				worker: false // We need to disable worker because we are using a MockServer as OData Service
			};

			new Spreadsheet(oSettings).build();
		},
		onMsgLoadCash: function () {

			var Fm = sap.ui.getCore().getModel("CASHFLOW_HIST").getData().results[0].MonthYear;
			var cm = sap.ui.getCore().getModel("CASHFLOW_HIST").getData().results[7].MonthYear;
			var Ns = sap.ui.getCore().getModel("CASHFLOW_HIST").getData().results[9].MonthYear;
			var NLM = sap.ui.getCore().getModel("CASHFLOW_HIST").getData().results[11].MonthYear;
			var msgtxt = "Note: Data from " + Fm + " to " + cm + " are historical. " + Ns + " to " + NLM +
				" are prediction.Current month has historic and prediction";
			this.getView().byId("msgid1").setText(msgtxt);

		},
		onMsgLoadBank: function () {

			var Fm = sap.ui.getCore().getModel("CASHFLOW_HIST").getData().results[0].MonthYear;
			var cm = sap.ui.getCore().getModel("CASHFLOW_HIST").getData().results[7].MonthYear;
			var Ns = sap.ui.getCore().getModel("CASHFLOW_HIST").getData().results[9].MonthYear;
			var NLM = sap.ui.getCore().getModel("CASHFLOW_HIST").getData().results[11].MonthYear;
			var msgtxt = "Note: Data from " + Fm + " to " + cm + " are historical. " + Ns + " to " + NLM +
				" are prediction.Current month has historic and prediction";
			this.getView().byId("msgid2").setText(msgtxt);

		},

		onDataExport: sap.m.Table.prototype.exportData || function (oEvent) {
			var CASHFLOW_HISTCash = new sap.ui.model.json.JSONModel();
			var that = this;
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				that.getOwnerComponent().getModel().read("/CashFlowSet", {
					async: true,
					success: function (data) {

						CASHFLOW_HISTCash.setData(data);
						sap.ui.getCore().setModel(CASHFLOW_HISTCash, "CASHFLOW_HISTCash");
						//.onMsgLoadCash();
					},
					error: function () {

					}
				});

			});

			var oExport = new Export({

				// Type that will be used to generate the content. Own ExportType's can be created to support other formats
				exportType: new ExportTypeCSV({
					separatorChar: ","
				}),

				// Pass in the model created above
				models: this.getView().getModel(),

				// binding information for the rows aggregation
				rows: {
					path: "/ProductCollection"
				},

				// column definitions with column name and binding info for the content

				columns: [{
					name: "Dimensions",
					template: {
						content: {
							parts: ["Width", "Depth", "Height", "DimUnit"],
							formatter: function (width, depth, height, dimUnit) {
								return width + " x " + depth + " x " + height + " " + dimUnit;
							},
							state: "Warning"
						}
						// "{Width} x {Depth} x {Height} {DimUnit}"
					}
				}]
			});

			// download exported file
			oExport.saveFile().catch(function (oError) {
				MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
			}).then(function () {
				oExport.destroy();
			});
		},
		onAfterRendering: function () {
			if (sap.ushell) {
				//get Variants from personalization set and set the model of variants list to variant managment control
				this.loadVariants();

			}
		},
		loadVariants: function () {
			debugger;
			var that = this;
			VariantsManagement.onPersonalizationOperations("readVariants", "", [], {}, function (aVariants, defVariantKey,
				defFilter, defSorter) {
				debugger;
				var oVariantMgmtControl = that.getView().byId("variantManagement"),
					// create a new model
					oVariantModel = new sap.ui.model.json.JSONModel();
				oVariantModel.setDefaultBindingMode("OneWay");
				oVariantModel.oData.Variants = aVariants;
				if (defVariantKey) {
					oVariantModel.oData.defVariantKey = defVariantKey;
					var aFilters = JSON.parse(defFilter);
					if (oExportFlag) {
						oExportFlag = oExportFlag;
					} else {
						oExportFlag = "cash";
					}
					if (oExportFlag === "bank") {
						if (that.getView().byId("table16").getBinding("items") !== undefined) {
							that.getView().byId("table16").getBinding("items").filter(aFilters);
							if (defSorter) {
								var aSorters = JSON.parse(defSorter),
									aSorters1;
								//aSorters1 = this.buildSorters(aSorters);
								//that.getView().byId("table15").getBinding("items").sort(aSorters1);

							}
						}
					} else {
						if (that.getView().byId("table15").getBinding("items") !== undefined) {
							if (aFilters[0].aFilters) {
								that.getView().byId("table15").getBinding("items").filter(aFilters[0].aFilters);
							} else {
								that.getView().byId("table15").getBinding("items").filter(aFilters);
							}

							if (defSorter) {
								var aSorters = JSON.parse(defSorter),
									aSorters1;
								//aSorters1 = this.buildSorters(aSorters);
								//that.getView().byId("table15").getBinding("items").sort(aSorters1);

							}
						}
					}

				} else {
					oVariantModel.oData.defVariantKey = "*standard*";
				}

				oVariantMgmtControl.setModel(oVariantModel, "variantModel");
				that.saveVariantItems(oVariantMgmtControl);
				oVariantMgmtControl.setInitialSelectionKey(oVariantModel.oData.defVariantKey);

			}.bind(that));
		},
		saveVariantItems: function (oObject) {
			var aItems = oObject.getVariantItems(),
				aVariants = [];

			for (var i = 0; i < aItems.length; i++) {
				aVariants.push({
					"key": aItems[i].getKey(),
					"name": aItems[i].getText()
				});
			}
			this.Variants = JSON.parse(JSON.stringify(aVariants));
		},
		getNamebyKey: function (sKey) {
			var aItems = this.Variants;
			for (var i = 0; i < aItems.length; i++) {
				if (aItems[i].key === sKey) {
					break;
				}
			}
			return aItems[i].name;
		},
		getKeyByName: function (sName) {
			var aItems = this.Variants;
			for (var i = 0; i < aItems.length; i++) {
				if (aItems[i].name === sName) {
					break;
				}
			}
			return aItems[i].key;
		},
		buildSorters: function (aSorters) {
			var aSorters1 = [],
				that = this;
			aSorters.map(function (currentValue, index) {
				if (currentValue.group === true) {
					var vGroup = that.mGroupFunctions[currentValue.sPath];
					aSorters1.push(new sap.ui.model.Sorter(currentValue.sPath, currentValue.bDescending, vGroup));
				} else {
					aSorters1.push(new sap.ui.model.Sorter(currentValue.sPath, currentValue.bDescending));
				}
			});
			return aSorters1;
		},

		onSelectVariant: function (oEvent) {
			debugger;
			if (oExportFlag) {
				oExportFlag = oExportFlag;
			} else {
				oExportFlag = "cash";
			}
			VariantsManagement.onSelectVariant(oEvent, this, oExportFlag);
		},

		onSaveAsVariant: function (oEvent) {
			debugger;
			var oTableBinding;
			var oSelectedFilterData;
			if (oExportFlag) {
				oExportFlag = oExportFlag;
			} else {
				oExportFlag = "cash";
			}
			if (oExportFlag === "cash") {
				oTableBinding = this.byId("table15").getBinding("items");
				oSelectedFilterData = oTableBinding.aFilters;
			} else {
				oTableBinding = this.byId("table16").getBinding("items");
				oSelectedFilterData = oTableBinding.aFilters;
			}

			var oSortData = oTableBinding.aSorters;
			for (var i = 0; i < oSortData.length; i++) {
				if (oSortData[i].vGroup != null) {
					oSortData[i].group = true;
				}
			}
			var aArgs = [oEvent.mParameters.name, oEvent.mParameters.def, oSelectedFilterData, oSortData],
				sName = oEvent.mParameters.name,
				bDef = oEvent.mParameters.def,
				that = this;
			VariantsManagement.onPersonalizationOperations("saveVariant", "", aArgs, this, function (bSuccess, bSave) {
				if (bSuccess && !bSave) {
					var oVarManagement = this.getView().byId("variantManagement");

					oVarManagement.destroyAggregation("variantItems");

					this.refreshVariants();
					that.saveVariantItems(oVarManagement);

					this.onSelectVariant(new sap.ui.base.Event('', '', {
						key: this.getKeyByName(sName)
					}));
					oVarManagement.setInitialSelectionKey(this.getKeyByName(sName));
					sap.m.MessageToast.show("Variant is created with name " + sName);

					// If new variant is set to default, change the model property 
					if (bDef && oVarManagement.getVariantItems().length) {
						oVarManagement.getModel("variantModel").setProperty("/defVariantKey", this.getKeyByName(sName));
					}

				} else if (bSave) {
					sap.m.MessageToast.show("Variant is saved with new filters");
				} else {
					sap.m.MessageToast.show("Variant creation failed");
				}

			}.bind(this));

		},
		refreshVariants: function () {

			debugger;
			var that = this;
			VariantsManagement.onPersonalizationOperations("readVariants", "", [], {}, function (aVariants, defVariantKey) {
				debugger;
				var oVariantMgmtControl = that.getView().byId("variantManagement"),
					// create a new model
					oVariantModel = oVariantMgmtControl.getModel("variantModel");
				oVariantModel.setDefaultBindingMode("OneWay");
				oVariantModel.oData.Variants = aVariants;
				if (defVariantKey) {
					oVariantModel.oData.defVariantKey = defVariantKey;

				} else {
					oVariantModel.oData.defVariantKey = "*standard*";
				}
				oVariantModel.refresh();
				that.saveVariantItems(oVariantMgmtControl);

			}.bind(that));

		},
		getVariantItembyName: function (sName) {
			var oVarManagement = this.getView().byId("variantManagement");
			var sVariant = oVarManagement.getVariantItems();
			for (var i = 0; i < sVariant.length; i++) {
				if (sVariant[i].getText() === sName) {
					break;
				}
			}
			return sVariant[i];
		},

		onManageVariant: function (oEvent) {
			debugger;
			var aDeletedVariants = oEvent.mParameters.deleted,
				aRenamedVariants = oEvent.mParameters.renamed,
				sNewDefaultVariantKey = oEvent.mParameters.def,
				oVariantMgmtControl = this.getView().byId("variantManagement"),
				that = this,
				sDelMsg = '',
				sRenMsg = this.getView().getModel("i18n").getResourceBundle().getText("renameMessage") + " ",
				sDefVarKey = oVariantMgmtControl.getModel("variantModel").getProperty("/defVariantKey");
			if (sDefVarKey !== sNewDefaultVariantKey) {
				VariantsManagement.onPersonalizationOperations("changeDefVarKey", sNewDefaultVariantKey, [], this, function (
					bChanged) {
					if (bChanged) {
						oVariantMgmtControl.getModel("variantModel").setProperty("/defVariantKey", sNewDefaultVariantKey);
						if ((aRenamedVariants.length === 0) && (aDeletedVariants.length === 0)) {
							sap.m.MessageToast.show("Default Variant is changed");
						}

					}
				});

			}
			if (aDeletedVariants.length > 0) {

				VariantsManagement.onPersonalizationOperations("delVariants", "", aDeletedVariants, this, function (bDeleted) {
					if (bDeleted) {
						sDelMsg = that.getView().getModel("i18n").getResourceBundle().getText("deleteMessage") + " ";
						for (var i = 0; i < aDeletedVariants.length; i++) {
							if (i === aDeletedVariants.length - 1) {
								sDelMsg = sDelMsg + that.getNamebyKey(aDeletedVariants[i]);
							} else {
								sDelMsg = sDelMsg + that.getNamebyKey(aDeletedVariants[i]) + ",";
							}
						}

						if (aRenamedVariants.length === 0) {
							that.saveVariantItems(oVariantMgmtControl);
							sap.m.MessageToast.show(sDelMsg);
						}

					}
				});

			}
			if (aRenamedVariants.length > 0) {
				VariantsManagement.onPersonalizationOperations("renameVariants", "", aRenamedVariants, this, function (bRenamed) {
					if (bRenamed) {
						for (var i = 0; i < aRenamedVariants.length; i++) {
							if (i === aRenamedVariants.length - 1) {
								sRenMsg = sRenMsg + that.getView().getModel("i18n").getResourceBundle().getText("renamedVariant", [that.getNamebyKey(
										aRenamedVariants[i].key),
									aRenamedVariants[i].name
								]);

							} else {
								sRenMsg = sRenMsg + that.getView().getModel("i18n").getResourceBundle().getText("renamedVariant", [that.getNamebyKey(
										aRenamedVariants[i].key),
									aRenamedVariants[i].name
								]) + ",";
							}
						}
						if (sDelMsg !== "") {
							sRenMsg = sDelMsg + "\n" + sRenMsg;
						}
						sap.m.MessageToast.show(sRenMsg);
						that.saveVariantItems(oVariantMgmtControl);
					}
				});
			}

		},

	});
});