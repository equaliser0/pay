import BigNumber from "bignumber.js";
import "jest-extended";

import { config } from "@cryptology.hk/pay-config";

const configMock = jest.spyOn(config, "get");
configMock.mockImplementation(() => ({
    stickers: {
        token: "ark",
        payoutTo: "Aa74QyqAFBsevReox3rMWy6FhMUyJVGPop",
        notify: { username: "arkpay", platform: "reddit" },
    },
    ark: {
        networkVersion: 23,
        minValue: 2000000,
        transactionFee: 300,
        nodes: [
            {
                host: "localhost",
                port: 4003,
            },
        ],
    },
}));

import { ArkWallet } from "@cryptology.hk/pay-ark";
import { Reply } from "@cryptology.hk/pay-messenger";
import { User, Username } from "@cryptology.hk/pay-user";
import { Stickers } from "../../src";

describe("pay-commands: Stickers() - Exceptions, No Price", () => {
    describe("send() - Exceptions, No Price", () => {
        it("should return an error Reply when sticker price is not configured", async () => {
            // Mock User.getWalletAddress()
            const getWalletAddressMock = jest.spyOn(User, "getWalletAddress");
            getWalletAddressMock.mockImplementation(() => Promise.resolve("XXX"));
            // Mock ArkWallet.getBalance()
            const getBalanceMock = jest.spyOn(ArkWallet, "getBalance");
            getBalanceMock.mockImplementation(() => Promise.resolve(new BigNumber(1)));
            const sender: Username = {
                username: "AAA",
                platform: "ZZZ",
            };
            const receiver: Username = {
                username: "BBB",
                platform: "ZZZ",
            };
            const result: Reply = await Stickers.send(sender, receiver);
            expect(result).toContainAllKeys(["directMessageSender", "replyComment"]);
            getBalanceMock.mockRestore();
            getWalletAddressMock.mockRestore();
        });
    });
});
configMock.mockRestore();
