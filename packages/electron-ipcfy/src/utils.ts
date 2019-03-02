import { remote, WebContents, webContents } from "electron";

export const isMain = process.type == 'browser';

export function getWebContentsById(id: number): WebContents {
    return (isMain ? webContents : remote.webContents).fromId(id);
}

export function webContentsAvailable(id: number): boolean {
    return getWebContentsById(id) != null;
}