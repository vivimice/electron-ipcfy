import * as assert from "assert";
import { mainService, renderer1Service, renderer2Service, TestServiceImpl, conflictService } from "../Services";
import { n, s, b, prepareRenderer } from "../utils";
import { InvalidImplementationError, DuplicateImplementationError } from "electron-ipcfy/dist/utils";

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

describe('DuplicateImplementationError', () => {
    afterEach(() => {
        conflictService.__detachImpl();
    });

    it('main <-> main', async () => {
        await mainService.__attachImpl(TestServiceImpl.CALLBACKLESS_INSTANCE);
        await expectError(DuplicateImplementationError, async () => {
            await mainService.__attachImpl(TestServiceImpl.CALLBACKLESS_INSTANCE);
        });
    });

    it('main <-> render', async () => {
        await conflictService.__attachImpl(TestServiceImpl.CALLBACKLESS_INSTANCE);
        await expectError(DuplicateImplementationError, async () => {
            await prepareRenderer('renderer1', 'attachConflictImpl');
        });
    });

    it('render <-> main', async () => {
        await prepareRenderer('renderer1', 'attachConflictImpl');
        await expectError(DuplicateImplementationError, async () => {
            await conflictService.__attachImpl(TestServiceImpl.CALLBACKLESS_INSTANCE)
        });
    });

    it('renderer <-> same renderer', async () => {
        await expectError(DuplicateImplementationError, async () => {
            await prepareRenderer('renderer1', 'attachDuplicateImpl');
        });
    });

    it('renderer <-> other renderer', async () => {
        await prepareRenderer('renderer1', 'attachConflictImpl');
        await expectError(DuplicateImplementationError, async () => {
            await prepareRenderer('renderer2', 'attachConflictImpl');
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
            assert.fail(`Expect error of type '${errorType.name}', but '${e}'`);
        }
    }
    
    assert.fail(`Expect error, but success actually`);
}
