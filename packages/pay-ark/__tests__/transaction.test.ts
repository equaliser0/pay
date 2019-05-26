// Mock Config
import { config } from "@cryptology.hk/pay-config";
import BigNumber from "bignumber.js";
import "jest-extended";
const configMock = jest.spyOn(config, "get");
configMock.mockImplementation(() => ({
    encryptionKey: "935bff586aeb4244452802e4cf87eaca",
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
    dark: {
        networkVersion: 30,
        minValue: 2000000,
        transactionFee: 300,
        nodes: [
            {
                host: "localhost",
                port: 4003,
            },
        ],
    },
    pay: {
        networkVersion: 30,
        minValue: 2000000,
        transactionFee: 1000000,
        epoch: "2019-05-24T11:48:58.165Z",
        nodes: [
            {
                host: "localhost",
                port: 4003,
            },
        ],
        explorer: "https://dexplorer.ark.io",
    },
}));
import { ArkTransaction } from "../src/";

describe("pay-ark: Transaction()", () => {
    describe("generateTransferTransaction()", () => {
        it("should correctly generate and sign a transaction on ARK without second passphrase", async () => {
            const networkMock = jest.spyOn(ArkTransaction, "getNetworkConfig");
            networkMock.mockImplementation(() => Promise.resolve(null));
            const amount: BigNumber = new BigNumber(1);
            const recipientId: string = "AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv";
            const vendorField: string = "test";
            const fee: BigNumber = new BigNumber(2);
            const seed: string = "this is a top secret passphrase";
            const token = "ARK";
            const result = await ArkTransaction.generateTransferTransaction(
                amount,
                recipientId,
                vendorField,
                fee,
                seed,
                token,
            );
            expect(result).toContainKeys([
                "amount",
                "fee",
                "id",
                "network",
                "recipientId",
                "senderPublicKey",
                "signature",
                "timestamp",
                "type",
                "vendorField",
                "version",
            ]);
            networkMock.mockRestore();
        });

        it("should correctly generate and sign a transaction on ARK with second passphrase", async () => {
            const networkMock = jest.spyOn(ArkTransaction, "getNetworkConfig");
            networkMock.mockImplementation(() => Promise.resolve(null));
            const amount: BigNumber = new BigNumber(1);
            const recipientId: string = "AUDud8tvyVZa67p3QY7XPRUTjRGnWQQ9Xv";
            const vendorField: string = "test";
            const fee: BigNumber = new BigNumber(2);
            const seed: string = "this is a top secret passphrase";
            const token = "ARK";
            const result = await ArkTransaction.generateTransferTransaction(
                amount,
                recipientId,
                vendorField,
                fee,
                seed,
                token,
                seed,
            );
            expect(result).toContainKeys([
                "amount",
                "fee",
                "id",
                "network",
                "recipientId",
                "senderPublicKey",
                "signature",
                "secondSignature",
                "timestamp",
                "type",
                "vendorField",
                "version",
            ]);
            networkMock.mockRestore();
        });

        it("should correctly generate and sign a transaction on DARK without second passphrase", async () => {
            const networkMock = jest.spyOn(ArkTransaction, "getNetworkConfig");
            networkMock.mockImplementation(() => Promise.resolve(null));
            const amount: BigNumber = new BigNumber(1);
            const recipientId: string = "D6Z26L69gdk9qYmTv5uzk3uGepigtHY4ax";
            const vendorField: string = "test";
            const fee: BigNumber = new BigNumber(2);
            const seed: string = "this is a top secret passphrase";
            const token = "DARK";
            const result = await ArkTransaction.generateTransferTransaction(
                amount,
                recipientId,
                vendorField,
                fee,
                seed,
                token,
            );
            expect(result).toContainKeys([
                "amount",
                "fee",
                "id",
                "network",
                "recipientId",
                "senderPublicKey",
                "signature",
                "timestamp",
                "type",
                "vendorField",
                "version",
            ]);
            networkMock.mockRestore();
        });

        it("should correctly generate and sign a transaction on PAY with configured epoch", async () => {
            const networkMock = jest.spyOn(ArkTransaction, "getNetworkConfig");
            networkMock.mockImplementation(() => Promise.resolve(null));
            const amount: BigNumber = new BigNumber(1);
            const recipientId: string = "D6Z26L69gdk9qYmTv5uzk3uGepigtHY4ax";
            const vendorField: string = "test";
            const fee: BigNumber = new BigNumber(2);
            const seed: string = "this is a top secret passphrase";
            const token = "PAY";
            const result = await ArkTransaction.generateTransferTransaction(
                amount,
                recipientId,
                vendorField,
                fee,
                seed,
                token,
            );
            expect(result).toContainKeys([
                "amount",
                "fee",
                "id",
                "network",
                "recipientId",
                "senderPublicKey",
                "signature",
                "timestamp",
                "type",
                "vendorField",
                "version",
            ]);
            networkMock.mockRestore();
        });
    });

    it("should correctly generate and sign a transaction on BAD without ArkEcosystem config", async () => {
        const networkMock = jest.spyOn(ArkTransaction, "getNetworkConfig");
        networkMock.mockImplementation(() => Promise.resolve(null));
        const amount: BigNumber = new BigNumber(1);
        const recipientId: string = "D6Z26L69gdk9qYmTv5uzk3uGepigtHY4ax";
        const vendorField: string = "test";
        const fee: BigNumber = new BigNumber(2);
        const seed: string = "this is a top secret passphrase";
        const token = "BAD";
        const result = await ArkTransaction.generateTransferTransaction(
            amount,
            recipientId,
            vendorField,
            fee,
            seed,
            token,
        );
        expect(result).toContainKeys([
            "amount",
            "fee",
            "id",
            "network",
            "recipientId",
            "senderPublicKey",
            "signature",
            "timestamp",
            "type",
            "vendorField",
            "version",
        ]);
        networkMock.mockRestore();
    });
});
