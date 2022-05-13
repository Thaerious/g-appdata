"use strict";

/**
 * Class for managing JSON files in the Google app-data file space.
 * see:
 *   - API https://developers.google.com/drive/api/v3/reference?hl=en_US
 */
class GAppData {
    static SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata";
    static URL = "https://www.googleapis.com/drive/v3/files";
    static LOCAL_STORAGE_KEY = "access_token";

    /**
     * @param {object} clientID The client-id string provided by the google api console.
     */
    constructor(clientID) {
        this.clientID = clientID || document.querySelector("meta[name='client-id']").getAttribute("content");
        
        if (localStorage.getItem(GAppData.LOCAL_STORAGE_KEY)){            
            this._accessToken = localStorage.getItem(GAppData.LOCAL_STORAGE_KEY);
            console.log(this._accessToken);
        }
    }

    /**
     * Retrieve the raw response of the last api call.
     */
    get response() {
        return this._response;
    }

    get accessToken() {
        return this._accessToken;
    }

    set accessToken(value) {
        return (this._accessToken = value);
    }

    login() {
        return new Promise((resolve, reject) => {
            google.accounts.id.initialize({
                client_id: this.clientID,
                callback: tokenResponse => {
                    resolve(tokenResponse);
                },
            });
            google.accounts.id.prompt();
        });
    }

    /**
     * Aquire an access token, must call before any other method.
     * If not previously called, other methods will call it first.
     * Load does not call #checkResponse so that a circular condition doesn't trigger.
     */
    load() {
        return new Promise((resolve, reject) => {
            gapi.load("client", () => {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.clientID,
                    scope: GAppData.SCOPE,
                    callback: tokenResponse => {
                        this._accessToken = tokenResponse.access_token;
                        localStorage.setItem(GAppData.LOCAL_STORAGE_KEY, this.accessToken);
                        resolve(this._accessToken);
                    },
                });
                this.tokenClient.requestAccessToken();
            });
        });
    }

    /**
     * Revoke the access token.
     */
    revokeToken() {
        return new Promise((resolve, reject) => {
            google.accounts.id.revoke(this._accessToken, resolve);
        });
    }

    async checkResponse(response) {
        this._response = response;
        if (await this.check200(response)) return;
        // if (await this.check400(response)) return;
        throw new Error(this.response.json());
    }

    /**
     * Return false if the response status is not 2xx.
     * @param {object} response The object returned from a fetch call.
     */
    async check200(response) {
        if (response.status >= 200 && response.status <= 299) return true;
    }

    async check400(response) {
        switch (response.status) {
            case 401:
                this.load();
            default:
                return false;
        }
    }

    /**
     * Build a deault url.
     * @param {string} fileId Appended to the url as part of the path.
     * @param {object} param All fields appended to the url as search parameters.
     * @param {string} param Optional, over-ride the default base url.
     */
    url(fileId, param, url = GAppData.URL) {
        if (fileId && param) return url + "/" + fileId + "?" + new URLSearchParams(param);
        if (fileId) return url + "/" + fileId;
        if (param) return url + "?" + new URLSearchParams(param);
        return url;
    }

    async verify() {
        const url = "https://www.googleapis.com/oauth2/v1/tokeninfo";

        const param = {
            access_token: this.accessToken,
        };

        const response = await fetch(this.url(null, param, url), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this._accessToken}`,
            },
        });

        if (response.status >= 200 && response.status <= 299) return true;
        return false;
    }

    /**
     * List all files.
     * Returns an array of files each with: id, name, & modifiedTime
     * @returns {array}
     */
    async list() {
        if (!this._accessToken) await this.load();

        const param = {
            spaces: "appDataFolder",
            fields: "files/name,files/id,files/modifiedTime",
        };

        const response = await fetch(this.url(null, param), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this._accessToken}`,
            },
        });

        await this.checkResponse(response);
        const json = await response.json();
        return json.files;
    }

    /**
     * Retrieve the contents of a file associated with a valid fileID.
     * If the file is empty, returns an empty object.
     * @param {string} fileID a valid fileID returned from another api call.
     * @returns {object} the json contents of the file.
     */
    async get(fileID) {
        if (!this._accessToken) await this.load();

        const param = {
            spaces: "appDataFolder",
            alt: "media",
        };

        const response = await fetch(this.url(fileID, param), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this._accessToken}`,
            },
        });

        await this.checkResponse(response);
        const text = await response.text();
        if (text === "") return {};
        return JSON.parse(text);
    }

    /**
     * Create a new file with provied filename.
     * The file is created empty.
     * @param {string} filename The filename to give the file.
     * @return The id of the new file.
     */
    async create(filename = "name_not_set") {
        if (!this._accessToken) await this.load();

        const response = await fetch(this.url(), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this._accessToken}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: filename,
                parents: ["appDataFolder"],
            }),
        });

        await this.checkResponse(response);
        const json = await response.json();
        return json.id;
    }

    /**
     * Set the contents of the file to 'jsonContents'.
     * If 'jsonContents' is an object JSON.stringify will be called on it.
     * @param {string} fileID A valid fileID returned from another api call.
     * @param {string} jsonContents String representation of a json object.
     */
    async update(fileID, jsonContents) {
        if (!this._accessToken) await this.load();
        if (typeof jsonContents === "object") jsonContents = JSON.stringify(jsonContents);

        const url = this.url(fileID, undefined, "https://www.googleapis.com/upload/drive/v3/files");

        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${this._accessToken}`,
                "Content-Type": "application/json",
            },
            body: jsonContents,
        });

        await this.checkResponse(response);
    }

    /**
     * Remove a file
     * @param {string} fileID A valid fileID returned from another api call.
     */
    async delete(fileID, contents) {
        if (!this._accessToken) await this.load();

        const response = await fetch(this.url(fileID), {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${this._accessToken}`,
            },
        });

        await this.checkResponse(response);
    }

    /**
     * Rename a file.
     * @param {string} fileID A valid fileID returned from another api call.
     * @param {string} filename The new filename.
     */
    async rename(fileID, filename) {
        if (!this._accessToken) await this.load();

        const response = await fetch(this.url(fileID), {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${this._accessToken}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: filename,
            }),
        });

        await this.checkResponse(response);
    }
}

export default GAppData;
