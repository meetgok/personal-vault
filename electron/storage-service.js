import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const FILE_PATH = path.join(app.getPath('userData'), 'vault.json');

export function readVault() {
    if (!fs.existsSync(FILE_PATH)) {
        return null;
    }
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(data);
}

export function saveVault(data) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export function vaultExists() {
    return fs.existsSync(FILE_PATH);
}
