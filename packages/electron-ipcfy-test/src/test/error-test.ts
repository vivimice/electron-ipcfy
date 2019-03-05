import * as assert from "assert";
import { mainService, renderer1Service, renderer2Service, TestServiceImpl, conflictService, errorService, timeoutService } from "../Services";
import { n, s, b, prepareRenderer, CustomError } from "../utils";
import { InvalidImplementationError, DuplicateImplementationError, IpcInvocationError, registerCustomIpcError, IpcMethodNotFoundError, IpcNotImplementedError, IpcTimeoutError } from "electron-ipcfy/dist/utils";

afterEach(() => {
    mainService.__detachImpl();
});

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
        await mainService.__attachImpl(TestServiceImpl.DEFAULT_INSTANCE);
        await expectError(DuplicateImplementationError, async () => {
            await mainService.__attachImpl(TestServiceImpl.DEFAULT_INSTANCE);
        });
    });

    it('main <-> render', async () => {
        await conflictService.__attachImpl(TestServiceImpl.DEFAULT_INSTANCE);
        await expectError(DuplicateImplementationError, async () => {
            await prepareRenderer('renderer1', 'attachConflictImpl');
        });
    });

    it('render <-> main', async () => {
        await prepareRenderer('renderer1', 'attachConflictImpl');
        await expectError(DuplicateImplementationError, async () => {
            await conflictService.__attachImpl(TestServiceImpl.DEFAULT_INSTANCE)
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

describe('IpcInvocationError', async () => {
    afterEach(() => {
        // recycle possible attached implementations in main process
        errorService.__detachImpl();
    });

    it('main -> main', async () => {
        await errorService.__attachImpl(TestServiceImpl.createErrorRaisingImpl(() => new CustomError('hello')));
        await expectError(IpcInvocationError, async () => {
            await errorService.test();
        }, (e) => {
            const cause = assertType(e.getCause(), CustomError);
            assert.equal(cause.message, 'hello');
        });
    });

    it('asd main -> renderer', async () => {
        await prepareRenderer('renderer1', 'attachErrorImpl');
        await expectError(IpcInvocationError, async () => {
            await errorService.test();
        }, (e) => {
            const cause = assertType(e.getCause(), CustomError);
            assert.equal(cause.message, 'hohoho');
        });
    });

    it('asd renderer -> main', async () => {
        await errorService.__attachImpl(TestServiceImpl.createErrorRaisingImpl(() => new CustomError('foo')));
        await prepareRenderer('renderer2', 'relayTestCall')
        await expectError(IpcInvocationError, async () => {
            await renderer2Service.test();  // will relay to errorService.test()
        }, (e) => {
            const cause1 = assertType(e.getCause(), IpcInvocationError);
            const cause2 = assertType(cause1.getCause(), CustomError);
            assert.equal(cause2.message, 'foo');
        });
    });

    it('renderer -> renderer', async () => {
        await prepareRenderer('renderer1', 'attachErrorImpl');
        await prepareRenderer('renderer2', 'relayTestCall');
        await expectError(IpcInvocationError, async () => {
            await renderer2Service.test();  // will relay to errorService.test() which resident in renderer1
        }, (e) => {
            const cause1 = assertType(e.getCause(), IpcInvocationError);
            const cause2 = assertType(cause1.getCause(), CustomError);
            assert.equal(cause2.message, 'hohoho');
        });
    });
});

describe('IpcMethodNotFoundError', () => {
    it('main -> main', async () => {
        await mainService.__attachImpl(TestServiceImpl.DEFAULT_INSTANCE);
        await expectError(IpcMethodNotFoundError, async () => {
            await mainService['notexists']();
        });
    });

    it('main -> renderer', async () => {
        await prepareRenderer('renderer1', 'attachDefaultImpl');
        await expectError(IpcMethodNotFoundError, async () => {
            await renderer1Service['notexists']();
        });
    });

    it('renderer -> main', async () => {
        await mainService.__attachImpl(TestServiceImpl.DEFAULT_INSTANCE);
        await expectError(IpcMethodNotFoundError, async () => {
            await prepareRenderer('renderer2', 'callMainUnexistsMethod');
        });
    });

    it('renderer -> renderer', async () => {
        await prepareRenderer('renderer1', 'attachDefaultImpl');
        await expectError(IpcMethodNotFoundError, async () => {
            await prepareRenderer('renderer2', 'callRenderer1UnexistsMethod');
        });
    });
});

describe('IpcNotImplementedError', () => {

    it('from main', async () => {
        await expectError(IpcNotImplementedError, async () => {
            await mainService.test();
        });
    });

    it('from renderer', async () => {
        await expectError(IpcNotImplementedError, async () => {
            await prepareRenderer('renderer2', 'callMainUnexistsMethod');
        });
    });

});

describe('IpcTimeoutError', () => {

    afterEach(() => {
        timeoutService.__detachImpl();
    });

    it('main -> main (will timeout)', async () => {
        await timeoutService.__attachImpl(TestServiceImpl.createTimeoutImpl(200));
        await timeoutService.__setTimeout(136);
        await expectError(IpcTimeoutError, async () => {
            await timeoutService.test();
        }, (e) => {
            const error = assertType(e, IpcTimeoutError);
            assert.equal(error.getTimeout(), 136);
        });
    });

    it('main -> main (won\'t timeout)', async () => {
        await timeoutService.__attachImpl(TestServiceImpl.createTimeoutImpl(100));
        await timeoutService.__setTimeout(136);
        await timeoutService.test();
    });

    it('main -> renderer (will timeout)', async () => {
        await prepareRenderer('renderer1', 'attach100msTimeoutImpl');
        await timeoutService.__setTimeout(50);
        await expectError(IpcTimeoutError, async () => {
            await timeoutService.test();
        }, (e) => {
            const error = assertType(e, IpcTimeoutError);
            assert.equal(error.getTimeout(), 50);
        });
    });

    it('main -> renderer (won\'t timeout)', async () => {
        await prepareRenderer('renderer1', 'attach100msTimeoutImpl');
        await timeoutService.__setTimeout(200);
        await timeoutService.test();
    });

    it('renderer -> main (will timeout)', async () => {
        await timeoutService.__attachImpl(TestServiceImpl.createTimeoutImpl(100));
        await expectError(IpcTimeoutError, async () => {
            await prepareRenderer('renderer2', 'callTimeoutMethod50ms');
        }, (e) => {
            const error = assertType(e, IpcTimeoutError);
            assert.equal(error.getTimeout(), 50);
        });
    });

    it('renderer -> main (won\'t timeout)', async () => {
        await timeoutService.__attachImpl(TestServiceImpl.createTimeoutImpl(100));
        await prepareRenderer('renderer2', 'callTimeoutMethod200ms');
    });

    it('renderer -> renderer (will timeout)', async () => {
        await prepareRenderer('renderer1', 'attach100msTimeoutImpl');
        await expectError(IpcTimeoutError, async () => {
            await prepareRenderer('renderer2', 'callTimeoutMethod50ms');
        }, (e) => {
            const error = assertType(e, IpcTimeoutError);
            assert.equal(error.getTimeout(), 50);
        });
    });

    it('renderer -> renderer (won\'t timeout)', async () => {
        await prepareRenderer('renderer1', 'attach100msTimeoutImpl');
        await prepareRenderer('renderer2', 'callTimeoutMethod200ms');
    });
});

function assertType<T>(actualInstance: any, expectedType: { new(...args: any[]): T }): T {
    if (!(actualInstance instanceof expectedType)) {
        assert.fail(`Expect error of type '${expectedType.name}', but '${actualInstance.constructor.name}': ${actualInstance}`);
    }
    return actualInstance as T;
}

async function expectError<T extends Error>(
    errorType: { new(...args: any[]): T }, 
    executor: Function, 
    asserter: (e: T) => void = null
) {
    try {
        await executor();
    } catch (e) {
        assertType(e, errorType);
        !!asserter && asserter(e);
        return;
    }
    
    assert.fail(`Expect '${errorType.name}', but success actually`);
}
