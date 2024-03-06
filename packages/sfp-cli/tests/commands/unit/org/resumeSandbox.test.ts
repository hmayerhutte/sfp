import {
    Lifecycle,
    Messages,
    Org,
    SandboxEvents,
    SandboxProcessObject,
    AuthFields,
    SandboxRequestCacheEntry,
    SfError,
    Connection,
} from '@salesforce/core';
import OrgResumeSandbox, { SandboxProcess } from '../../../../src/commands/org/resume/sandbox';
import { MockTestOrgData, instantiateContext, stubContext, restoreContext } from '@salesforce/core/lib/testSetup';

const sandboxName = 'mySandbox1';

const sandboxProcessObj = {
    done: true,
    totalSize: 1,
    records: [
        {
            Id: '1234',
            SandboxName: sandboxName,
            Status: 'Completed',
            Description: 'MyNewSandbox',
            LicenseType: 'Developer Edition',
            SandboxInfoId: '1234',
        },
    ],
};

const sandboxProcessObjNotResume = {
    done: true,
    totalSize: 1,
    records: [
        {
            Id: '1234',
            SandboxName: sandboxName,
            Status: 'Failed',
            Description: 'MyNewSandbox',
            LicenseType: 'Developer Edition',
            SandboxInfoId: '1234',
        },
    ],
};

const sandboxProcessObjResume = {
    done: true,
    totalSize: 1,
    records: [
        {
            Id: '1234',
            SandboxName: sandboxName,
            Status: 'Pending',
            Description: 'MyNewSandbox',
            LicenseType: 'Developer Edition',
            SandboxInfoId: '1234',
        },
    ],
};


describe('[org resume sandbox]', () => {
    Messages.importMessagesDirectory(__dirname);
    const messages = Messages.loadMessages('@flxblio/sfp', 'org_resume_sandbox');
    const $$ = instantiateContext();
    const prodOrg = new MockTestOrgData();
    let prodConnection: Connection;

    beforeEach(async () => {
        stubContext($$);
        await $$.stubAuths(prodOrg);
        $$.stubAliases({ myProdOrg: prodOrg.username});
        prodConnection = await prodOrg.getConnection();
        $$.SANDBOX.stub(Org, 'create').resolves(Org.prototype);
    });

    afterEach(async () => {
        restoreContext($$);
    });

    it('found no authorization infos for the target org flag', async () => {
        $$.SANDBOX.stub(Org.prototype, 'getConnection').throwsException(
            new SfError('No authorization infos found for prodFake.')
        );

        try {
            await OrgResumeSandbox.run(['-o', 'prodFake', '--name', 'test']);
        } catch (err) {
            expect(err?.message).toBe(`No authorization infos found for prodFake.`);
        }
    });

    it('found no sandbox process infos for the name flag', async () => {
        $$.SANDBOX.stub(Org.prototype, 'getConnection').returns(prodConnection);
        $$.SANDBOX.stub(prodConnection.tooling, 'query').onFirstCall().resolves(
            {
                done: true,
                totalSize: 0,
                records: [],
            }
        );
        try {
            await OrgResumeSandbox.run(['-o', 'myProdOrg', '--name', 'mySandbox2']);
        } catch (err) {
            expect(err?.message).toBe(
                `Found no sandbox process information for the given parameters. Please check the sandbox name 'mySandbox2' in the production org 'myProdOrg' and try again!`
            );
        }
    });

    it('found sandbox process with status completed', async () => {
        $$.SANDBOX.stub(Org.prototype, 'getConnection').returns(prodConnection);
        $$.SANDBOX.stub(prodConnection.tooling, 'query').onFirstCall().resolves(sandboxProcessObj);
        try {
            await OrgResumeSandbox.run(['-o', 'myProdOrg', '--name', 'mySandbox1']);
        } catch (err) {
            expect(err?.message).toBe(
                `Found no sandbox process information for the given parameters. Please check the sandbox name 'test' and the production org 'myProdOrg' and try again!`
            );
        }
    });

    it('found sandbox process with status not resumable', async () => {
        $$.SANDBOX.stub(Org.prototype, 'getConnection').returns(prodConnection);
        $$.SANDBOX.stub(prodConnection.tooling, 'query').onFirstCall().resolves(sandboxProcessObjNotResume);
        try {
            await OrgResumeSandbox.run(['-o', 'myProdOrg', '--name', 'mySandbox1']);
        } catch (err) {
            expect(err?.message).toBe(
                `Sandbox mySandbox1 is not resumable. Status: ${sandboxProcessObjNotResume.records[0].Status}`
            );
        }
    });

    it('found sandbox process with status resumable', async () => {
        $$.SANDBOX.stub(Org.prototype, 'getConnection').returns(prodConnection);
        $$.SANDBOX.stub(prodConnection.tooling, 'query').onFirstCall().resolves(sandboxProcessObjResume);
        try {
            await OrgResumeSandbox.run(['-o', 'myProdOrg', '--name', 'mySandbox1']);
        } catch (err) {
            expect(err?.message).toBe(
                `Sandbox mySandbox1 is still in progress ⌛️. Status: ${sandboxProcessObjResume.records[0].Status}. Please try again later!`
            );
        }
    });
});
