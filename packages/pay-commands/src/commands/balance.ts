import { ArkWallet } from "@cryptology.hk/pay-ark";
import { Currency } from "@cryptology.hk/pay-currency";
import { Messenger, Reply } from "@cryptology.hk/pay-messenger";
import { User, Username } from "@cryptology.hk/pay-user";
import BigNumber from "bignumber.js";

export class Balance {
    public static async getBalance(user: Username, token: string): Promise<Reply> {
        const wallet = await User.getWalletAddress(user, token);
        const balance: BigNumber = await ArkWallet.getBalance(wallet, token);
        const usdValue: BigNumber = await Currency.baseCurrencyUnitsToUSD(balance, token);
        return Messenger.balanceMessage(balance, usdValue, token);
    }
}