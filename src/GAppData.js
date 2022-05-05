"use strict";
/**
 * Class for managing JSON objects in the Google app data file space.
 * see:
 *   - API https://developers.google.com/drive/api/v3/reference?hl=en_US
 */
class GAppData {
    static scope = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata";
    static url = "https://www.googleapis.com/drive/v3/files";

    /**
     * @param {object} clientID The client-id string provided by the google api console.
     */
    constructor(clientID) {
        this.clientID = clientID;
    }

    /**
     * Retrive the raw response of the last api call.
     */
    get response(){
        return this._response;
    }

    /**
     * Aquire an access token, must call before any other method.
     * If not called, other methods will call it.
     */
    load() {
        return new Promise((resolve, reject) => {
            gapi.load("client", () => {
                window.client = google.accounts.oauth2.initTokenClient({
                    client_id: this.clientID,
                    scope: GAppData.scope,
                    callback: tokenResponse => {
                        this.access_token = tokenResponse.access_token;
                        resolve(this);
                    },
                });
                client.requestAccessToken();
            });
        });
    }

    /**
     * Revoke the access token.
     */
    revokeToken() {
        return new Promise((resolve, reject) => {
            google.accounts.oauth2.revoke(this.access_token, resolve);
        });
    }

    /**
     * Throw an error if the response status is not 2xx.
     * @param {object} response The object returned from a fetch call.
     */
    async check200(response){
        this._response = response;
        if (response.status < 200 || response.status > 299){
            console.log(response.status);
            const json = await response.json();
            throw new Error(json.error.message);
        }        
    }

    /**
     * Build a deault url.
     * @param {string} fileId Appended to the url as part of the path.
     * @param {object} param All fields appended to the url as serach parameters.
     * @param {string} param Optional, over-ride the default base url.
     */
    url(fileId, param, url = GAppData.url){
        if (fileId && param) return url + "/" + fileId + "?" + new URLSearchParams(param);
        if (fileId) return url + "/" + fileId;
        if (param) return url + "?" + new URLSearchParams(param);
        return url
    }

    /**
     * List all files.
     * Returns an array of files each with: id, name, & modifiedTime
     * @returns {array}
     */
    async list() {
        if (!this.access_token) await this.load();

        const param = {
            spaces: "appDataFolder",
            fields: "files/name,files/id,files/modifiedTime",
        };

        const response = await fetch(this.url(null, param), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.access_token}`,
            },
        });

        await this.check200(response);
        const json = await response.json();
        return json.files;
    }

    /**
     * Retrieve the contents of a file associated with a valid fileID.
     * @param {string} fileID a valid fileID returned from another api call.
     * @returns {string} the contents of the file.
     */
    async get(fileID) {
        if (!this.access_token) await this.load();

        const param = {
            spaces: "appDataFolder",
            alt: "media",
        };

        const response = await fetch(this.url(fileID, param), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.access_token}`,
            },
        });

        await this.check200(response);
        return await response.text();
    }

    /**
     * Create a new file with provied filename.
     * @param {string} filename The filename to give the file.
     * @return The id of the new file.
     */
    async create(filename = "name_not_set") {
        if (!this.access_token) await this.load();

        const response = await fetch(this.url(), {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.access_token}`,
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: filename,
                parents: ["appDataFolder"],
            }),
        });

        await this.check200(response);
        return response.json().id;
    }

    /**
     * Set the contents of the file to 'jsonContents'.
     * @param {string} fileID A valid fileID returned from another api call.
     * @param {string} jsonContents String representation of a json object.
     */    
    async update(fileID, jsonContents) {
        if (!this.access_token) await this.load();

        const url = this.url(fileID, undefined, "https://www.googleapis.com/upload/drive/v3/files");

        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${this.access_token}`,
                "Content-Type": "application/json",
            },
            body: jsonContents,
        });

        await this.check200(response);
    }

    /**
     * Remove a file
     * @param {string} fileID A valid fileID returned from another api call.
     */   
    async delete(fileID, contents) {
        if (!this.access_token) await this.load();

        const response = await fetch(this.url(fileID), {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${this.access_token}`,
            },
        });

        await this.check200(response);
    }

    /**
     * Rename a file.
     * @param {string} fileID A valid fileID returned from another api call.
     * @param {string} filename The new filename.
     */   
    async rename(fileID, filename) {
        if (!this.access_token) await this.load();

        const response = await fetch(this.url(fileID), {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${this.access_token}`,
                "Accept": "application/json", 
                "Content-Type": "application/json",                
            },
            body: JSON.stringify({
                name: filename,
            }),
        });

        await this.check200(response);
    }
}

export default GAppData;
