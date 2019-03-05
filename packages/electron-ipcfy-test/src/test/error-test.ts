import * as assert from "assert";
import { mainService, renderer1Service, renderer2Service, TestServiceImpl } from "../Services";
import { n, s, b, prepareRenderer } from "../utils";
import { InvalidImplementationError } from "electron-ipcfy/dist/utils";

describe('InvalidImplementationError', () => {
    it('local', async () => {
        await expectError(InvalidImplementationError, async () => {
            await mainService.__attachImpl(null);
        });
    });

    it('remote: renderer1', async () => {
        await expectError(InvalidImplementationError, async () => {
            await prepareRenderer('renderer1', 'attachNullImpl');
        });
    });
});

async function expectError<T extends Error>(errorType: { new(...args: any[]): T }, executor: Function) {
    try {
        await executor();
    } catch (e) {
        if (e instanceof errorType) {
            // expected
            return;
        } else {
            assert.fail(`Expect error of type '${errorType}', but '${e}'`);
        }
    }
    
    assert.fail(`Expect error, but success actually`);
}
