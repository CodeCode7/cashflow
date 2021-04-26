sap.ui.define([], function () {
	'use strict';

	return {

		onSelectVariant: function (oEvent, oController, oExportFlag) {
			debugger;
			var sSelectedVariantKey = oEvent.mParameters.key;
			if (sSelectedVariantKey !== "*standard*") {

				this.onPersonalizationOperations("getFilter", sSelectedVariantKey, [], oController, function (oFilterString,
					oSorterString) {
					var aFilters = JSON.parse(oFilterString);
					var binding;
					if (oExportFlag === "bank") {
						binding = oController.getView().byId("table16").getBinding("items").filter([]);
						binding.filter(aFilters);
					} else {
						if (aFilters[0].aFilters) {
							binding = oController.getView().byId("table15").getBinding("items").filter([]);
							binding.filter(aFilters[0].aFilters);
						} else {
							binding = oController.getView().byId("table15").getBinding("items").filter([]);
							binding.filter(aFilters);
						}
					}

					if (oSorterString) {
						var aSorters = JSON.parse(oSorterString),
							aSorters1;
						aSorters1 = oController.buildSorters(aSorters);
						binding.sort(aSorters1);
					} else {
						aSorters.push(new sap.ui.model.Sorter("TimezoneMd", false));
						binding.sort(aSorters);
					}

				}.bind(this));
			} else if (sSelectedVariantKey === "*standard*") {
				if (oExportFlag === "bank") {
					oController.getView().byId("table16").getBinding("items").filter([]);
				} else {
					oController.getView().byId("table15").getBinding("items").filter([]);
				}

				//oController.getView().byId("table15").getBinding("items").sort([new sap.ui.model.Sorter("TimezoneMd", false)]);

			}
		},

		onPersonalizationOperations: function (sOperation, sVariantKey, aArgs, oController, fnCallBack) {

			var oPersonalizationVariantSet = {},
				aExistingVariants = [],
				aVariantKeysAndNames = [],
				defVariantKey,
				defFilter,
				defSorter,
				iCount;
			//get the personalization service of shell
			this._oPersonalizationService = sap.ushell.Container.getService('Personalization');
			this._oPersonalizationContainer = this._oPersonalizationService.getPersonalizationContainer("BIStatusVariantContainer");

			this._oPersonalizationContainer.fail(function () {
				// call back function in case of fail
				sap.m.MessageToast.show("Unable to load variants");
				oController.getView().byId("variantManagement").setVisible(false);
			});
			this._oPersonalizationContainer.done(function (oPersonalizationContainer) {
				switch (sOperation) {

				case "readVariants":
					debugger;
					// check if the current variant set exists, If not, add the new variant set to the container
					if (!(oPersonalizationContainer.containsVariantSet('BIStatVariants'))) {
						oPersonalizationContainer.addVariantSet('BIStatVariants');
					}
					// get the variant set
					oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet('BIStatVariants');

					defVariantKey = oPersonalizationVariantSet.getCurrentVariantKey();

					if (defVariantKey) {
						defFilter = oPersonalizationVariantSet.getVariant(defVariantKey).getItemValue("Filter");
						defSorter = oPersonalizationVariantSet.getVariant(defVariantKey).getItemValue("Sorter");
					}
					aVariantKeysAndNames = oPersonalizationVariantSet.getVariantNamesAndKeys();
					for (var key in aVariantKeysAndNames) {
						if (aVariantKeysAndNames.hasOwnProperty(key)) {
							var oVariantItemObject = {};
							oVariantItemObject.VariantKey = aVariantKeysAndNames[key];
							oVariantItemObject.VariantName = key;
							aExistingVariants.push(oVariantItemObject);
						}
					}
					oPersonalizationContainer.save().fail(function () {
						//call callback fn with false

					}).done(function () {
						//call call back with true

					}.bind(this));
					fnCallBack(aExistingVariants, defVariantKey, defFilter, defSorter);
					break;
				case "getFilter":
					debugger;
					// get the variant set
					var oVariantSet = oPersonalizationContainer.getVariantSet("BIStatVariants"),
						oMatchedVariant;
					// get the variant
					oMatchedVariant = oVariantSet.getVariant(sVariantKey);
					//Send Filter and group items details
					fnCallBack(oMatchedVariant.getItemValue("Filter"),
						oMatchedVariant.getItemValue("Sorter"));
					break;
				case "saveVariant":
					debugger;
					var oVariant, bSave = false;
					// get the variant set
					oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet('BIStatVariants');
					//get if the variant exists or add new variant
					sVariantKey = oPersonalizationVariantSet.getVariantKeyByName(aArgs[0]);
					if (sVariantKey) {
						oVariant = oPersonalizationVariantSet.getVariant(sVariantKey);
						bSave = true;
					} else {
						oVariant = oPersonalizationVariantSet.addVariant(aArgs[0]);
					}
					if (aArgs[1] && sVariantKey) {
						oPersonalizationVariantSet.setCurrentVariantKey(sVariantKey);

					} else if (aArgs[1] && aArgs[0]) {
						sVariantKey = oPersonalizationVariantSet.getVariantKeyByName(aArgs[0]);
						oPersonalizationVariantSet.setCurrentVariantKey(sVariantKey);

					}
					// Set Filters and groupitem 
					oVariant.setItemValue("Filter", JSON.stringify(aArgs[2]));
					oVariant.setItemValue("Sorter", JSON.stringify(aArgs[3]));

					oPersonalizationContainer.save().fail(function () {
						//call callback fn with false
						fnCallBack(false);
					}).done(function () {
						//call call back with true
						fnCallBack(true, bSave);
					}.bind(this));
					break;

				case "delVariants":
					debugger;
					oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet('BIStatVariants');
					for (iCount = 0; iCount < aArgs.length; iCount++) {
						if (aArgs[iCount]) {
							oVariant = oPersonalizationVariantSet.getVariant(aArgs[iCount]);
							oPersonalizationVariantSet.delVariant(aArgs[iCount]);
						}
					}
					oPersonalizationContainer.save().fail(function () {

						fnCallBack(false);
					}).done(function () {
						fnCallBack(true);
					}.bind(this));
					break;
				case "renameVariants":
					debugger;
					oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet("BIStatVariants");
					var sKey;
					for (iCount = 0; iCount < aArgs.length; iCount++) {
						oVariant = oPersonalizationVariantSet.getVariant(aArgs[iCount].key);

						delete oPersonalizationVariantSet._oVariantNameMap.entries[oVariant._oVariantName];

						oPersonalizationVariantSet._oVariantNameMap.entries[aArgs[iCount].name] = aArgs[iCount].key;

						oVariant._oVariantName = aArgs[iCount].name;

					}
					oPersonalizationContainer.save().fail(function () {
						fnCallBack(false);
					}).done(function () {
						fnCallBack(true);
					}.bind(this));
					break;
				case "changeDefVarKey":
					debugger;
					oPersonalizationVariantSet = oPersonalizationContainer.getVariantSet("BIStatVariants");
					if (sVariantKey !== "*standard*") {
						oVariant = oPersonalizationVariantSet.getVariant(sVariantKey);
						if (oVariant == null) {
							sVariantKey = oPersonalizationVariantSet.getVariantKeyByName(oController.getNamebyKey(sVariantKey));
						}
						oPersonalizationVariantSet.setCurrentVariantKey(sVariantKey);
					} else {
						oPersonalizationVariantSet.setCurrentVariantKey('');
					}

					oPersonalizationContainer.save().fail(function () {
						//handle failure case
						fnCallBack(false);
					}).done(function () {
						//handle failure case
						fnCallBack(true);
					}.bind(this));
					break;
				}

			}.bind(this));
		}

	};
}());