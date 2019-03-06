import { ipcfy } from "electron-ipcfy";

export type TokenInfo = {
    token: string;
    life: number;
    generator: string;
}

export interface TokenService {
    /**
     * Get current token, and return its life in millis
     */
    getCurrentToken(): TokenInfo;
}

export const tokenService = ipcfy<TokenService>('global-token');
