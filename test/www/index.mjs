import GAppData from "@tharious/gappdata";

window.handleCredentialResponse = function (credentials) {
    mocha.setup("bdd");
    mocha.reporter("html");
    mocha.timeout(10000);
    tests(credentials.clientId);
    mocha.run();
};

function tests(clientId) {
    const expect = chai.expect;

    describe("mocha/chai sanity test", function () {
        it("mocha/chai works", function () {
            expect(true).to.be.equal(true);
        });
    });

    describe("create a GAppData object", function () {
        before(function () {
            this.gappdata = new GAppData(clientId);
            window.gappdata = this.gappdata;
        });

        it("constructor sanity check (is not null)", function () {
            expect(this.gappdata).to.not.be.null;
        });

        it("acquire an access token with load()", async function () {
            await this.gappdata.load();
            expect(this.gappdata.accessToken).to.not.be.null;
        });

        describe("create new empty file", async function () {
            before(async function () {
                this.name = `empty-file${Math.floor(Math.random() * 100000)}.json`;
                this.fileId = await this.gappdata.create(this.name);
            });

            it("sanity check: id is not null", function () {
                expect(this.fileId).to.not.be.undefined;
            });

            it("contents of the file are empty", async function () {
                const contents = await this.gappdata.get(this.fileId);
                expect(contents).to.be.empty;
            });

            it("file list contains file id", async function () {
                const list = await this.gappdata.list();
                expect(list.map(e => e.id)).to.include.members([this.fileId]);
            });

            it("file list contains file name", async function () {
                const list = await this.gappdata.list();
                expect(list.map(e => e.name)).to.include.members([this.name]);
            });

            describe("rename the file", async function () {
                before(async function () {
                    this.newName = `empty-file${Math.floor(Math.random() * 100000)}.json`;
                    await this.gappdata.rename(this.fileId, this.newName);
                });

                it("contents of the file are empty", async function () {
                    const contents = await this.gappdata.get(this.fileId);
                    expect(contents).to.be.empty;
                });

                it("file list contains file id", async function () {
                    const list = await this.gappdata.list();
                    expect(list.map(e => e.id)).to.include.members([this.fileId]);
                });

                it("file list contains new file name", async function () {
                    const list = await this.gappdata.list();
                    expect(list.map(e => e.name)).to.include.members([this.newName]);
                });

                it("file does not contain the old name", async function () {
                    const list = await this.gappdata.list();
                    expect(list.map(e => e.name)).to.not.include.members([this.name]);
                });
            });

            describe("set file contents (update)", async function () {
                before(async function () {
                    this.contents = {
                        a: "apple",
                        b: "banana",
                        c: "carrot",
                    };
                    await this.gappdata.update(this.fileId, this.contents);
                });

                it("contents of the file not empty", async function () {
                    const contents = await this.gappdata.get(this.fileId);
                    expect(contents).to.not.be.empty;
                });

                it("contained object fields match", async function () {
                    const contents = await this.gappdata.get(this.fileId);
                    expect(contents.a).to.be.equal(this.contents.a);
                    expect(contents.b).to.be.equal(this.contents.b);
                    expect(contents.c).to.be.equal(this.contents.c);
                });

                describe("change some local fields to ensure changes aren't retained", async function () {
                    before(async function () {
                        this.contents = {
                            a: "apricot",
                            b: "blueberry",
                            c: "carrot",
                        };
                    });                    
                    
                    it("changed object fields do not match", async function () {
                        const contents = await this.gappdata.get(this.fileId);
                        expect(contents.a).to.be.not.equal(this.contents.a);
                        expect(contents.b).to.be.not.equal(this.contents.b);
                    });

                    it("unchanged object fields match", async function () {
                        const contents = await this.gappdata.get(this.fileId);
                        expect(contents.c).to.be.equal(this.contents.c);
                    });
                });
            });

            describe("delete the file", async function () {
                before(async function () {
                    await this.gappdata.delete(this.fileId);
                });

                it("file list does not contain file id", async function () {
                    const list = await this.gappdata.list();
                    expect(list.map(e => e.id)).to.not.include.members([this.fileId]);
                });
            });
        });        
    });
}
