import { ipcMain, ipcRenderer, remote } from "electron";
import { Ipcfied } from ".";
import { getMyCallerId, popContext, pushContext } from "./IpcContext";
import { acceptRemoteCall, createRemoteHandler, RawHandler, stopAcceptRemoteCall } from "./RemoteHandlers";
import { isMain, webContentsAvailable, DuplicateImplementationError, IpcNotImplementedError, InvalidImplementationError, IpcInvocationError } from "./utils";

const registrationChannel = 'ipcreg:reg';
const registrationResultChannel = 'ipcreg:regrsp'
const unregistrationChannel = 'ipcreg:unreg';
const queryChannel = 'ipcreg:qry';
const queryResultChannel = 'ipcreg:qryrsp'
const IN_MAIN_PROCESS = 0;

export class IpcRegistry {

    private localHandlers: { [topic: string]: any } = {};   // all local handlers
    private routeTable: { [topic: string]: number } = {};   // topic -> webContents.id (all remote handlers)

    constructor() {
        if (isMain) {
            // listen on remote topic registration ipcs
            ipcMain.on(registrationChannel, (event, topic) => {
                event.sender.send(
                    registrationResultChannel,
                    this.handleRemoteRegistration(topic, event.sender.id));
            });
            ipcMain.on(unregistrationChannel, (event, topic) => {
                this.handleRemoteUnregistration(topic, event.sender.id);
            });
            ipcMain.on(queryChannel, (event, topic) => {
                event.sender.send(
                    queryResultChannel, 
                    this.handleRemoteQuery(topic));
            });
        } else {
            // automatically unregister when page is unloaded, prevent memory leak
            const unloadHandler = () => {
                window.removeEventListener('beforeunload', unloadHandler);
                ipcRenderer.removeAllListeners(queryResultChannel);
            };
            window.addEventListener('beforeunload', unloadHandler);
        }
    }

    private handleRemoteRegistration(topic: string, remoteId: number): boolean {
        // This method should called in main process
        if (!this.hasImpl(topic)) {
            this.routeTable[topic] = remoteId;
            return true;
        } else {
            return false;
        }
    }

    private handleRemoteUnregistration(topic: string, remoteId: number): void {
        // This method should called in main process
        if (!this.localHandlers[topic] && this.routeTable[topic] == remoteId) {
            delete this.routeTable[topic];
        }
    }

    private handleRemoteQuery(topic: string): number {
        // This method should called in main process
        return !!this.localHandlers[topic] ? IN_MAIN_PROCESS : this.routeTable[topic];
    }

    private hasImpl(topic: string): boolean {
        // This method should called in main process
        if (this.localHandlers[topic]) {
            return true;
        }

        const prevId = this.routeTable[topic];
        if (prevId != null && webContentsAvailable(prevId)) {
            return true;
        } else {
            return false;
        }
    }

    private registerImpl(topic: string, impl: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (impl == null) {
                reject(new InvalidImplementationError(topic));
            }

            if (this.localHandlers[topic] == null) {
                const doLocalRegistration = () => {
                    // start serve local process calls
                    this.localHandlers[topic] = impl;
                    // start serve remote process calls
                    acceptRemoteCall(topic, impl);
                    resolve();
                };

                if (!isMain) {
                    // notify main process that I have the implementation
                    ipcRenderer.once(registrationResultChannel, (event, result: boolean) => {
                        if (result) {
                            doLocalRegistration();
                        } else {
                            reject(new DuplicateImplementationError(topic));
                        }
                    });
                    ipcRenderer.send(registrationChannel, topic);
                } else {
                    // Main process
                    // prevent replace remote handler
                    if (!this.hasImpl(topic)) {
                        doLocalRegistration();
                    } else {
                        reject(new DuplicateImplementationError(topic));
                    }
                }
            } else {
                reject(new DuplicateImplementationError(topic));
            }
        });
    }

    private unregisterImpl(topic: string): Promise<void> {
        if (this.localHandlers[topic] == null) {
            // not registered before
            return;
        }

        // stop serve local process calls
        delete this.localHandlers[topic];
        // stop serve other process calls
        stopAcceptRemoteCall(topic);

        if (!isMain) {
            // unregister from main process
            ipcRenderer.send(unregistrationChannel, topic);
        }
    }

    public getHandler<D>(topic: string): Ipcfied<D> {
        // lazy init handler
        const self = this;
        return new Proxy({}, {
            get(target: any, p: PropertyKey, receiver: any): any {
                const methodName = p.toString();
                return async (...args: any[]) => {
                    switch (methodName) {
                        case '__attachImpl':
                            return await self.registerImpl(topic, args[0]);
                        case '__detachImpl':
                            return await self.unregisterImpl(topic);
                        case '__getTopic':
                            return topic;
                        default:
                            return await self.invoke(topic, methodName, args);
                    }
                };
            }
        });
    }

    private async invoke(topic: string, methodName:string, args: any[]): Promise<any> {
        // first, search local handlers
        const localHandler = this.localHandlers[topic];
        if (localHandler != null) {
            // push ipc context into stack
            pushContext({
                callerId: getMyCallerId(),
                topic: topic
            });
            try {
                return await localHandler[methodName].apply(localHandler, args);
            } catch (cause) {
                // make it consist with remote call
                return Promise.reject(new IpcInvocationError(topic, methodName, args, cause));
            } finally {
                // pop after invoke
                popContext();
            }
        }

        let destId;
        if (isMain) {
            // Main process: search route table for handler resident WebContents
            destId = this.routeTable[topic];
        } else {
            // Renderer process
            destId = this.routeTable[topic];    // lookup cache first
            if (destId == null || !webContentsAvailable(destId)) {
                // Query main process
                destId = await this.probeRemoteHandlerLocation(topic);
            }
        }

        let remoteHandler;
        if (destId == IN_MAIN_PROCESS) {
            // handler resident in main process
            remoteHandler = createRemoteHandler(topic);
        } else {
            // handler resident in some renderer process
            if (destId == null || !webContentsAvailable(destId)) {
                return Promise.reject(new IpcNotImplementedError(topic));
            }
            remoteHandler = createRemoteHandler(topic, destId);
        }

        return await remoteHandler(methodName, args);
    }

    /**
     * Return remote ipc impl's webContents.id. 0 for main process. null if not found.
     */
    private async probeRemoteHandlerLocation(topic: string): Promise<number> {
        const destId = await new Promise<number>((resolve) => {
            ipcRenderer.once(queryResultChannel, (event, webContentsId) => {
                resolve(webContentsId);
            });
            ipcRenderer.send(queryChannel, topic);
        });
        this.routeTable[topic] = destId;
        return destId;
    }

}

export const ipcRegistry = new IpcRegistry();
