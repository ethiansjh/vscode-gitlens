'use strict';
import { Range } from 'vscode';
import { RemotesUrlsConfig } from '../../configuration';
import { Strings } from '../../system';
import { RemoteProvider } from './provider';

export class CustomRemote extends RemoteProvider {
    private readonly urls: RemotesUrlsConfig;

    constructor(domain: string, path: string, urls: RemotesUrlsConfig, protocol?: string, name?: string) {
        super(domain, path, protocol, name, true);
        this.urls = urls;
    }

    get name() {
        return this.formatName('Custom');
    }

    protected getUrlForRepository(): string {
        return Strings.interpolate(this.urls.repository, this.getContext());
    }

    protected getUrlForBranches(): string {
        return Strings.interpolate(this.urls.branches, this.getContext());
    }

    protected getUrlForBranch(branch: string): string {
        return Strings.interpolate(this.urls.branch, this.getContext({ branch: branch }));
    }

    protected getUrlForCommit(sha: string): string {
        return Strings.interpolate(this.urls.commit, this.getContext({ id: sha }));
    }

    protected getUrlForFile(fileName: string, branch?: string, sha?: string, range?: Range): string {
        let line;
        if (range) {
            if (range.start.line === range.end.line) {
                line = Strings.interpolate(this.urls.fileLine, { line: range.start.line });
            }
            else {
                line = Strings.interpolate(this.urls.fileRange, { start: range.start.line, end: range.end.line });
            }
        }
        else {
            line = '';
        }

        if (sha) {
            return Strings.interpolate(
                this.urls.fileInCommit,
                this.getContext({ id: sha, file: fileName, line: line })
            );
        }
        if (branch) {
            return Strings.interpolate(
                this.urls.fileInBranch,
                this.getContext({ branch: branch, file: fileName, line: line })
            );
        }
        return Strings.interpolate(this.urls.file, this.getContext({ file: fileName, line: line }));
    }

    private getContext(context?: {}) {
        const [repoBase, repoPath] = this.splitPath();
        return {
            repo: this.path,
            repoBase: repoBase,
            repoPath: repoPath,
            ...(context || {})
        };
    }
}
