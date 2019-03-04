import * as assert from "assert";
import { mainService, renderer1Service, renderer2Service, TestServiceImpl } from "../Services";
import { n, s, b, prepareRenderer } from "../utils";

/**
 * TestService.echo functional testing
 */
describe('Echo', () => {
    it('main -> main', async () => {
        await mainService.__attachImpl(new class extends TestServiceImpl {
            async call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]) {
                // nothing
            }
        });
        const args = await mainService.echo(n, s, { b }, 1, true, 'foo');
        assert.equal(args.n, n);
        assert.equal(args.s, s);
        assert.equal(args.o.b, b);
        assert.equal(args.additional.length, 3);
    });

    it('main -> renderer1', async () => {
        const renderer = await prepareRenderer('renderer1', 'smoke');
        const args = await renderer1Service.echo(n, s, { b }, 1, true, 'foo');
        assert.equal(args.n, n);
        assert.equal(args.s, s);
        assert.equal(args.o.b, b);
        assert.deepEqual(args.additional, [1, true, 'foo']);
        assert.equal(args.topic, renderer.config.topic);
    }).timeout(10000);

    it('main -> renderer2', async () => {
        const renderer = await prepareRenderer('renderer2', 'smoke');
        const args = await renderer2Service.echo(n, s, { b }, 1, true, 'bar');
        assert.equal(args.n, n);
        assert.equal(args.s, s);
        assert.equal(args.o.b, b);
        assert.deepEqual(args.additional, [1, true, 'bar']);
        assert.equal(args.topic, renderer.config.topic);
    }).timeout(10000);
});

/**
 * Chained call test
 * 
 * main -> renderer1 -> renderer2 -> main
 */
describe('Chained call', () => {
    it('main -> render1 -> renderer2 -> main', async () => {
        const renderer1 = await prepareRenderer('renderer1', 'smoke');
        const renderer2 = await prepareRenderer('renderer2', 'smoke');

        let expectedArgs = { n, s, o: { b } };
        expectedArgs = renderer1.config.patchArgs(expectedArgs);
        expectedArgs = renderer2.config.patchArgs(expectedArgs);

        await mainService.__attachImpl(new class extends TestServiceImpl {
            async call(callerChain: string[], n: number, s: string, o: { b: boolean }, ...additional: any[]) {
                assert.equal(n, expectedArgs.n);
                assert.equal(s, expectedArgs.s);
                assert.deepEqual(o, expectedArgs.o);
                assert.deepEqual(callerChain, ['renderer1', 'renderer2']);
            }
        });

        await renderer1Service.call([], n, s, { b });
    }).timeout(10000);
});
