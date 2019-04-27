'use strict';
import { commands, TextDocumentShowOptions, TextEditor, Uri } from 'vscode';
import { Container } from '../container';
import { GitCommit, GitUri } from '../git/gitService';
import { Logger } from '../logger';
import { Messages } from '../messages';
import { ActiveEditorCommand, command, CommandContext, Commands, getCommandUri } from './common';
import { DiffWithCommandArgs } from './diffWith';
import { UriComparer } from '../comparers';

export interface DiffWithPreviousCommandArgs {
    commit?: GitCommit;

    inDiffEditor?: boolean;
    line?: number;
    showOptions?: TextDocumentShowOptions;
}

@command()
export class DiffWithPreviousCommand extends ActiveEditorCommand {
    constructor() {
        super([Commands.DiffWithPrevious, Commands.DiffWithPreviousInDiff]);
    }

    protected preExecute(context: CommandContext, args: DiffWithPreviousCommandArgs = {}) {
        if (
            context.command === Commands.DiffWithPreviousInDiff
            // || (context.editor !== undefined && context.editor.viewColumn === undefined)
        ) {
            // HACK: If in a diff, try to determine if we are on the right or left side
            // If there is a context uri and it doesn't match the editor uri, assume we are on the left
            // If on the left, use the editor uri and pretend we aren't in a diff
            if (context.uri !== undefined && context.editor !== undefined && context.editor.document !== undefined) {
                if (!UriComparer.equals(context.uri, context.editor.document.uri, { exact: true })) {
                    return this.execute(context.editor, context.editor.document.uri, args);
                }
            }
            args.inDiffEditor = true;
        }

        return this.execute(context.editor, context.uri, args);
    }

    async execute(editor?: TextEditor, uri?: Uri, args: DiffWithPreviousCommandArgs = {}) {
        uri = getCommandUri(uri, editor);
        if (uri == null) return undefined;

        args = { ...args };
        if (args.line === undefined) {
            args.line = editor == null ? 0 : editor.selection.active.line;
        }

        const gitUri = args.commit !== undefined ? GitUri.fromCommit(args.commit) : await GitUri.fromUri(uri);
        try {
            const diffUris = await Container.git.getPreviousDiffUris(
                gitUri.repoPath!,
                gitUri,
                gitUri.sha,
                // If we are in a diff editor, assume we are on the right side, and need to skip back 1 more revisions
                args.inDiffEditor ? 1 : 0
            );

            if (diffUris === undefined || diffUris.previous === undefined) {
                return Messages.showCommitHasNoPreviousCommitWarningMessage();
            }

            const diffArgs: DiffWithCommandArgs = {
                repoPath: diffUris.current.repoPath,
                lhs: {
                    sha: diffUris.previous.sha || '',
                    uri: diffUris.previous.documentUri()
                },
                rhs: {
                    sha: diffUris.current.sha || '',
                    uri: diffUris.current.documentUri()
                },
                line: args.line,
                showOptions: args.showOptions
            };
            return commands.executeCommand(Commands.DiffWith, diffArgs);
        }
        catch (ex) {
            Logger.error(
                ex,
                'DiffWithPreviousCommand',
                `getPreviousDiffUris(${gitUri.repoPath}, ${gitUri.fsPath}, ${gitUri.sha})`
            );
            return Messages.showGenericErrorMessage('Unable to open compare');
        }
    }
}
