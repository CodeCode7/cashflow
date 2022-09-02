sap.ui.define([
	"sap/ui/core/mvc/Controller",
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/format/NumberFormat'
], function (Controller, JSONModel,NumberFormat) {
	"use strict";

	return Controller.extend("mysam.mysam.controller.View1", {
		onInit: function () {
			var aData = [{
				expense: "Flight",
				transactionAmount: {
					size: 560.67,
					currency: "EUR"
				},
				exchangeRate: 1.00000,
				amount: 5610.67
			}, {
				expense: "Meals",
				transactionAmount: {
					size: 180.50,
					currency: "USD"
				},
				exchangeRate: 0.85654,
				amount: 154.72
			}, {
				expense: "Hotel",
				transactionAmount: {
					size: 675.00,
					currency: "USD"
				},
				exchangeRate: 0.85654,
				amount: 578.57
			}, {
				expense: "Taxi",
				transactionAmount: {
					size: 15,
					currency: "USD"
				},
				exchangeRate: 0.85654,
				amount: 12.86
			}, {
				expense: "Daily allowance",
				transactionAmount: {
					size: 80.00,
					currency: "BGN"
				},
				exchangeRate: 0.51129,
				amount: 40.90
			}];

			var oModel = new JSONModel({
				modelData: aData
			});
			this.getView().setModel(oModel);
		},

		handleChange: function (e) {
			alert(e);
		},

		handleChange2: function (e) {
				var oFloatFormat = NumberFormat.getFloatInstance();
			if (costSavingsFlag === true) {
					TotBudget = oFloatFormat.parse(_self.getView().byId("totalBudgetAvailableId1").getValue());
				} else {
			

				EstdPoValue = _self.getView().byId("estimatePoValueId1").getValue();
			EstdPoCur = _self.getView().byId("EstCurrencyid").getValue(); //DeePTHI FETR0013312

			TqCur = _self.getView().byId("Currencyid").getValue(); //Deepthi FETR0013312

			BudBal = _self.getView().byId("balanceId1").getValue(); //Deepthi FETR0013312
			var oFloatFormat = NumberFormat.getFloatInstance();
			EstdPoCur = oFloatFormat.parse(_self.getView().byId("EstCurrencyid").getValue());
			BudBal = oFloatFormat.parse(_self.getView().byId("balanceId1").getValue());
			alert(e);

		
		}
		}

	});
});