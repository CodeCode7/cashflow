jQuery.sap.declare("com.accenture.CashFlow.Utils.Formatter");

jQuery.sap.require("sap.ui.core.Element");

com.accenture.CashFlow.Utils.Formatter = {
	currencyFormatter: function (oCurrValue) {
		var sBrowserLocale = "de-DE"; //sap.ui.getCore().getConfiguration().getLanguage();
		var oLocale = new sap.ui.core.Locale(sBrowserLocale);
		var oLocaleData = new sap.ui.core.LocaleData(oLocale);
		var oCurrency = new sap.ui.model.type.Currency(oLocaleData.mData.currencyFormat);
		return oCurrency.formatValue([oCurrValue, "€"], "string");

	},

	getIconFlag: function (value, Icon) {
		/*	if ((value[0] == "0") & (value.length ==1)) {
				Icon.setSrc("sap-icon://arrow-right");
				Icon.setColor("Critical");
			} else if (value[0] == "-") {
				Icon.setSrc("sap-icon://arrow-bottom");
				Icon.setColor("red");
			} else {
				Icon.setSrc("sap-icon://arrow-top");
				Icon.setColor("green");
			}*/
		if ((value[value.length - 1] == "-") || (value[0] == "-")) {
			Icon.setSrc("sap-icon://arrow-bottom");
			Icon.setColor("red");

		} else {
			if ((value[0] == "0") & (value.length == 1)) {
				Icon.setSrc("sap-icon://arrow-right");
				Icon.setColor("Critical");
			} else {
				Icon.setSrc("sap-icon://arrow-top");
				Icon.setColor("green");
			}
		}
	},
	getIconFlagBank: function (value, Icon) {
		if ((value[value.length - 1] == "-") || (value[0] == "-")) {
			Icon.setSrc("sap-icon://arrow-bottom");
			Icon.setColor("red");

		} else {
			if ((value[0] == "0") & (value.length == 1)) {
				Icon.setSrc("sap-icon://arrow-right");
				Icon.setColor("Critical");
			} else {
				Icon.setSrc("sap-icon://arrow-top");
				Icon.setColor("green");
			}
		}
	},
	numFormat: function (value) {
		var fixedInteger = sap.ui.core.format.NumberFormat.getIntegerInstance({
			style: "short",
			maxFractionDigits: 4
		});
		return fixedInteger.format(value);
	}

};