jest.mock('ic-mops/commands/add');
import {
    CompletionItem,
    CompletionList,
    Connection,
    InitializeResult,
} from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import { clientInitParams, setupClientServer } from '../test/mock';
import { cwd } from 'node:process';
import { EventEmitter } from 'node:events';
import { wait, waitForNotification } from './helpers';

const initText = `
import A = "a";
import B = "b";
import Blob = "mo:base/Blob";
`;

const workText =
    initText +
    `
let a =     A.
let b =     B.
let c =     C.
let d =  Blob.
let e = Array.
`;

const rootUri = URI.file(`${cwd()}/test/completion`);

const file = {
    uri: `${rootUri}/not-exist.mo`,
    textDocument: {
        uri: `${rootUri}/not-exist.mo`,
        languageId: 'motoko',
        version: 1,
        text: initText,
    },
};

describe('completion', () => {
    let client: Connection;
    let server: Connection;

    beforeAll(async () => {
        console.log(`Running test on ${rootUri}`);

        const emitter = new EventEmitter();

        [client, server] = setupClientServer(true);

        client.onNotification('custom/initialized', () => {
            emitter.emit('custom/initialized');
        });

        await client.sendRequest<InitializeResult>(
            'initialize',
            clientInitParams(rootUri),
        );

        await client.sendNotification('initialized', {});

        await waitForNotification('custom/initialized', emitter);

        await client.sendNotification('textDocument/didOpen', {
            textDocument: file.textDocument,
        });

        await wait(0.5);

        await client.sendNotification('textDocument/didChange', {
            textDocument: {
                uri: file.uri,
                version: 2,
            },
            contentChanges: [
                {
                    text: workText,
                },
            ],
        });

        await wait(0.5);
    });
    afterAll(async () => {
        await wait(2);
        server.dispose();
        client.dispose();
    });
    it('local module completion with import 1', async () => {
        const completion = await client.sendRequest<CompletionList>(
            'textDocument/completion',
            {
                textDocument: {
                    uri: `${file.uri}`,
                },
                position: {
                    line: 5,
                    character: 14,
                },
                context: {
                    triggerKind: 2,
                    triggerCharacter: '.',
                },
            },
        );

        const expected = [
            { label: 'new', detail: 'a.mo', insertText: 'new', kind: 3 },
        ];

        expect(completion.items).toEqual(expect.arrayContaining(expected));
    });

    it('local module completion with import 2', async () => {
        const completion = await client.sendRequest<CompletionList>(
            'textDocument/completion',
            {
                textDocument: {
                    uri: `${file.uri}`,
                },
                position: {
                    line: 6,
                    character: 14,
                },
                context: {
                    triggerKind: 2,
                    triggerCharacter: '.',
                },
            },
        );

        const expected = [
            { label: 'foo', detail: 'b.mo', insertText: 'foo', kind: 3 },
            { label: 'a', detail: 'b.mo', insertText: 'a', kind: 6 },
            { label: 'Age', detail: 'b.mo', insertText: 'Age', kind: 8 },
            { label: 'D', detail: 'b.mo', insertText: 'D', kind: 7 },
        ];

        expect(completion.items).toEqual(expect.arrayContaining(expected));
    });

    it('local module completion without import', async () => {
        const completion = await client.sendRequest<CompletionList>(
            'textDocument/completion',
            {
                textDocument: {
                    uri: `${file.uri}`,
                },
                position: {
                    line: 7,
                    character: 14,
                },
                context: {
                    triggerKind: 2,
                    triggerCharacter: '.',
                },
            },
        );

        const expected = [
            { label: 'Cell', detail: 'c.mo', insertText: 'Cell', kind: 8 },
            { label: 'State', detail: 'c.mo', insertText: 'State', kind: 8 },
            { label: 'new', detail: 'c.mo', insertText: 'new', kind: 3 },
        ];

        expect(completion.items).toEqual(expect.arrayContaining(expected));
    });

    it('Blob stdlib module completion with import', async () => {
        const completion = await client.sendRequest<CompletionList>(
            'textDocument/completion',
            {
                textDocument: {
                    uri: `${file.uri}`,
                },
                position: {
                    line: 8,
                    character: 14,
                },
                context: {
                    triggerKind: 2,
                    triggerCharacter: '.',
                },
            },
        );

        // NOTE: relying on concrete completion items is brittle
        // since they may change over time
        expect(completion.items.length).toBeGreaterThanOrEqual(1);
        expect(
            completion.items.every(
                (item: CompletionItem) => item.detail === 'mo:base/Blob.mo',
            ),
        ).toBe(true);
    });

    it('Array stdlib module completion without import', async () => {
        const completion = await client.sendRequest<CompletionList>(
            'textDocument/completion',
            {
                textDocument: {
                    uri: `${file.uri}`,
                },
                position: {
                    line: 9,
                    character: 14,
                },
                context: {
                    triggerKind: 2,
                    triggerCharacter: '.',
                },
            },
        );

        // NOTE: relying on concrete completion items is brittle
        // since they may change over time
        expect(completion.items.length).toBeGreaterThanOrEqual(1);
        expect(
            completion.items.every(
                (item: CompletionItem) => item.detail === 'mo:base/Array.mo',
            ),
        ).toBe(true);
    });
});
