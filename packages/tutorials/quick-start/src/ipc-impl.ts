import { TokenService, TokenInfo, tokenService } from "./ipc";
import { remote } from "electron";

class TokenServiceImpl implements TokenService {
    private token: string;
    private ttl: Date;

    /**
     * Generate a token at 0/5 * * * * *
     */
    getCurrentToken(): TokenInfo {
        const now = new Date();
        if (this.ttl == null || this.ttl.getTime() < now.getTime()) {
            this.token = TokenServiceImpl.generateToken();

            this.ttl = new Date();
            this.ttl.setMilliseconds(0);
            this.ttl.setSeconds(Math.floor(now.getSeconds() / 5 + 1) * 5);
        }

        return {
            token: this.token,
            life: this.ttl.getTime() - now.getTime(),
            generator: (process.type + '        ').substring(0, 8)
        }
    }

    private static generateToken(): string {
        let token = '000000' + Math.floor(Math.random() * 1000000).toFixed(0);
        return token.substring(token.length - 6);
    }
}

// Attach implentation by arguments
// return true if attached
export async function tryAttachImpl(): Promise<boolean> {
    const isMain = (process.type == 'browser');
    let attachInRenderer;
    (isMain ? process : remote.process).argv.forEach(arg => {
        if (arg == '--renderer') {
            attachInRenderer = true;
        }
    });
    if (isMain && !attachInRenderer) {
        // register in main process
        await tokenService.__attachImpl(new TokenServiceImpl());
        return true;
    } else if (!isMain && attachInRenderer) {
        // register in renderer process
        await tokenService.__attachImpl(new TokenServiceImpl());
        return true;
    }
    return false;
}