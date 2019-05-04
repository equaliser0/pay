import { BaseCurrency, config } from "@cryptology.hk/pay-config";
import BigNumber from "bignumber.js";
import { CurrencyUtils } from "./utils";

const acceptedCurrencies: string[] = config.getCurrencies();
const baseCurrency: BaseCurrency = config.getBaseCurrency();

/**
 * Parsed amount/currency pair and it's value in Arktoshi
 */
export interface AmountCurrency {
    arkToshiValue?: BigNumber;
    amount: BigNumber;
    currency: string;
}

export class Currency {
    /**
     * Return the value of <amount> <currency> in the units of the base currency (e.g. Arktoshi)
     * e.g. input 10 USD => 20000000000 Arktoshi
     * @param amount
     * @param currency
     */
    public static async getExchangedValue(amount: BigNumber, currency: string): Promise<BigNumber> {
        // Check if the input is correct
        currency = currency.toUpperCase().trim();
        if (!Currency.isValidCurrency(currency)) {
            throw new Error(`${currency} is not supported.`);
        }

        if (amount.isNaN() || amount.lte(0)) {
            throw new Error("Please enter a valid amount.");
        }

        // Get exchange rate for the requested currency in the base currency.
        const exchangeRate: BigNumber = await CurrencyUtils.getCurrencyTicker(currency, baseCurrency.ticker);

        if (exchangeRate.isNaN()) {
            throw new Error("Could not convert the currency/amount");
        }

        return amount.div(exchangeRate).times(baseCurrency.units);
    }

    /**
     * Get the US$ value of a value in units of the base currency (e.g. Arktoshi)
     * e.g. 2000000000 Arktoshi => US$10
     * @param units
     */
    public static async baseCurrencyUnitsToUSD(units: BigNumber): Promise<BigNumber> {
        // Check if input is correct
        if (units.isNaN() || units.lte(0)) {
            throw new Error("Please enter a valid amount.");
        }

        const exchangeRate: BigNumber = await CurrencyUtils.getCurrencyTicker("USD", baseCurrency.ticker);

        if (exchangeRate.isNaN()) {
            throw new Error("Could not convert the currency/amount");
        }

        return exchangeRate.times(units.div(baseCurrency.units));
    }

    /**
     * Check if a string is a valid currency
     * @param currency
     */
    public static isValidCurrency(currency: string): boolean {
        currency = currency.toUpperCase();
        return acceptedCurrencies.indexOf(currency) !== -1;
    }

    /**
     * Check if input is a valid currency or amount + valid currency
     * Valid input formats: 10 | 1.0 | 1,0 | USD10 | USD1.0 | USD1,1 | 10USD | 1.0USD | 1,1USD
     * @param data
     */
    public static isValidCurrencyInput(data: string): boolean {
        try {
            data = Currency.convertAmountCurrency(data);

            // Check if we only have a valid currency or valid positive amount
            if (acceptedCurrencies.indexOf(data) !== -1 || Currency.isNumericalInput(data)) {
                return true;
            }

            // Check if we have a combination of a valid currency and an amount
            for (const i in acceptedCurrencies) {
                if (typeof acceptedCurrencies[i] !== "undefined") {
                    const currency = acceptedCurrencies[i];
                    if (data.startsWith(currency) || data.endsWith(currency)) {
                        data = data.replace(currency, "").trim();
                        return Currency.isNumericalInput(data);
                    }
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * Replace , (comma) by . (dot) and uppercase text so it can be parsed correctly
     * @param data
     */
    public static convertAmountCurrency(data: string): string {
        if (typeof data === "undefined") {
            throw TypeError("Amount/User is undefined");
        }
        return data.replace(/[,]/g, ".").toUpperCase();
    }

    /**
     * Check if data is a valid numerical: positive number, greater than 0 and smaller than Max Safe Integer
     * @param data
     */
    public static isNumericalInput(data: string): boolean {
        if (typeof data === "undefined") {
            throw TypeError("Input is undefined");
        }

        data = data.replace(/[,]/g, ".");
        const numerical: BigNumber = new BigNumber(data);
        return !numerical.isNaN() && numerical.lte(Number.MAX_SAFE_INTEGER) && numerical.gt(0);
    }

    /**
     * Convert currency symbols to names
     * @param symbol
     */
    public static currencySymbolsToName(symbol: string): string {
        switch (symbol) {
            case "Ѧ":
                symbol = "ARK";
                break;
            case "$":
                symbol = "USD";
                break;
            case "€":
                symbol = "EUR";
                break;
        }
        return symbol;
    }

    /**
     * Split a string up into an amount and a currency part, use base currency if only an amount is inputted
     * @param data e.g. 1.8, 10USD or USD1.0
     * @returns amountCurrency
     */
    public static parseAmountCurrency(data: string): AmountCurrency {
        // First make sure the input is valid
        if (!Currency.isValidCurrencyInput(data)) {
            throw TypeError(`${data} is not a valid amount/currency input`);
        }

        // Make sure input is formatted correctly
        data = Currency.convertAmountCurrency(data);

        // Check if data is only a number: in that case we have a value in the base currency
        if (Currency.isNumericalInput(data)) {
            const amount = new BigNumber(data);
            return { currency: baseCurrency.ticker, amount };
        }

        for (const i in acceptedCurrencies) {
            if (typeof acceptedCurrencies[i] !== "undefined") {
                const currency = acceptedCurrencies[i];
                if (data.startsWith(currency) || data.endsWith(currency)) {
                    const amount = new BigNumber(data.replace(currency, "").trim());
                    if (amount.isNaN()) {
                        throw TypeError("Not a valid amount currency pair: Amount missing");
                    }
                    return { currency, amount };
                }
            }
        }
        throw TypeError("Not a valid amount currency pair");
    }
}
